import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsBaseHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function resolveCorsHeaders(req: Request) {
  const configuredOrigins = (Deno.env.get('ALLOWED_ORIGINS') || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

  const requestOrigin = req.headers.get('origin') || '';
  const allowOrigin = configuredOrigins.length === 0
    ? '*'
    : (configuredOrigins.includes(requestOrigin) ? requestOrigin : configuredOrigins[0]);

  return {
    ...corsBaseHeaders,
    'Access-Control-Allow-Origin': allowOrigin,
  };
}

// ---------- Timeline helpers ----------
type StageStatus = 'started' | 'success' | 'failed';
interface TimelineEvent {
  stage: string;       // requested | auth | risk_check | provisioning | deploying | order | filled | failed
  status: StageStatus;
  at: string;          // ISO timestamp
  message?: string;
  meta?: Record<string, unknown>;
}

class Timeline {
  events: TimelineEvent[] = [];
  push(stage: string, status: StageStatus, message?: string, meta?: Record<string, unknown>) {
    this.events.push({ stage, status, at: new Date().toISOString(), message, meta });
  }
  last(): TimelineEvent | undefined { return this.events[this.events.length - 1]; }
}

serve(async (req) => {
  const corsHeaders = resolveCorsHeaders(req);
  const timeline = new Timeline();
  timeline.push('requested', 'started', 'Trade request received');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Service-role client used for DB writes regardless of caller auth
  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
  let userId = '';
  let requestData: any = {};
  let retryOf: string | null = null;
  let mainBrokerAccount: any | null = null;

  try {
    const internalUserId = req.headers.get('x-internal-user-id');
    const internalSecret = req.headers.get('x-trading-bot-secret');

    if (internalUserId && internalSecret === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
      userId = internalUserId;
      timeline.push('auth', 'success', `Authenticated scheduled bot for ${userId.slice(0, 8)}…`);
    } else {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        timeline.push('auth', 'failed', 'Missing Authorization header');
        return jsonResponse({ success: false, error: 'Unauthorized', timeline: timeline.events }, corsHeaders);
      }

      const authClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user }, error: userError } = await authClient.auth.getUser();
      if (user?.id) {
        userId = user.id;
      } else {
        if (userError) console.error('Primary auth check failed:', userError.message);
        const token = authHeader.replace('Bearer ', '');
        const { data: { user: verifiedUser }, error: verifiedUserError } =
          await serviceClient.auth.getUser(token);
        if (verifiedUserError || !verifiedUser) {
          timeline.push('auth', 'failed', verifiedUserError?.message || 'Auth failed');
          return jsonResponse({ success: false, error: 'Unauthorized', timeline: timeline.events }, corsHeaders);
        }
        userId = verifiedUser.id;
      }
      timeline.push('auth', 'success', `Authenticated user ${userId.slice(0, 8)}…`);
    }

    requestData = await req.json();
    console.log('Executing trade:', JSON.stringify(requestData));
    retryOf = requestData.retryOf || null;
    const forceMain = requestData.forceMainBroker === true;
    if (forceMain) requestData.brokerAccountId = null;

    const PAPER_MODE = (Deno.env.get('TRADING_PAPER_MODE') || '').toLowerCase() === 'true';
    const MT5_BRIDGE_URL = Deno.env.get('MT5_BRIDGE_URL');
    const MT5_BRIDGE_API_KEY = Deno.env.get('MT5_BRIDGE_API_KEY');

    mainBrokerAccount = await resolveMainBrokerAccount(serviceClient, userId, requestData.brokerAccountId);
    if (!mainBrokerAccount) {
      timeline.push('provisioning', 'failed', 'No active main broker account found');
      await persistFailedTimeline(serviceClient, userId, requestData, timeline.events, 'no_active_broker');
      await writeAuditLog(serviceClient, {
        userId, requestData, timeline: timeline.events, success: false,
        status: 'no_active_broker', error: 'No active main broker account', retryOf, brokerAccount: null,
      });
      return jsonResponse({
        success: false,
        error: 'No active main broker account found. Add or activate a broker account before generating trades.',
        timeline: timeline.events,
      }, corsHeaders);
    }

    requestData.brokerAccountId = mainBrokerAccount.id;

    // Prop-firm risk check
    timeline.push('risk_check', 'started');
    const riskCheck = await checkPropFirmRisk(serviceClient, userId, requestData);
    if (!riskCheck.allowed) {
      timeline.push('risk_check', 'failed', riskCheck.reason);
      await persistFailedTimeline(serviceClient, userId, requestData, timeline.events, 'risk_blocked');
      await writeAuditLog(serviceClient, {
        userId, requestData, timeline: timeline.events, success: false,
        status: 'risk_blocked', error: riskCheck.reason || 'Risk blocked', retryOf, brokerAccount: mainBrokerAccount,
      });
      return jsonResponse(
        { success: false, error: `Trade blocked by risk engine: ${riskCheck.reason}`, riskCheck, timeline: timeline.events },
        corsHeaders
      );
    }
    timeline.push('risk_check', 'success');

    // Tier gate: only paid tiers can auto-execute
    const tierInfo = await loadTier(serviceClient, userId);
    timeline.push('tier_check', 'started', `Tier: ${tierInfo.tier}`);
    if (!tierInfo.auto_execute && !requestData.manualOverride) {
      timeline.push('tier_check', 'failed', `${tierInfo.tier} tier cannot auto-execute trades`);
      await persistFailedTimeline(serviceClient, userId, requestData, timeline.events, 'tier_blocked');
      await writeAuditLog(serviceClient, {
        userId, requestData, timeline: timeline.events, success: false,
        status: 'tier_blocked', error: `Tier ${tierInfo.tier} cannot auto-execute`, retryOf, brokerAccount: mainBrokerAccount,
      });
      return jsonResponse({
        success: false,
        error: `Your ${tierInfo.tier} plan does not support auto-execution. Upgrade to Starter or higher.`,
        timeline: timeline.events,
      }, corsHeaders);
    }
    const brokerType = String(mainBrokerAccount.broker_type || '').toLowerCase();
    if (tierInfo.allowed_brokers.length && !tierInfo.allowed_brokers.includes(brokerType)) {
      timeline.push('tier_check', 'failed', `Broker ${brokerType} not allowed on ${tierInfo.tier}`);
      return jsonResponse({
        success: false,
        error: `Broker "${brokerType}" requires an upgrade. Allowed on ${tierInfo.tier}: ${tierInfo.allowed_brokers.join(', ')}`,
        timeline: timeline.events,
      }, corsHeaders);
    }
    timeline.push('tier_check', 'success');

    let executionResult: { ticketNumber: string; volume: number; mode: string };

    // Route by broker_type: only direct-API brokers are supported.
    if (['deriv','binance','oanda','capital'].includes(brokerType)) {
      timeline.push('order', 'started', `Sending to ${brokerType.toUpperCase()} API`);
      executionResult = await executeViaBrokerApi(brokerType, mainBrokerAccount, requestData);
      timeline.push('order', 'success', `${brokerType} ticket ${executionResult.ticketNumber}`);
      timeline.push('filled', 'success');
    } else if (['mt4', 'mt5', 'metatrader'].includes(brokerType)) {
      const msg = 'MetaTrader execution has been disabled. Add a Deriv, Binance, OANDA, or Capital.com account in Settings → Brokers to continue trading.';
      timeline.push('order', 'failed', msg);
      await persistFailedTimeline(serviceClient, userId, requestData, timeline.events, 'metatrader_disabled');
      await writeAuditLog(serviceClient, {
        userId, requestData, timeline: timeline.events, success: false,
        status: 'metatrader_disabled', error: msg, retryOf, brokerAccount: mainBrokerAccount,
      });
      return jsonResponse({ success: false, error: msg, timeline: timeline.events }, corsHeaders);
    } else if (PAPER_MODE && requestData.allowPaperMode === true) {
      timeline.push('order', 'started', 'Paper-mode (no broker call)');
      executionResult = { ticketNumber: `PAPER-${Date.now()}`, volume: requestData.lotSize || 0.01, mode: 'paper' };
      timeline.push('order', 'success', `Paper ticket ${executionResult.ticketNumber}`);
      timeline.push('filled', 'success');
    } else if (MT5_BRIDGE_URL) {
      timeline.push('order', 'started', 'Sending to MT5 bridge');
      executionResult = await executeViaBridge(MT5_BRIDGE_URL, MT5_BRIDGE_API_KEY || '', requestData);
      timeline.push('order', 'success', `Bridge ticket ${executionResult.ticketNumber}`);
      timeline.push('filled', 'success');
    } else {
      const msg = `Broker type "${brokerType}" is not supported. Add a Deriv, Binance, OANDA, or Capital.com account in Settings → Brokers.`;
      timeline.push('order', 'failed', msg);
      await persistFailedTimeline(serviceClient, userId, requestData, timeline.events, 'unsupported_broker');
      await writeAuditLog(serviceClient, {
        userId, requestData, timeline: timeline.events, success: false,
        status: 'unsupported_broker', error: msg, retryOf, brokerAccount: mainBrokerAccount,
      });
      return jsonResponse({ success: false, error: msg, timeline: timeline.events }, corsHeaders);
    }

    // Record trade with full timeline
    const tradeRecord = {
      user_id: userId,
      symbol: requestData.symbol,
      trade_type: requestData.type,
      entry_price: requestData.price,
      current_price: requestData.price,
      lot_size: requestData.lotSize || 0.01,
      stop_loss: requestData.stopLoss || null,
      take_profit: requestData.takeProfit || null,
      status: 'open',
      ticket_number: executionResult.ticketNumber,
      strategy_id: requestData.strategyId || null,
      model_id: requestData.modelId || null,
      model_version: requestData.modelVersion || null,
      broker_account_id: requestData.brokerAccountId || null,
      execution_timeline: timeline.events,
      last_execution_status: 'filled',
    };

    const { data: savedTrade, error: tradeError } = await serviceClient
      .from('trades')
      .insert(tradeRecord)
      .select()
      .single();

    if (tradeError) console.error('Error recording trade:', tradeError);

    await sendTelegramNotification({
      symbol: requestData.symbol,
      type: requestData.type,
      price: requestData.price,
      ticketNumber: executionResult.ticketNumber,
    });

    await writeAuditLog(serviceClient, {
      userId, requestData, timeline: timeline.events, success: true,
      status: 'filled', error: null, retryOf, brokerAccount: mainBrokerAccount, tradeId: savedTrade?.id,
    });

    return jsonResponse({
      success: true,
      ticketNumber: executionResult.ticketNumber,
      volume: executionResult.volume,
      tradeId: savedTrade?.id,
      brokerAccount: { id: mainBrokerAccount.id, name: mainBrokerAccount.account_name, type: mainBrokerAccount.account_type },
      message: `Trade executed via ${executionResult.mode}`,
      timeline: timeline.events,
    }, corsHeaders);
  } catch (error) {
    console.error('Error executing trade:', error);
    timeline.push('failed', 'failed', (error as Error).message);
    if (userId) {
      await writeAuditLog(serviceClient, {
        userId,
        requestData,
        timeline: timeline.events,
        success: false,
        status: 'execution_failed',
        error: (error as Error).message,
        retryOf,
        brokerAccount: mainBrokerAccount,
      });
    }
    return jsonResponse({ success: false, error: (error as Error).message, timeline: timeline.events }, corsHeaders);
  }
});

