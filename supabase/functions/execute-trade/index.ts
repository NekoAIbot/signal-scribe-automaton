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
    
    let executionResult: any;
    
    if (METAAPI_TOKEN && requestData.brokerAccountId) {
      // Try MetaApi - get account credentials from db
      const { data: creds } = await supabaseClient
        .from('broker_credentials')
        .select('login, server, broker_type')
        .eq('id', requestData.brokerAccountId)
        .single();
      
      executionResult = await executeViaMetaApi(METAAPI_TOKEN, { ...requestData, metaApiAccountId: creds?.login });
    } else if (MT5_BRIDGE_URL) {
      executionResult = await executeViaBridge(MT5_BRIDGE_URL, MT5_BRIDGE_API_KEY || '', requestData);
    } else {
      // Simulated execution (no bridge configured)
      executionResult = {
        ticketNumber: Math.floor(Math.random() * 10000000).toString(),
        volume: requestData.lotSize || 0.01,
        simulated: true
      };
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Record trade with full details including indicators and calculations
    const tradeRecord: any = {
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
    
    if (tradeError) {
      console.error('Error recording trade:', tradeError);
    }
    
    // Send Telegram notification
    await sendTelegramNotification({
      symbol: requestData.symbol,
      type: requestData.type,
      price: requestData.price,
      ticketNumber: executionResult.ticketNumber,
      simulated: executionResult.simulated || false
    });
    
    return new Response(
      JSON.stringify({
        success: true,
        ticketNumber: executionResult.ticketNumber,
        volume: executionResult.volume,
        tradeId: savedTrade?.id,
        simulated: executionResult.simulated || false,
        message: executionResult.simulated 
          ? 'Trade simulated (no bridge configured)' 
          : 'Trade executed successfully'
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

async function executeViaMetaApi(token: string, data: any) {
  const accountId = data.metaApiAccountId;
  const url = `https://mt-client-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts/${accountId}/trade`;
  
  const tradePayload: any = {
    actionType: data.type === 'BUY' ? 'ORDER_TYPE_BUY' : 'ORDER_TYPE_SELL',
    symbol: data.symbol?.replace('/', ''),
    volume: data.lotSize || 0.01,
  };
  
  if (data.stopLoss) tradePayload.stopLoss = data.stopLoss;
  if (data.takeProfit) tradePayload.takeProfit = data.takeProfit;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'auth-token': token
    },
    body: JSON.stringify(tradePayload)
  });
  
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`MetaApi error: ${response.status} ${errText}`);
  }
  
  const result = await response.json();
  return {
    ticketNumber: result.orderId || result.positionId || String(Date.now()),
    volume: data.lotSize || 0.01,
    simulated: false
  };
}

async function executeViaBridge(bridgeUrl: string, apiKey: string, data: any) {
  const response = await fetch(`${bridgeUrl}/trade`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
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
    const errText = await response.text();
    throw new Error(`Bridge error: ${response.status} ${errText}`);
  }
  
  const result = await response.json();
  return {
    ticketNumber: result.ticket || result.order_id || String(Date.now()),
    volume: data.lotSize || 0.01,
    simulated: false
  };
}

async function sendTelegramNotification(tradeInfo: any) {
  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
    
    const mode = tradeInfo.simulated ? '🔬 SIMULATED' : '✅ LIVE';
    const message = `
📊 TRADE EXECUTED (${mode})
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
