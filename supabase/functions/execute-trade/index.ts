import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const requestData = await req.json();
    console.log('Executing trade:', JSON.stringify(requestData));
    
    const METAAPI_TOKEN = Deno.env.get('METAAPI_TOKEN');
    const MT5_BRIDGE_URL = Deno.env.get('MT5_BRIDGE_URL');
    const MT5_BRIDGE_API_KEY = Deno.env.get('MT5_BRIDGE_API_KEY');
    
    // Prop-firm risk check before execution
    if (requestData.brokerAccountId) {
      const riskCheck = await checkPropFirmRisk(supabaseClient, user.id, requestData);
      if (!riskCheck.allowed) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: `Trade blocked by risk engine: ${riskCheck.reason}`,
          riskCheck 
        }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }
    
    let executionResult: any;
    
    if (METAAPI_TOKEN && requestData.brokerAccountId) {
      // MetaApi execution - provision or retrieve account
      const { data: creds } = await supabaseClient
        .from('broker_credentials')
        .select('*')
        .eq('id', requestData.brokerAccountId)
        .single();
      
      if (!creds) throw new Error('Broker account not found');
      
      executionResult = await executeViaMetaApi(METAAPI_TOKEN, creds, requestData);
    } else if (MT5_BRIDGE_URL) {
      executionResult = await executeViaBridge(MT5_BRIDGE_URL, MT5_BRIDGE_API_KEY || '', requestData);
    } else {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No trading bridge configured. Please add METAAPI_TOKEN or MT5_BRIDGE_URL secret.' 
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Record trade
    const tradeRecord = {
      user_id: user.id,
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
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function executeViaMetaApi(token: string, creds: any, data: any) {
  // Step 1: List existing MetaApi provisioned accounts to find a matching one
  const listRes = await fetch('https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts', {
    headers: { 'auth-token': token }
  });
  
  if (!listRes.ok) {
    throw new Error(`MetaApi list accounts failed: ${listRes.status} ${await listRes.text()}`);
  }
  
  const accounts = await listRes.json();
  let metaApiAccount = accounts.find((a: any) => 
    a.login === creds.login && a.server === creds.server
  );
  
  // Step 2: If no account found, provision one
  if (!metaApiAccount) {
    console.log('Provisioning new MetaApi account for login:', creds.login);
    const provisionRes = await fetch('https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts', {
      method: 'POST',
      headers: { 'auth-token': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: creds.account_name || `Account ${creds.login}`,
        type: 'cloud',
        login: creds.login,
        password: creds.encrypted_password,
        server: creds.server,
        platform: 'mt5',
        application: 'MetaApi',
        magic: 0,
      })
    });
    
    if (!provisionRes.ok) {
      const errText = await provisionRes.text();
      throw new Error(`MetaApi provision failed: ${provisionRes.status} ${errText}`);
    }
    
    metaApiAccount = await provisionRes.json();
    console.log('MetaApi account provisioned:', metaApiAccount.id);
  }
  
  // Step 3: Ensure account is deployed
  if (metaApiAccount.state !== 'DEPLOYED') {
    await fetch(`https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts/${metaApiAccount.id}/deploy`, {
      method: 'POST',
      headers: { 'auth-token': token }
    });
    // Wait for deployment
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const checkRes = await fetch(`https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts/${metaApiAccount.id}`, {
        headers: { 'auth-token': token }
      });
      const acc = await checkRes.json();
      if (acc.state === 'DEPLOYED' && acc.connectionStatus === 'CONNECTED') break;
    }
  }
  
  // Step 4: Execute trade
  const symbol = data.symbol?.replace('/', '') || data.symbol;
  const tradePayload: any = {
    actionType: data.type === 'BUY' ? 'ORDER_TYPE_BUY' : 'ORDER_TYPE_SELL',
    symbol,
    volume: data.lotSize || 0.01,
  };
  if (data.stopLoss) tradePayload.stopLoss = data.stopLoss;
  if (data.takeProfit) tradePayload.takeProfit = data.takeProfit;
  
  const tradeRes = await fetch(
    `https://mt-client-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts/${metaApiAccount.id}/trade`,
    {
      method: 'POST',
      headers: { 'auth-token': token, 'Content-Type': 'application/json' },
      body: JSON.stringify(tradePayload)
    }
  );
  
  if (!tradeRes.ok) {
    const errText = await tradeRes.text();
    throw new Error(`MetaApi trade error: ${tradeRes.status} ${errText}`);
  }
  
  const result = await tradeRes.json();
  return {
    ticketNumber: result.orderId || result.positionId || String(Date.now()),
    volume: data.lotSize || 0.01,
  };
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

    // Get today's trades for this account
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: todayTrades } = await supabaseClient
      .from('trades')
      .select('profit, lot_size')
      .eq('user_id', userId)
      .eq('broker_account_id', tradeData.brokerAccountId)
      .gte('created_at', todayStart.toISOString());

    const dailyPnL = (todayTrades || []).reduce((sum: number, t: any) => sum + (t.profit || 0), 0);
    const openPositions = (todayTrades || []).filter((t: any) => !t.profit).length;

    // Prop firm limits
    const MAX_DAILY_LOSS = -500; // $500 max daily loss
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
    return { allowed: true }; // Allow if risk check fails
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
