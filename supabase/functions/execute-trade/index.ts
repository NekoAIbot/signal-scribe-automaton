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

  try {
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

    let userId = '';
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

    const requestData = await req.json();
    console.log('Executing trade:', JSON.stringify(requestData));

    const METAAPI_TOKEN = normalizeMetaApiToken(Deno.env.get('METAAPI_TOKEN') || '');
    const PAPER_MODE = (Deno.env.get('TRADING_PAPER_MODE') || '').toLowerCase() === 'true';
    const MT5_BRIDGE_URL = Deno.env.get('MT5_BRIDGE_URL');
    const MT5_BRIDGE_API_KEY = Deno.env.get('MT5_BRIDGE_API_KEY');

    if (METAAPI_TOKEN) {
      console.log(`MetaApi token present, length: ${METAAPI_TOKEN.length}`);
    }

    const mainBrokerAccount = await resolveMainBrokerAccount(serviceClient, userId, requestData.brokerAccountId);
    if (!mainBrokerAccount) {
      timeline.push('provisioning', 'failed', 'No active main broker account found');
      await persistFailedTimeline(serviceClient, userId, requestData, timeline.events, 'no_active_broker');
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
      return jsonResponse(
        { success: false, error: `Trade blocked by risk engine: ${riskCheck.reason}`, riskCheck, timeline: timeline.events },
        corsHeaders
      );
    }
    timeline.push('risk_check', 'success');

    let executionResult: { ticketNumber: string; volume: number; mode: string };

    if (METAAPI_TOKEN) {
      try {
        executionResult = await executeViaMetaApi(METAAPI_TOKEN, mainBrokerAccount, requestData, timeline);
      } catch (metaApiError) {
        const message = metaApiError instanceof Error ? metaApiError.message : String(metaApiError);
        console.error('MetaApi execution failed:', message);
        timeline.push('order', 'failed', message);

        if ((message.includes('401') || message.toLowerCase().includes('auth')) && MT5_BRIDGE_URL) {
          console.warn('MetaApi auth failed. Falling back to MT5 bridge execution.');
          timeline.push('order', 'started', 'Falling back to MT5 bridge');
          executionResult = await executeViaBridge(MT5_BRIDGE_URL, MT5_BRIDGE_API_KEY || '', requestData);
          timeline.push('order', 'success', `Bridge ticket ${executionResult.ticketNumber}`);
          timeline.push('filled', 'success');
        } else {
          await persistFailedTimeline(serviceClient, userId, requestData, timeline.events, 'metaapi_failed');
          throw metaApiError;
        }
      }
    } else if (PAPER_MODE && requestData.allowPaperMode === true) {
      timeline.push('order', 'started', 'Paper-mode (no broker call)');
      executionResult = {
        ticketNumber: `PAPER-${Date.now()}`,
        volume: requestData.lotSize || 0.01,
        mode: 'paper',
      };
      timeline.push('order', 'success', `Paper ticket ${executionResult.ticketNumber}`);
      timeline.push('filled', 'success');
    } else if (MT5_BRIDGE_URL) {
      timeline.push('order', 'started', 'Sending to MT5 bridge');
      executionResult = await executeViaBridge(MT5_BRIDGE_URL, MT5_BRIDGE_API_KEY || '', requestData);
      timeline.push('order', 'success', `Bridge ticket ${executionResult.ticketNumber}`);
      timeline.push('filled', 'success');
    } else {
      timeline.push('order', 'failed', 'No bridge configured');
      await persistFailedTimeline(serviceClient, userId, requestData, timeline.events, 'no_bridge');
      return jsonResponse({
        success: false,
        error: 'No trading bridge configured. Please add METAAPI_TOKEN or MT5_BRIDGE_URL secret.',
        timeline: timeline.events,
      }, corsHeaders);
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

    return jsonResponse({
      success: true,
      ticketNumber: executionResult.ticketNumber,
      volume: executionResult.volume,
      tradeId: savedTrade?.id,
      message: `Trade executed via ${executionResult.mode}`,
      timeline: timeline.events,
    }, corsHeaders);
  } catch (error) {
    console.error('Error executing trade:', error);
    timeline.push('failed', 'failed', (error as Error).message);
    return jsonResponse({ success: false, error: (error as Error).message, timeline: timeline.events }, corsHeaders);
  }
});