async function writeAuditLog(client: any, args: {
  userId: string;
  requestData: any;
  timeline: TimelineEvent[];
  success: boolean;
  status: string;
  error: string | null;
  retryOf?: string | null;
  brokerAccount: any | null;
  tradeId?: string | null;
}) {
  try {
    await client.from('execution_audit_log').insert({
      user_id: args.userId,
      broker_account_id: args.brokerAccount?.id || args.requestData?.brokerAccountId || null,
      broker_account_name: args.brokerAccount?.account_name || null,
      broker_account_type: args.brokerAccount?.account_type || null,
      symbol: args.requestData?.symbol || null,
      trade_type: args.requestData?.type || null,
      lot_size: args.requestData?.lotSize ?? null,
      entry_price: args.requestData?.price ?? null,
      stop_loss: args.requestData?.stopLoss ?? null,
      take_profit: args.requestData?.takeProfit ?? null,
      strategy_id: args.requestData?.strategyId || null,
      model_id: args.requestData?.modelId || null,
      model_version: args.requestData?.modelVersion || null,
      trade_id: args.tradeId || null,
      retry_of: args.retryOf || null,
      success: args.success,
      status: args.status,
      error_message: args.error,
      execution_timeline: args.timeline,
      request_params: args.requestData || {},
    });
  } catch (e) {
    console.error('writeAuditLog failed:', e);
  }
}

