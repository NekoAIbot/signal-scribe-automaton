import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const mockQuotes = {
  EURUSD: { bid: 1.0923, ask: 1.0925, timestamp: Date.now() },
  GBPUSD: { bid: 1.2651, ask: 1.2654, timestamp: Date.now() },
  USDJPY: { bid: 110.87, ask: 110.89, timestamp: Date.now() },
  AUDUSD: { bid: 0.7312, ask: 0.7315, timestamp: Date.now() },
  USDCAD: { bid: 1.2567, ask: 1.2570, timestamp: Date.now() },
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('TWELVEDATA_API_KEY');
    const { symbols = 'EUR/USD,GBP/USD,USD/JPY,AUD/USD,USD/CAD' } = await req.json().catch(() => ({}));
    
    // If no API key, return mock data
    if (!apiKey) {
      console.log("No TWELVEDATA_API_KEY configured, returning mock data");
      return new Response(JSON.stringify({ quotes: mockQuotes, source: 'mock' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(symbols)}&apikey=${apiKey}`;
    
    console.log("Fetching quotes from TwelveData...");
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`TwelveData API error: ${response.status}`);
      return new Response(JSON.stringify({ quotes: mockQuotes, source: 'mock', error: 'API error' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const data = await response.json();
    
    // Transform TwelveData response to our format
    const quotes: Record<string, { bid: number; ask: number; timestamp: number }> = {};
    
    if (Array.isArray(data)) {
      data.forEach((item: any) => {
        const symbol = item.symbol?.replace('/', '') || 'UNKNOWN';
        const price = parseFloat(item.price);
        quotes[symbol] = {
          bid: price - 0.0002,
          ask: price + 0.0002,
          timestamp: Date.now()
        };
      });
    } else if (data.price) {
      // Single symbol response
      const symbol = symbols.split(',')[0].replace('/', '');
      const price = parseFloat(data.price);
      quotes[symbol] = {
        bid: price - 0.0002,
        ask: price + 0.0002,
        timestamp: Date.now()
      };
    }
    
    console.log(`Fetched ${Object.keys(quotes).length} quotes`);
    return new Response(JSON.stringify({ quotes, source: 'twelvedata' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error fetching quotes:", error);
    return new Response(JSON.stringify({ quotes: mockQuotes, source: 'mock', error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