function jsonResponse(payload: unknown, corsHeaders: Record<string, string>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function persistFailedTimeline(
  client: ReturnType<typeof createClient>,
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
      broker_account_id: requestData.brokerAccountId || null,
      execution_timeline: events,
      last_execution_status: reason,
    });
  } catch (e) {
    console.error('Failed to persist failed-trade timeline:', e);
  }
}

function decodeStoredPassword(password: string) {
  try { return atob(password); } catch { return password; }
}

function normalizeMetaApiToken(rawToken: string) {
  return rawToken.trim().replace(/[\r\n]/g, '').replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '');
}

async function resolveMainBrokerAccount(client: ReturnType<typeof createClient>, userId: string, requestedAccountId?: string | null) {
  const selectColumns = 'id, user_id, account_name, login, encrypted_password, server, broker_type, account_type, is_active, created_at';

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

// MetaApi provisioning hosts. Bare "mt-provisioning-api-v1.agiliumtrade.ai" does NOT resolve via DNS.
const METAAPI_PROVISIONING_HOSTS = [
  'mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai',
  'mt-provisioning-api-v1.new-york.agiliumtrade.ai',
  'mt-provisioning-api-v1.london.agiliumtrade.ai',
  'mt-provisioning-api-v1.singapore.agiliumtrade.ai',
];
const METAAPI_REGIONS = ['new-york', 'london', 'singapore', ''];

async function metaApiFetch(path: string, init: RequestInit): Promise<Response> {
  let lastError: any = null;
  for (const host of METAAPI_PROVISIONING_HOSTS) {
    const url = `https://${host}${path}`;
    try {
      return await fetch(url, init);
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`MetaApi host ${host} failed: ${msg}`);
    }
  }
  throw lastError ?? new Error('All MetaApi provisioning hosts unreachable');
}