function jsonResponse(payload: unknown, corsHeaders: Record<string, string>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function persistFailedTimeline(
  client: any,
  userId: string,
  requestData: any,
  events: TimelineEvent[],
  reason: string,
) {
  try {
    await client.from('trades').insert({
      user_id: userId,
      symbol: requestData.symbol,
      trade_type: requestData.type,
      entry_price: requestData.price,
      current_price: requestData.price,
      lot_size: requestData.lotSize || 0.01,
      stop_loss: requestData.stopLoss || null,
      take_profit: requestData.takeProfit || null,
      status: 'cancelled',
      strategy_id: requestData.strategyId || null,
      model_id: requestData.modelId || null,
      model_version: requestData.modelVersion || null,
      broker_account_id: requestData.brokerAccountId || null,
      execution_timeline: events,
      last_execution_status: reason,
    });
  } catch (e) {
    console.error('Failed to persist failed-trade timeline:', e);
  }
}

function decodeStoredPassword(password: string) {
  return decodeSecretCandidates(password)[0] || '';
}

// Binance secrets are 64-char alphanumeric which are valid base64 chars,
// so atob() never throws even on raw plaintext secrets — it just yields garbage.
// Return both candidates so callers can retry with the raw value on signature errors.
function decodeSecretCandidates(stored: string): string[] {
  return credentialCandidates(stored);
}

function credentialCandidates(stored: unknown): string[] {
  const raw = String(stored || '').trim();
  if (!raw) return [];
  const out: string[] = [];
  const push = (value: unknown) => {
    const cleaned = cleanCredentialValue(value);
    if (cleaned && !out.includes(cleaned)) out.push(cleaned);
  };

  push(raw);

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'string') push(parsed);
    else if (parsed && typeof parsed === 'object') {
      for (const key of ['token', 'api_token', 'apiToken', 'api_key', 'apiKey', 'secret', 'password', 'value']) {
        if (typeof parsed[key] === 'string') push(parsed[key]);
      }
    }
  } catch (_) { /* not JSON */ }

  try {
    const decoded = atob(raw);
    if (decoded && /^[\x09\x0A\x0D\x20-\x7E]+$/.test(decoded)) {
      push(decoded);
      try {
        const parsedDecoded = JSON.parse(decoded);
        if (typeof parsedDecoded === 'string') push(parsedDecoded);
        else if (parsedDecoded && typeof parsedDecoded === 'object') {
          for (const key of ['token', 'api_token', 'apiToken', 'api_key', 'apiKey', 'secret', 'password', 'value']) {
            if (typeof parsedDecoded[key] === 'string') push(parsedDecoded[key]);
          }
        }
      } catch (_) { /* decoded value is not JSON */ }
    }
  } catch (_) { /* not base64 */ }

  return out;
}

