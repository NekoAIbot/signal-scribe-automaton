import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsBaseHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function resolveCorsHeaders(req: Request) {
  const configuredOrigins = (Deno.env.get("ALLOWED_ORIGINS") || "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);

  const requestOrigin = req.headers.get("origin") || "";
  const allowOrigin = configuredOrigins.length === 0
    ? (requestOrigin || "*")
    : (
      !requestOrigin || configuredOrigins.includes(requestOrigin)
        ? (requestOrigin || configuredOrigins[0])
        : requestOrigin
    );

  return {
    ...corsBaseHeaders,
    "Access-Control-Allow-Origin": allowOrigin,
  };
}

interface TelegramMessage {
  type: 'telegram';
  message: string;
  chatId?: string;
}

interface TradeAlertMessage {
  type: 'trade_alert';
  symbol: string;
  action: 'BUY' | 'SELL' | 'CLOSE';
  price: number;
  strategy?: string;
  confidence?: number;
  stopLoss?: number;
  takeProfit?: number;
  extraMessage?: string;
}

interface SignalAlertMessage {
  type: 'signal_alert';
  symbol: string;
  signalType: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  entryPrice: number;
  targetPrice?: number;
  stopLoss?: number;
  timeframe: string;
  models: string[];
}

type NotificationPayload = TelegramMessage | TradeAlertMessage | SignalAlertMessage;

const formatTradeAlert = (data: TradeAlertMessage): string => {
  const emoji = data.action === 'BUY' ? '🟢' : data.action === 'SELL' ? '🔴' : '⚪';
  const actionEmoji = data.action === 'BUY' ? '📈' : data.action === 'SELL' ? '📉' : '🔄';
  
  let message = `
${actionEmoji} <b>TRADE ALERT</b> ${actionEmoji}

${emoji} <b>${data.action}</b> ${data.symbol}
💰 Price: <code>${data.price.toFixed(5)}</code>`;

  if (data.strategy) {
    message += `\n📊 Strategy: ${data.strategy}`;
  }
  
  if (data.confidence) {
    message += `\n🎯 Confidence: ${(data.confidence * 100).toFixed(1)}%`;
  }
  
  if (data.stopLoss) {
    message += `\n🛑 Stop Loss: <code>${data.stopLoss.toFixed(5)}</code>`;
  }
  
  if (data.takeProfit) {
    message += `\n✅ Take Profit: <code>${data.takeProfit.toFixed(5)}</code>`;
  }

  if (data.extraMessage) {
    message += `\n${data.extraMessage}`;
  }
  
  message += `\n⏰ Time: ${new Date().toLocaleString()}`;
  
  return message;
};

const formatSignalAlert = (data: SignalAlertMessage): string => {
  const emoji = data.signalType === 'BUY' ? '🟢' : data.signalType === 'SELL' ? '🔴' : '⚪';
  const confidenceBar = '█'.repeat(Math.floor(data.confidence * 10)) + '░'.repeat(10 - Math.floor(data.confidence * 10));
  
  let message = `
📡 <b>AI SIGNAL DETECTED</b> 📡

${emoji} <b>${data.signalType}</b> ${data.symbol}
⏱ Timeframe: ${data.timeframe}

💰 Entry: <code>${data.entryPrice.toFixed(5)}</code>`;

  if (data.targetPrice) {
    message += `\n🎯 Target: <code>${data.targetPrice.toFixed(5)}</code>`;
  }
  
  if (data.stopLoss) {
    message += `\n🛑 Stop Loss: <code>${data.stopLoss.toFixed(5)}</code>`;
  }
  
  message += `\n\n📊 Confidence: ${(data.confidence * 100).toFixed(0)}%\n<code>${confidenceBar}</code>`;
  
  if (data.models.length > 0) {
    message += `\n\n🤖 Models: ${data.models.join(', ')}`;
  }
  
  message += `\n\n⏰ ${new Date().toLocaleString()}`;
  
  return message;
};

serve(async (req) => {
  const corsHeaders = resolveCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: NotificationPayload = await req.json();
    
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");
    
    let result = { success: false, message: "No notification sent" };
    
    // Determine message content based on type
    let messageText: string;
    let chatId: string | undefined;
    
    switch (payload.type) {
      case 'telegram':
        messageText = payload.message;
        chatId = payload.chatId || TELEGRAM_CHAT_ID;
        break;
      case 'trade_alert':
        messageText = formatTradeAlert(payload);
        chatId = TELEGRAM_CHAT_ID;
        break;
      case 'signal_alert':
        messageText = formatSignalAlert(payload);
        chatId = TELEGRAM_CHAT_ID;
        break;
      default:
        return new Response(
          JSON.stringify({ success: false, message: "Invalid notification type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
    
    if (TELEGRAM_BOT_TOKEN && chatId) {
      console.log(`Sending Telegram notification to chat ${chatId}`);
      
      const response = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: messageText,
            parse_mode: "HTML",
            disable_web_page_preview: true,
          }),
        }
      );
      
      const data = await response.json();
      
      if (data.ok) {
        console.log("Telegram notification sent successfully");
        result = { success: true, message: "Telegram notification sent" };
      } else {
        console.error("Telegram API error:", data);
        result = { success: false, message: data.description || "Failed to send" };
      }
    } else {
      console.warn("Telegram not configured:", { 
        hasToken: !!TELEGRAM_BOT_TOKEN, 
        hasChatId: !!chatId 
      });
      result = { success: false, message: "Telegram not configured - missing bot token or chat ID" };
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Notification error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
