import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, message, chatId } = await req.json();
    
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const TELEGRAM_CHAT_ID = chatId || Deno.env.get("TELEGRAM_CHAT_ID");
    
    let result = { success: false, message: "No notification sent" };
    
    if (type === "telegram" && TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      const response = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: "HTML",
          }),
        }
      );
      
      const data = await response.json();
      
      if (data.ok) {
        result = { success: true, message: "Telegram notification sent" };
      } else {
        console.error("Telegram API error:", data);
        result = { success: false, message: data.description || "Failed to send" };
      }
    } else {
      console.log("Telegram not configured or missing credentials");
      result = { success: false, message: "Telegram not configured" };
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Notification error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