function cleanCredentialValue(value: unknown): string {
  let cleaned = String(value || '').trim();
  if (!cleaned) return '';
  cleaned = cleaned.replace(/^['"`]+|['"`]+$/g, '').trim();
  cleaned = cleaned.replace(/^Bearer\s+/i, '').trim();
  cleaned = cleaned.replace(/^(token|api[_ -]?token|api[_ -]?key|secret|password)\s*[:=]\s*/i, '').trim();
  cleaned = cleaned.replace(/^['"`]+|['"`]+$/g, '').trim();
  return cleaned;
}


async function resolveMainBrokerAccount(client: any, userId: string, requestedAccountId?: string | null) {
  const selectColumns = 'id, user_id, account_name, login, encrypted_password, api_token, api_secret, account_id, environment, server, broker_type, account_type, is_active, created_at, metadata';

  if (requestedAccountId) {
    const { data: requestedAccount } = await client
      .from('broker_credentials')
      .select(selectColumns)
      .eq('id', requestedAccountId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (requestedAccount) return requestedAccount;
  }

  const { data: activeAccounts, error } = await client
    .from('broker_credentials')
    .select(selectColumns)
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to resolve main broker account:', error.message);
    return null;
  }

  const priority = (account: any) => {
    const type = String(account.account_type || '').toLowerCase();
    if (type === 'live') return 0;
    if (type === 'prop') return 1;
    return 2;
  };

  return (activeAccounts || [])
    .map((account: any, index: number) => ({ account, index }))
    .sort((a: any, b: any) => priority(a.account) - priority(b.account) || a.index - b.index)[0]
    ?.account || null;
}


async function executeViaBridge(bridgeUrl: string, apiKey: string, data: any) {
  const response = await fetch(`${bridgeUrl}/trade`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
    body: JSON.stringify({
      symbol: data.symbol,
      type: data.type,
      volume: data.lotSize || 0.01,
      price: data.price,
      sl: data.stopLoss,
      tp: data.takeProfit
    })
  });

  if (!response.ok) throw new Error(`Bridge error: ${response.status} ${await response.text()}`);

  const result = await response.json();
  return {
    ticketNumber: result.ticket || result.order_id || String(Date.now()),
    volume: data.lotSize || 0.01,
    mode: 'bridge',
  };
}

async function checkPropFirmRisk(supabaseClient: any, userId: string, tradeData: any) {
  try {
    const { data: creds } = await supabaseClient
      .from('broker_credentials').select('account_type')
      .eq('id', tradeData.brokerAccountId).single();

    if (!creds || creds.account_type !== 'prop') return { allowed: true };

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const { data: todayTrades } = await supabaseClient
      .from('trades').select('profit, lot_size, status')
      .eq('user_id', userId).eq('broker_account_id', tradeData.brokerAccountId)
      .gte('created_at', todayStart.toISOString());

    const dailyPnL = (todayTrades || []).reduce((s: number, t: any) => s + (t.profit || 0), 0);
    const openPositions = (todayTrades || []).filter((t: any) => t.status === 'open').length;

    if (dailyPnL <= -500) return { allowed: false, reason: `Daily loss limit reached: $${dailyPnL.toFixed(2)}` };
    if (openPositions >= 5) return { allowed: false, reason: `Max open positions reached: ${openPositions}/5` };
    if ((tradeData.lotSize || 0.01) > 0.5) return { allowed: false, reason: `Lot size ${tradeData.lotSize} exceeds max 0.5` };

    return { allowed: true, dailyPnL, openPositions };
  } catch (e) {
    console.error('Risk check error:', e);
    return { allowed: true };
  }
}

async function sendTelegramNotification(tradeInfo: any) {
  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;

    const message = `📊 TRADE EXECUTED ✅\n${tradeInfo.type}: ${tradeInfo.symbol}\n💰 Price: ${Number(tradeInfo.price).toFixed(5)}\n🔢 Ticket: ${tradeInfo.ticketNumber}\n🕒 Time: ${new Date().toISOString()}`;

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message })
    });
  } catch (error) {
    console.error('Telegram notification error:', error);
  }
}

