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
    const { symbols, provider } = await req.json();
    
    // Get API keys from secrets
    const TWELVEDATA_API_KEY = Deno.env.get("TWELVEDATA_API_KEY");
    const ALPHAVANTAGE_API_KEY = Deno.env.get("ALPHAVANTAGE_API_KEY");
    
    let marketData: any[] = [];

    if (provider === "twelvedata" && TWELVEDATA_API_KEY) {
      // Fetch from TwelveData
      const symbolsParam = symbols.join(",");
      const response = await fetch(
        `https://api.twelvedata.com/quote?symbol=${symbolsParam}&apikey=${TWELVEDATA_API_KEY}`
      );
      const data = await response.json();
      
      if (data && !data.code) {
        // Handle both single and multiple symbols
        if (Array.isArray(symbols) && symbols.length === 1) {
          marketData = [data];
        } else {
          marketData = Object.values(data);
        }
      }
    } else if (provider === "alphavantage" && ALPHAVANTAGE_API_KEY) {
      // Fetch from Alpha Vantage (one symbol at a time)
      for (const symbol of symbols.slice(0, 5)) {
        try {
          const response = await fetch(
            `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHAVANTAGE_API_KEY}`
          );
          const data = await response.json();
          if (data["Global Quote"]) {
            marketData.push({
              symbol: data["Global Quote"]["01. symbol"],
              price: parseFloat(data["Global Quote"]["05. price"]),
              change: parseFloat(data["Global Quote"]["09. change"]),
              change_percent: data["Global Quote"]["10. change percent"],
              volume: parseInt(data["Global Quote"]["06. volume"]),
            });
          }
        } catch (err) {
          console.error(`Error fetching ${symbol}:`, err);
        }
      }
    } else {
      return new Response(
        JSON.stringify({ error: "No real-time market data provider configured (set TWELVEDATA_API_KEY or ALPHAVANTAGE_API_KEY)." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ data: marketData, provider: provider || "live" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Market data error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
