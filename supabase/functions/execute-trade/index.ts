
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    
    const requestData = await req.json();
    
    console.log('Executing trade with parameters:', JSON.stringify(requestData));
    
    // In a real implementation, this would connect to MT4/MT5/cTrader API
    // For development purposes, simulate a successful execution
    const ticketNumber = Math.floor(Math.random() * 10000000).toString();
    const volume = requestData.lotSize || 0.01;
    
    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Send notification to Telegram
    await sendTelegramNotification({
      symbol: requestData.symbol,
      type: requestData.type,
      price: requestData.price,
      platform: requestData.broker.platform,
      ticketNumber
    });
    
    return new Response(
      JSON.stringify({
        success: true,
        ticketNumber,
        volume,
        message: `Trade executed successfully on ${requestData.broker.platform}`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Error executing trade:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});

// Helper function to send Telegram notification
async function sendTelegramNotification(tradeInfo: any) {
  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');
    
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.warn('Telegram credentials not configured');
      return;
    }
    
    const message = `
📊 TRADE EXECUTED
${tradeInfo.type}: ${tradeInfo.symbol}
💰 Price: ${tradeInfo.price.toFixed(5)}
🔢 Ticket: ${tradeInfo.ticketNumber}
🖥️ Platform: ${tradeInfo.platform}
🕒 Time: ${new Date().toLocaleString()}
    `;
    
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML'
      })
    });
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
  }
}