// ---------- Tier loader ----------
async function loadTier(client: any, userId: string) {
  try {
    const { data: tierId } = await client.rpc('get_user_tier', { _user_id: userId });
    const tier = String(tierId || 'free');
    const { data: plan } = await client.from('subscription_plans').select('id, auto_execute, allowed_brokers, max_signals_per_day').eq('id', tier).maybeSingle();
    return {
      tier,
      auto_execute: plan?.auto_execute ?? (tier !== 'free'),
      allowed_brokers: (plan?.allowed_brokers as string[]) || [],
      max_signals_per_day: plan?.max_signals_per_day ?? 5,
    };
  } catch (e) {
    console.error('loadTier error:', e);
    return { tier: 'free', auto_execute: false, allowed_brokers: ['deriv'], max_signals_per_day: 5 };
  }
}

// ---------- Broker adapters (free, cloud-native) ----------
async function executeViaBrokerApi(brokerType: string, creds: any, data: any): Promise<{ ticketNumber: string; volume: number; mode: string }> {
  switch (brokerType) {
    case 'binance': return executeBinance(creds, data);
    case 'deriv':   return executeDeriv(creds, data);
    case 'oanda':   return executeOanda(creds, data);
    case 'capital': return executeCapital(creds, data);
    default: throw new Error(`Unsupported broker: ${brokerType}`);
  }
}

