import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const normalizeSymbolForProvider = (symbol: string) => {
  const clean = symbol.replace('/', '').toUpperCase();
  if (clean.length === 6) return `${clean.slice(0, 3)}/${clean.slice(3)}`;
  return clean;
};

const normalizeSymbolKey = (symbol: string) => symbol.replace('/', '').toUpperCase();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('TWELVEDATA_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({
        error: 'TWELVEDATA_API_KEY is not configured. Real quotes cannot be fetched.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { symbols = '', candles = false } = await req.json().catch(() => ({}));
    const requestedSymbols = symbols
      ? symbols.split(',').map((s: string) => s.trim()).filter(Boolean)
      : [];

    if (requestedSymbols.length === 0) {
      return new Response(JSON.stringify({ error: 'No symbols were provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const providerSymbols = requestedSymbols.map(normalizeSymbolForProvider);

    // 1) Fetch live quotes
    const quoteUrl = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(providerSymbols.join(','))}&apikey=${apiKey}`;
    const quoteRes = await fetch(quoteUrl);
    if (!quoteRes.ok) {
      const err = await quoteRes.text();
      return new Response(JSON.stringify({ error: `Quote provider error ${quoteRes.status}: ${err}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const quoteJson = await quoteRes.json();
    const quotes: Record<string, { bid: number; ask: number; timestamp: number }> = {};

    const entries = typeof quoteJson === 'object' && quoteJson !== null
      ? Object.entries(quoteJson)
      : [];

    // Handles both multi-symbol map and single-symbol payload formats
    if ('symbol' in quoteJson && (quoteJson as any).symbol) {
      const symbol = normalizeSymbolKey((quoteJson as any).symbol);
      const price = Number((quoteJson as any).close ?? (quoteJson as any).price ?? 0);
      if (price > 0) {
        const spread = symbol.includes('JPY') ? 0.01 : 0.0002;
        quotes[symbol] = { bid: price - spread / 2, ask: price + spread / 2, timestamp: Date.now() };
      }
    } else {
      for (const [, payload] of entries) {
        const p: any = payload;
        if (!p?.symbol) continue;
        const symbol = normalizeSymbolKey(p.symbol);
        const price = Number(p.close ?? p.price ?? 0);
        if (price <= 0) continue;
        const spread = symbol.includes('JPY') ? 0.01 : 0.0002;
        quotes[symbol] = { bid: price - spread / 2, ask: price + spread / 2, timestamp: Date.now() };
      }
    }

    const responseBody: Record<string, unknown> = { quotes, source: 'twelvedata' };

    // 2) Optional candle fetch per symbol
    if (candles) {
      const candleMap: Record<string, number[]> = {};
      for (const providerSymbol of providerSymbols.slice(0, 10)) {
        const tsRes = await fetch(
          `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(providerSymbol)}&interval=5min&outputsize=100&apikey=${apiKey}`
        );
        if (!tsRes.ok) continue;
        const tsJson = await tsRes.json();
        const values = Array.isArray(tsJson?.values) ? tsJson.values : [];
        const closes = values
          .map((v: any) => Number(v?.close))
          .filter((n: number) => Number.isFinite(n) && n > 0)
          .reverse();

        candleMap[normalizeSymbolKey(providerSymbol)] = closes;
      }
      responseBody.candles = candleMap;
    }

    return new Response(JSON.stringify(responseBody), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
