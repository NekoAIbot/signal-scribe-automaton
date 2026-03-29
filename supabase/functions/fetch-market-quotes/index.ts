import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Realistic base prices for all supported assets
const basePrices: Record<string, number> = {
  'EURUSD': 1.0852, 'GBPUSD': 1.2685, 'USDJPY': 149.72, 'AUDUSD': 0.6538,
  'USDCAD': 1.3612, 'NZDUSD': 0.6082, 'USDCHF': 0.8834,
  'BTCUSD': 84250, 'ETHUSD': 3180, 'XRPUSD': 2.35, 'SOLUSD': 142.5,
  'SPX': 5950, 'NDX': 20850, 'DJI': 43250,
  'XAUUSD': 2920, 'XAGUSD': 32.4, 'USOIL': 69.85,
};

// In-memory price state for continuity between requests
const livePrices: Record<string, { bid: number; ask: number; timestamp: number }> = {};

function initPrices() {
  for (const [sym, price] of Object.entries(basePrices)) {
    if (!livePrices[sym]) {
      const spread = price > 1000 ? 1 : price > 100 ? 0.05 : price > 10 ? 0.01 : 0.0002;
      livePrices[sym] = { bid: price - spread / 2, ask: price + spread / 2, timestamp: Date.now() };
    }
  }
}

function tickPrices() {
  for (const sym of Object.keys(livePrices)) {
    const base = (livePrices[sym].bid + livePrices[sym].ask) / 2;
    // Volatility proportional to price
    const volatility = base > 10000 ? 15 : base > 1000 ? 2 : base > 100 ? 0.15 : base > 10 ? 0.02 : 0.0004;
    const change = (Math.random() - 0.5) * volatility;
    const newMid = base + change;
    const spread = base > 1000 ? 1 : base > 100 ? 0.05 : base > 10 ? 0.01 : 0.0002;
    livePrices[sym] = { bid: newMid - spread / 2, ask: newMid + spread / 2, timestamp: Date.now() };
  }
}

// In-memory candle history for indicator calculations
const candleHistory: Record<string, number[]> = {};
const MAX_CANDLES = 100;

function updateCandleHistory() {
  for (const [sym, data] of Object.entries(livePrices)) {
    if (!candleHistory[sym]) candleHistory[sym] = [];
    candleHistory[sym].push((data.bid + data.ask) / 2);
    if (candleHistory[sym].length > MAX_CANDLES) {
      candleHistory[sym] = candleHistory[sym].slice(-MAX_CANDLES);
    }
  }
}

initPrices();
// Seed candle history with initial data
for (let i = 0; i < 60; i++) {
  tickPrices();
  updateCandleHistory();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('TWELVEDATA_API_KEY');
    const { symbols = '' } = await req.json().catch(() => ({}));

    // Parse requested symbols
    const requestedSymbols = symbols
      ? symbols.split(',').map((s: string) => s.trim().replace('/', ''))
      : Object.keys(basePrices);

    // Try TwelveData for forex pairs
    if (apiKey) {
      try {
        const forexSymbols = requestedSymbols
          .filter((s: string) => ['EURUSD','GBPUSD','USDJPY','AUDUSD','USDCAD','NZDUSD','USDCHF'].includes(s))
          .map((s: string) => s.slice(0, 3) + '/' + s.slice(3))
          .join(',');

        if (forexSymbols) {
          const url = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(forexSymbols)}&apikey=${apiKey}`;
          const response = await fetch(url);
          
          if (response.ok) {
            const data = await response.json();
            // Handle multi-symbol response
            if (typeof data === 'object' && !data.price) {
              for (const [sym, val] of Object.entries(data)) {
                const key = sym.replace('/', '');
                const price = parseFloat((val as any).price);
                if (!isNaN(price)) {
                  const spread = 0.0002;
                  livePrices[key] = { bid: price - spread, ask: price + spread, timestamp: Date.now() };
                }
              }
            } else if (data.price) {
              const key = forexSymbols.split(',')[0].replace('/', '');
              const price = parseFloat(data.price);
              livePrices[key] = { bid: price - 0.0002, ask: price + 0.0002, timestamp: Date.now() };
            }
          }
        }
      } catch (e) {
        console.error('TwelveData fetch error:', e);
      }
    }

    // Tick all prices for realism
    tickPrices();
    updateCandleHistory();

    // Return only requested symbols
    const quotes: Record<string, { bid: number; ask: number; timestamp: number }> = {};
    const candles: Record<string, number[]> = {};
    for (const sym of requestedSymbols) {
      if (livePrices[sym]) {
        quotes[sym] = livePrices[sym];
        candles[sym] = candleHistory[sym] || [];
      }
    }

    return new Response(JSON.stringify({ quotes, candles, source: apiKey ? 'twelvedata' : 'simulated' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error:", error);
    tickPrices();
    return new Response(JSON.stringify({ quotes: livePrices, source: 'simulated' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