async function executeViaMetaApi(token: string, creds: any, data: any, timeline: Timeline) {
  const decodedPassword = decodeStoredPassword(creds.encrypted_password);
  const platform = String(creds.broker_type || 'mt5').toLowerCase() === 'mt4' ? 'mt4' : 'mt5';
  const provisioningProfileId = Deno.env.get('METAAPI_PROVISIONING_PROFILE_ID');

  timeline.push('provisioning', 'started', 'Listing MetaApi accounts');
  const listRes = await metaApiFetch(`/users/current/accounts`, { headers: { 'auth-token': token } });

  if (!listRes.ok) {
    const errBody = await listRes.text();
    console.error(`MetaApi list accounts failed [${listRes.status}]: ${errBody}`);
    timeline.push('provisioning', 'failed', `${listRes.status}: ${errBody.slice(0, 200)}`);
    if (listRes.status === 401) {
      throw new Error('MetaApi authentication failed (401). Check METAAPI_TOKEN in Supabase secrets (no Bearer prefix, no quotes/newlines).');
    }
    throw new Error(`MetaApi list accounts failed: ${listRes.status}`);
  }

  const accounts = await listRes.json();
  if (!Array.isArray(accounts)) throw new Error('MetaApi returned unexpected account list format');

  let metaApiAccount = accounts.find((a: any) =>
    String(a.login) === String(creds.login) &&
    String(a.server || '').toLowerCase() === String(creds.server || '').toLowerCase() &&
    String(a.platform || '').toLowerCase() === platform
  );

  if (!metaApiAccount) {
    timeline.push('provisioning', 'started', `Provisioning new account (login ${creds.login})`);
    const provisionRes = await metaApiFetch(`/users/current/accounts`, {
      method: 'POST',
      headers: { 'auth-token': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: creds.account_name || `Account ${creds.login}`,
        type: 'cloud-g2',
        login: String(creds.login),
        password: decodedPassword,
        server: creds.server,
        platform,
        application: 'MetaApi',
        magic: 234000,
      })
    });

    if (!provisionRes.ok) {
      const errText = await provisionRes.text();
      console.error(`MetaApi provision failed [${provisionRes.status}]: ${errText}`);
      timeline.push('provisioning', 'failed', `${provisionRes.status}: ${errText.slice(0, 200)}`);
      if (errText.toLowerCase().includes('provisioning profile') && !provisioningProfileId) {
        throw new Error('MetaApi provisioning requires a profile for this broker server. Set METAAPI_PROVISIONING_PROFILE_ID in Supabase secrets.');
      }
      throw new Error(`MetaApi provision failed: ${provisionRes.status} ${errText}`);
    }

    metaApiAccount = await provisionRes.json();
  }

  const accountId = metaApiAccount.id || metaApiAccount._id;
  if (!accountId) throw new Error('MetaApi account missing ID field');
  timeline.push('provisioning', 'success', `Account ${accountId}`);

  if (metaApiAccount.state !== 'DEPLOYED') {
    timeline.push('deploying', 'started');
    await metaApiFetch(`/users/current/accounts/${accountId}/deploy`, {
      method: 'POST', headers: { 'auth-token': token }
    });
    let deployedOk = false;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const checkRes = await metaApiFetch(`/users/current/accounts/${accountId}`, { headers: { 'auth-token': token } });
      const acc = await checkRes.json();
      if (acc.state === 'DEPLOYED' && acc.connectionStatus === 'CONNECTED') { deployedOk = true; break; }
    }
    timeline.push('deploying', deployedOk ? 'success' : 'failed', deployedOk ? 'Account deployed & connected' : 'Deployment timeout (60s)');
  } else {
    timeline.push('deploying', 'success', 'Already deployed');
  }

  const symbol = data.symbol?.replace('/', '') || data.symbol;
  const tradePayload: any = {
    actionType: data.type === 'BUY' ? 'ORDER_TYPE_BUY' : 'ORDER_TYPE_SELL',
    symbol,
    volume: data.lotSize || 0.01,
  };
  if (data.stopLoss) tradePayload.stopLoss = data.stopLoss;
  if (data.takeProfit) tradePayload.takeProfit = data.takeProfit;

  timeline.push('order', 'started', `Placing ${data.type} ${symbol}`);
  let lastError = '';
  for (const region of METAAPI_REGIONS) {
    const host = region ? `mt-client-api-v1.${region}.agiliumtrade.ai` : 'mt-client-api-v1.agiliumtrade.ai';
    const tradeUrl = `https://${host}/users/current/accounts/${accountId}/trade`;

    try {
      const tradeRes = await fetch(tradeUrl, {
        method: 'POST',
        headers: { 'auth-token': token, 'Content-Type': 'application/json' },
        body: JSON.stringify(tradePayload)
      });

      if (tradeRes.ok) {
        const result = await tradeRes.json();
        const ticket = result.orderId || result.positionId || String(Date.now());
        timeline.push('order', 'success', `Order placed via ${region || 'default'} (ticket ${ticket})`);
        timeline.push('filled', 'success');
        return { ticketNumber: ticket, volume: data.lotSize || 0.01, mode: 'metaapi' };
      }

      lastError = await tradeRes.text();
      console.warn(`Trade failed on ${region || 'default'} [${tradeRes.status}]: ${lastError}`);
      if (tradeRes.status === 401 || tradeRes.status === 403) {
        throw new Error(`MetaApi auth error: ${tradeRes.status} ${lastError}`);
      }
    } catch (e: any) {
      if (e.message?.includes('MetaApi auth error')) throw e;
      lastError = e.message;
    }
  }

  throw new Error(`MetaApi trade failed on all regions. Last error: ${lastError}`);
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