function toBinanceSymbol(raw: string): string {
  const s = String(raw || '').replace(/[\/\-_]/g, '').toUpperCase();
  // Common non-crypto symbols not tradable on Binance spot
  const forexOrMetal = /^(EUR|GBP|AUD|NZD|CAD|CHF|JPY|XAU|XAG|USOIL|WTI|BRENT|US30|US500|NAS100|SPX|NDX|DJI)/.test(s);
  if (forexOrMetal && !s.startsWith('BTC') && !s.startsWith('ETH')) {
    throw new Error(`Symbol ${raw} is not tradable on Binance Spot. Use a crypto pair like BTCUSDT.`);
  }
  // Already a valid Binance quote suffix
  if (/(USDT|BUSD|USDC|BTC|ETH|BNB|FDUSD|TUSD|DAI)$/.test(s)) return s;
  // Convert *USD → *USDT (only when USD is the quote, i.e. suffix)
  if (s.endsWith('USD')) return s.slice(0, -3) + 'USDT';
  return s;
}

async function executeBinance(creds: any, data: any) {
  const apiKeyCandidates = credentialCandidates(creds.api_token);
  const secretCandidates = decodeSecretCandidates(creds.api_secret || creds.encrypted_password || '');
  if (apiKeyCandidates.length === 0 || secretCandidates.length === 0) throw new Error('Binance requires api_token (API key) and api_secret');
  const base = (creds.environment === 'live') ? 'https://api.binance.com' : 'https://testnet.binance.vision';
  const environmentLabel = creds.environment === 'live' ? 'Binance.com Live' : 'Binance Spot Testnet';
  const symbol = toBinanceSymbol(data.symbol);
  const side = data.type === 'BUY' ? 'BUY' : 'SELL';
  const qty = data.lotSize || 0.001;

  let lastBody = '';
  let lastStatus = 0;
  for (const apiKey of apiKeyCandidates) {
    for (const apiSecret of secretCandidates) {
      const timestamp = Date.now();
      const query = `symbol=${symbol}&side=${side}&type=MARKET&quantity=${qty}&timestamp=${timestamp}`;
      const sig = await hmacSha256(apiSecret, query);
      const res = await fetch(`${base}/api/v3/order?${query}&signature=${sig}`, {
        method: 'POST', headers: { 'X-MBX-APIKEY': apiKey }
      });
      if (res.ok) {
        const j = await res.json();
        return { ticketNumber: String(j.orderId), volume: qty, mode: 'binance' };
      }
      lastBody = await res.text();
      lastStatus = res.status;
      // Only retry on signature/key errors
      if (!/-1022|-2014|-2015|signature|invalid api/i.test(lastBody)) break;
    }
  }
  const hint = lastBody.includes('-2015') && creds.environment !== 'live'
    ? ' This looks like a Binance.com live API key saved as Demo/Testnet. Set this broker account environment to Live, or create a separate Spot Testnet key at testnet.binance.vision.'
    : '';
  throw new Error(`Binance error ${lastStatus} on ${environmentLabel}: ${lastBody}${hint}`);
}

async function executeDeriv(creds: any, data: any) {
  const tokenCandidates = credentialCandidates(creds.api_token);
  if (tokenCandidates.length === 0) throw new Error('Deriv requires api_token');
  let lastError: Error | null = null;
  for (const token of tokenCandidates) {
    try {
      return token.startsWith('pat_')
        ? await executeDerivWithPatToken(token, creds, data)
        : await executeDerivWithLegacyToken(token, creds, data);
    } catch (error) {
      lastError = error as Error;
      if (!/invalidtoken|token is invalid|invalid token|authorization/i.test(lastError.message)) break;
    }
  }
  throw lastError || new Error('Deriv token rejected');
}

function resolveDerivAppId(creds: any, token: string) {
  const metadataAppId = cleanCredentialValue(creds.metadata?.deriv_app_id || creds.metadata?.app_id || '');
  const patAppId = cleanCredentialValue(Deno.env.get('DERIV_PAT_APP_ID') || '');
  const legacyAppId = cleanCredentialValue(Deno.env.get('DERIV_APP_ID') || '');
  if (metadataAppId) return metadataAppId;
  if (token.startsWith('pat_') && patAppId) return patAppId;
  if (legacyAppId) return legacyAppId;
  return token.startsWith('pat_') ? '' : '1089';
}

