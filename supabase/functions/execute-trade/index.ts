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

serve(async (req) => {
  const corsHeaders = resolveCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
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
      if (userError) {
        console.error('Primary auth check failed:', userError.message);
      }

      const serviceAuthClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      );
      const token = authHeader.replace('Bearer ', '');
      const { data: { user: verifiedUser }, error: verifiedUserError } = await serviceAuthClient.auth.getUser(token);

      if (verifiedUserError || !verifiedUser) {
        return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      userId = verifiedUser.id;
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    const authenticatedUser = { id: userId };
    
    const requestData = await req.json();
    console.log('Executing trade:', JSON.stringify(requestData));
    
    // Sanitize METAAPI_TOKEN - trim whitespace/newlines
    const METAAPI_TOKEN = normalizeMetaApiToken(Deno.env.get('METAAPI_TOKEN') || '');
    const MT5_BRIDGE_URL = Deno.env.get('MT5_BRIDGE_URL');
    const MT5_BRIDGE_API_KEY = Deno.env.get('MT5_BRIDGE_API_KEY');

    if (METAAPI_TOKEN) {
      console.log(`MetaApi token present, length: ${METAAPI_TOKEN.length}`);
      if (METAAPI_TOKEN.split('.').length < 3) {
        console.warn('METAAPI_TOKEN format appears invalid (expected JWT-like token).');
      }
    }
    
    // Prop-firm risk check before execution
    if (requestData.brokerAccountId) {
      const riskCheck = await checkPropFirmRisk(supabaseClient, authenticatedUser.id, requestData);
      if (!riskCheck.allowed) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: `Trade blocked by risk engine: ${riskCheck.reason}`,
          riskCheck 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }
    
    let executionResult: any;
    
    if (METAAPI_TOKEN && requestData.brokerAccountId) {
      const { data: creds } = await supabaseClient
        .from('broker_credentials')
        .select('*')
        .eq('id', requestData.brokerAccountId)
        .eq('user_id', authenticatedUser.id)
        .single();
      
      if (!creds) throw new Error('Broker account not found');

      try {
        executionResult = await executeViaMetaApi(METAAPI_TOKEN, creds, requestData);
      } catch (metaApiError) {
        const message = metaApiError instanceof Error ? metaApiError.message : String(metaApiError);
        console.error('MetaApi execution failed:', message);

        if ((message.includes('401') || message.toLowerCase().includes('auth')) && MT5_BRIDGE_URL) {
          console.warn('MetaApi auth failed. Falling back to MT5 bridge execution.');
          executionResult = await executeViaBridge(MT5_BRIDGE_URL, MT5_BRIDGE_API_KEY || '', requestData);
        } else {
          throw metaApiError;
        }
      }
    } else if (MT5_BRIDGE_URL) {
      executionResult = await executeViaBridge(MT5_BRIDGE_URL, MT5_BRIDGE_API_KEY || '', requestData);
    } else {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No trading bridge configured. Please add METAAPI_TOKEN or MT5_BRIDGE_URL secret.' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Record trade
    const tradeRecord = {
      user_id: authenticatedUser.id,
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
    };

    const { data: savedTrade, error: tradeError } = await supabaseClient
      .from('trades')
      .insert(tradeRecord)
      .select()
      .single();
    
    if (tradeError) console.error('Error recording trade:', tradeError);
    
    // Telegram notification
    await sendTelegramNotification({
      symbol: requestData.symbol,
      type: requestData.type,
      price: requestData.price,
      ticketNumber: executionResult.ticketNumber,
    });
    
    return new Response(
      JSON.stringify({
        success: true,
        ticketNumber: executionResult.ticketNumber,
        volume: executionResult.volume,
        tradeId: savedTrade?.id,
        message: 'Trade executed successfully via ' + (METAAPI_TOKEN ? 'MetaApi' : 'MT5 Bridge')
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error executing trade:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function decodeStoredPassword(password: string) {
  try {
    return atob(password);
  } catch {
    return password;
  }
}

function normalizeMetaApiToken(rawToken: string) {
  return rawToken
    .trim()
    .replace(/[\r\n]/g, '')
    .replace(/^Bearer\s+/i, '')
    .replace(/^"|"$/g, '');
}

const METAAPI_PROVISIONING_URL = 'https://mt-provisioning-api-v1.agiliumtrade.ai';
const METAAPI_REGIONS = ['new-york', 'london', 'singapore', ''];

async function executeViaMetaApi(token: string, creds: any, data: any) {
  const decodedPassword = decodeStoredPassword(creds.encrypted_password);
  const platform = String(creds.broker_type || 'mt5').toLowerCase() === 'mt4' ? 'mt4' : 'mt5';
  const provisioningProfileId = Deno.env.get('METAAPI_PROVISIONING_PROFILE_ID');

  // Step 1: List existing MetaApi provisioned accounts
  const listRes = await fetch(`${METAAPI_PROVISIONING_URL}/users/current/accounts`, {
    headers: { 'auth-token': token }
  });
  
  if (!listRes.ok) {
    const errBody = await listRes.text();
    console.error(`MetaApi list accounts failed [${listRes.status}]: ${errBody}`);
    if (listRes.status === 401) {
      throw new Error('MetaApi authentication failed (401). Check METAAPI_TOKEN in Supabase secrets (no Bearer prefix, no quotes/newlines).');
    }
    throw new Error(`MetaApi list accounts failed: ${listRes.status}`);
  }
  
  const accounts = await listRes.json();
  if (!Array.isArray(accounts)) {
    throw new Error('MetaApi returned unexpected account list format');
  }
  // Handle both id and _id field names from MetaApi
  let metaApiAccount = accounts.find((a: any) => 
    String(a.login) === String(creds.login) &&
    String(a.server || '').toLowerCase() === String(creds.server || '').toLowerCase() &&
    String(a.platform || '').toLowerCase() === platform
  );
  
  // Step 2: If no account found, provision one with cloud-g2
  if (!metaApiAccount) {
    console.log('Provisioning new MetaApi account for login:', creds.login);
    const provisionRes = await fetch(`${METAAPI_PROVISIONING_URL}/users/current/accounts`, {
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
      if (errText.toLowerCase().includes('provisioning profile') && !provisioningProfileId) {
        throw new Error(
          'MetaApi provisioning requires a profile for this broker server. Set METAAPI_PROVISIONING_PROFILE_ID in Supabase secrets and retry.'
        );
      }
      throw new Error(`MetaApi provision failed: ${provisionRes.status} ${errText}`);
    }
    
    metaApiAccount = await provisionRes.json();
    console.log('MetaApi account provisioned:', metaApiAccount.id || metaApiAccount._id);
  }

  // Normalize account ID (MetaApi uses both id and _id)
  const accountId = metaApiAccount.id || metaApiAccount._id;
  if (!accountId) {
    throw new Error('MetaApi account missing ID field');
  }
  
  // Step 3: Ensure account is deployed
  if (metaApiAccount.state !== 'DEPLOYED') {
    await fetch(`${METAAPI_PROVISIONING_URL}/users/current/accounts/${accountId}/deploy`, {
      method: 'POST',
      headers: { 'auth-token': token }
    });
    // Wait for deployment (max 60s)
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const checkRes = await fetch(`${METAAPI_PROVISIONING_URL}/users/current/accounts/${accountId}`, {
        headers: { 'auth-token': token }
      });
      const acc = await checkRes.json();
      if (acc.state === 'DEPLOYED' && acc.connectionStatus === 'CONNECTED') break;
    }
  }
  
  // Step 4: Execute trade - try region-specific URLs with fallback
  const symbol = data.symbol?.replace('/', '') || data.symbol;
  const tradePayload: any = {
    actionType: data.type === 'BUY' ? 'ORDER_TYPE_BUY' : 'ORDER_TYPE_SELL',
    symbol,
    volume: data.lotSize || 0.01,
  };
  if (data.stopLoss) tradePayload.stopLoss = data.stopLoss;
  if (data.takeProfit) tradePayload.takeProfit = data.takeProfit;

  let lastError = '';
  for (const region of METAAPI_REGIONS) {
    const host = region 
      ? `mt-client-api-v1.${region}.agiliumtrade.ai`
      : 'mt-client-api-v1.agiliumtrade.ai';
    const tradeUrl = `https://${host}/users/current/accounts/${accountId}/trade`;
    
    console.log(`Trying trade on region: ${region || 'default'} -> ${tradeUrl}`);
    
    try {
      const tradeRes = await fetch(tradeUrl, {
        method: 'POST',
        headers: { 'auth-token': token, 'Content-Type': 'application/json' },
        body: JSON.stringify(tradePayload)
      });
      
      if (tradeRes.ok) {
        const result = await tradeRes.json();
        console.log('Trade executed successfully:', JSON.stringify(result));
        return {
          ticketNumber: result.orderId || result.positionId || String(Date.now()),
          volume: data.lotSize || 0.01,
        };
      }
      
      lastError = await tradeRes.text();
      console.warn(`Trade failed on ${region || 'default'} [${tradeRes.status}]: ${lastError}`);
      
      // Don't retry on auth errors
      if (tradeRes.status === 401 || tradeRes.status === 403) {
        throw new Error(`MetaApi auth error: ${tradeRes.status} ${lastError}`);
      }
    } catch (e: any) {
      if (e.message.includes('MetaApi auth error')) throw e;
      lastError = e.message;
      console.warn(`Region ${region || 'default'} connection error:`, e.message);
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
  
  if (!response.ok) {
    throw new Error(`Bridge error: ${response.status} ${await response.text()}`);
  }
  
  const result = await response.json();
  return {
    ticketNumber: result.ticket || result.order_id || String(Date.now()),
    volume: data.lotSize || 0.01,
  };
}

async function checkPropFirmRisk(supabaseClient: any, userId: string, tradeData: any) {
  try {
    const { data: creds } = await supabaseClient
      .from('broker_credentials')
      .select('account_type')
      .eq('id', tradeData.brokerAccountId)
      .single();
    
    if (!creds || creds.account_type !== 'prop') {
      return { allowed: true };
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: todayTrades } = await supabaseClient
      .from('trades')
      .select('profit, lot_size, status')
      .eq('user_id', userId)
      .eq('broker_account_id', tradeData.brokerAccountId)
      .gte('created_at', todayStart.toISOString());

    const dailyPnL = (todayTrades || []).reduce((sum: number, t: any) => sum + (t.profit || 0), 0);
    const openPositions = (todayTrades || []).filter((t: any) => t.status === 'open').length;

    const MAX_DAILY_LOSS = -500;
    const MAX_OPEN_POSITIONS = 5;
    const MAX_LOT_SIZE = 0.5;

    if (dailyPnL <= MAX_DAILY_LOSS) {
      return { allowed: false, reason: `Daily loss limit reached: $${dailyPnL.toFixed(2)}. Max: $${MAX_DAILY_LOSS}` };
    }
    if (openPositions >= MAX_OPEN_POSITIONS) {
      return { allowed: false, reason: `Max open positions reached: ${openPositions}/${MAX_OPEN_POSITIONS}` };
    }
    if ((tradeData.lotSize || 0.01) > MAX_LOT_SIZE) {
      return { allowed: false, reason: `Lot size ${tradeData.lotSize} exceeds max ${MAX_LOT_SIZE}` };
    }

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
    
    const message = `
📊 TRADE EXECUTED ✅
${tradeInfo.type}: ${tradeInfo.symbol}
💰 Price: ${Number(tradeInfo.price).toFixed(5)}
🔢 Ticket: ${tradeInfo.ticketNumber}
🕒 Time: ${new Date().toISOString()}
    `.trim();
    
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message })
    });
  } catch (error) {
    console.error('Telegram notification error:', error);
  }
}