async function executeDerivWithLegacyToken(token: string, creds: any, data: any) {
  const appId = resolveDerivAppId(creds, token);
  return await new Promise<{ ticketNumber: string; volume: number; mode: string }>((resolve, reject) => {
    const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${appId}`);
    const timeout = setTimeout(() => { try { ws.close(); } catch {} reject(new Error('Deriv timeout')); }, 15000);
    const symbol = (data.symbol || '').replace('/', '');
    const amount = Math.max(0.35, (data.lotSize || 1));
    ws.onopen = () => ws.send(JSON.stringify({ authorize: token }));
    ws.onmessage = (ev: MessageEvent) => {
      const msg = JSON.parse(ev.data as string);
      if (msg.error) { clearTimeout(timeout); ws.close(); return reject(new Error(`Deriv: ${msg.error.message}`)); }
      if (msg.msg_type === 'authorize') {
        ws.send(JSON.stringify({
          buy: 1, price: amount,
          parameters: { amount, basis: 'stake', contract_type: data.type === 'BUY' ? 'CALL' : 'PUT', currency: msg.authorize.currency || 'USD', duration: 5, duration_unit: 'm', symbol }
        }));
      } else if (msg.msg_type === 'buy') {
        clearTimeout(timeout); ws.close();
        resolve({ ticketNumber: String(msg.buy.contract_id), volume: amount, mode: 'deriv' });
      }
    };
    ws.onerror = (e) => { clearTimeout(timeout); reject(new Error(`Deriv WS error: ${String(e)}`)); };
  });
}

async function executeDerivWithPatToken(token: string, creds: any, data: any) {
  const appId = resolveDerivAppId(creds, token);
  if (!appId) throw new Error('Deriv PAT execution requires the matching Deriv App ID. Edit the broker account and add the App ID from the same PAT application.');

  const accountId = cleanCredentialValue(creds.account_id || creds.login || '');
  const resolvedAccountId = accountId || await resolveDerivPatAccountId(token, appId, creds);
  if (!resolvedAccountId) throw new Error('Deriv PAT is authorized, but no Deriv options trading account was found.');

  const otpResponse = await fetch(`https://api.derivws.com/trading/v1/options/accounts/${encodeURIComponent(resolvedAccountId)}/otp`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Deriv-App-ID': appId },
  });
  const otpRaw = await otpResponse.text();
  const otpBody = parseJson(otpRaw);
  if (!otpResponse.ok || !otpBody?.data?.url) {
    throw new Error(`Deriv PAT OTP failed: ${formatDerivRestError(otpResponse.status, otpRaw, otpBody)}`);
  }

  return await buyDerivPatContract(otpBody.data.url, data);
}

async function resolveDerivPatAccountId(token: string, appId: string, creds: any) {
  const response = await fetch('https://api.derivws.com/trading/v1/options/accounts', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}`, 'Deriv-App-ID': appId },
  });
  const raw = await response.text();
  const body = parseJson(raw);
  if (!response.ok) throw new Error(`Deriv PAT account lookup failed: ${formatDerivRestError(response.status, raw, body)}`);

  const accounts = Array.isArray(body?.data) ? body.data : [];
  const env = String(creds.environment || creds.account_type || 'demo').toLowerCase();
  const account = accounts.find((a: any) => String(a.account_type || '').toLowerCase() === env && a.status === 'active') ||
    accounts.find((a: any) => a.status === 'active') ||
    accounts[0];
  return account?.account_id || '';
}

async function buyDerivPatContract(wsUrl: string, data: any) {
  return await new Promise<{ ticketNumber: string; volume: number; mode: string }>((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const amount = Math.max(0.35, data.lotSize || 1);
    const symbol = toDerivSymbol(data.symbol);
    const timeout = setTimeout(() => { try { ws.close(); } catch {} reject(new Error('Deriv PAT WebSocket timeout')); }, 15000);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        proposal: 1,
        amount,
        basis: 'stake',
        contract_type: data.type === 'BUY' ? 'CALL' : 'PUT',
        currency: 'USD',
        duration: 5,
        duration_unit: 'm',
        underlying_symbol: symbol,
        req_id: 1,
      }));
    };
    ws.onmessage = (ev: MessageEvent) => {
      const msg = JSON.parse(ev.data as string);
      if (msg.error) { clearTimeout(timeout); try { ws.close(); } catch {} return reject(new Error(`Deriv PAT: ${msg.error.message}`)); }
      if (msg.msg_type === 'proposal' && msg.proposal?.id) {
        ws.send(JSON.stringify({ buy: msg.proposal.id, price: amount, req_id: 2 }));
      } else if (msg.msg_type === 'buy') {
        clearTimeout(timeout); try { ws.close(); } catch {}
        resolve({ ticketNumber: String(msg.buy?.contract_id || msg.buy?.transaction_id || Date.now()), volume: amount, mode: 'deriv-pat' });
      }
    };
    ws.onerror = () => { clearTimeout(timeout); reject(new Error('Deriv PAT WebSocket error')); };
  });
}

function toDerivSymbol(raw: string) {
  const s = String(raw || '').replace(/[\s\-_]/g, '').toUpperCase();
  if (s.includes('/')) {
    const compact = s.replace('/', '');
    if (/^[A-Z]{6}$/.test(compact)) return `frx${compact}`;
    return compact;
  }
  if (/^[A-Z]{6}$/.test(s) && /USD|EUR|GBP|JPY|AUD|NZD|CAD|CHF/.test(s)) return `frx${s}`;
  return s;
}

function parseJson(raw: string) {
  try { return raw ? JSON.parse(raw) : {}; }
  catch { return {}; }
}

function formatDerivRestError(status: number, raw: string, body: any) {
  const firstError = Array.isArray(body?.errors) ? body.errors[0] : null;
  return String(firstError?.message || raw || `HTTP ${status}`).trim();
}

async function executeOanda(creds: any, data: any) {
  const token = credentialCandidates(creds.api_token)[0];
  const accountId = creds.account_id || creds.login;
  if (!token || !accountId) throw new Error('OANDA requires api_token and account_id');
  const base = (creds.environment === 'live') ? 'https://api-fxtrade.oanda.com' : 'https://api-fxpractice.oanda.com';
  const instrument = data.symbol.replace('/', '_').toUpperCase();
  const units = (data.type === 'BUY' ? 1 : -1) * Math.round((data.lotSize || 0.01) * 100000);
  const body: any = { order: { units: String(units), instrument, type: 'MARKET', timeInForce: 'FOK', positionFill: 'DEFAULT' } };
  if (data.stopLoss) body.order.stopLossOnFill = { price: String(data.stopLoss) };
  if (data.takeProfit) body.order.takeProfitOnFill = { price: String(data.takeProfit) };
  const res = await fetch(`${base}/v3/accounts/${accountId}/orders`, {
    method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`OANDA error ${res.status}: ${await res.text()}`);
  const j = await res.json();
  const ticket = j.orderFillTransaction?.id || j.orderCreateTransaction?.id;
  return { ticketNumber: String(ticket), volume: Math.abs(units) / 100000, mode: 'oanda' };
}

async function executeCapital(creds: any, data: any) {
  const apiKey = credentialCandidates(creds.api_token)[0];
  const identifier = creds.account_id || creds.login;
  const password = decodeStoredPassword(creds.encrypted_password || creds.api_secret || '');
  if (!apiKey || !identifier || !password) throw new Error('Capital.com requires api_token, account_id, and password');
  const base = (creds.environment === 'live') ? 'https://api-capital.backend-capital.com' : 'https://demo-api-capital.backend-capital.com';
  const sess = await fetch(`${base}/api/v1/session`, {
    method: 'POST', headers: { 'X-CAP-API-KEY': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password })
  });
  if (!sess.ok) throw new Error(`Capital.com auth ${sess.status}: ${await sess.text()}`);
  const cst = sess.headers.get('CST') || '';
  const xsec = sess.headers.get('X-SECURITY-TOKEN') || '';
  const epic = data.symbol.replace('/', '').toUpperCase();
  const body: any = { epic, direction: data.type, size: data.lotSize || 0.01, orderType: 'MARKET' };
  if (data.stopLoss) body.stopLevel = data.stopLoss;
  if (data.takeProfit) body.profitLevel = data.takeProfit;
  const res = await fetch(`${base}/api/v1/positions`, {
    method: 'POST',
    headers: { 'X-CAP-API-KEY': apiKey, 'CST': cst, 'X-SECURITY-TOKEN': xsec, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Capital.com order ${res.status}: ${await res.text()}`);
  const j = await res.json();
  return { ticketNumber: String(j.dealReference || Date.now()), volume: data.lotSize || 0.01, mode: 'capital' };
}

async function hmacSha256(secret: string, payload: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}
