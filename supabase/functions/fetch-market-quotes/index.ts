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
type Quote = { bid: number; ask: number; timestamp: number; source?: string };

const toYahooSymbol = (symbol: string) => {
  const clean = normalizeSymbolKey(symbol);
  if (clean === 'BTCUSD') return 'BTC-USD';
  if (clean === 'ETHUSD') return 'ETH-USD';
  if (clean === 'XAUUSD') return 'GC=F';
  if (clean === 'XAGUSD') return 'SI=F';
  if (clean === 'USOIL') return 'CL=F';
  if (clean === 'US500') return '^GSPC';
  if (clean === 'US30') return '^DJI';
  if (clean === 'NAS100') return '^IXIC';
  if (clean.length === 6) return `${clean}=X`;
  return clean;
};

async function fetchYahooMarketData(symbol: string, includeCandles: boolean): Promise<{ quote?: Quote; candles?: number[] }> {
  try {
    const yahooSymbol = toYahooSymbol(symbol);
    const range = includeCandles ? '2d' : '1d';
    const interval = includeCandles ? '5m' : '1m';
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=${range}&interval=${interval}`);
    if (!res.ok) return {};
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    const meta = result?.meta || {};
    const closes = (result?.indicators?.quote?.[0]?.close || [])
      .map((value: unknown) => Number(value))
      .filter((value: number) => Number.isFinite(value) && value > 0);
    const price = Number(meta.regularMarketPrice || meta.previousClose || closes[closes.length - 1] || 0);
    if (!price) return { candles: closes };
    const clean = normalizeSymbolKey(symbol);
    const spread = clean.includes('JPY') ? 0.01 : clean.length === 6 ? 0.0002 : price * 0.0006;
    return {
      quote: { bid: price - spread / 2, ask: price + spread / 2, timestamp: Date.now(), source: 'yahoo' },
      candles: closes,
    };
  } catch (error) {
    console.error(`Yahoo fallback failed for ${symbol}:`, error);
    return {};
  }
}

async function fetchCryptoMarketData(symbol: string, includeCandles: boolean): Promise<{ quote?: Quote; candles?: number[] }> {
  const clean = normalizeSymbolKey(symbol);
  const base = clean.replace(/USD$/, '');
  if (!['BTC', 'ETH', 'SOL', 'BNB', 'XRP'].includes(base) || !clean.endsWith('USD')) return {};

  const binanceSymbol = `${base}USDT`;
  const [bookRes, candleRes] = await Promise.all([
    fetch(`https://api.binance.com/api/v3/ticker/bookTicker?symbol=${binanceSymbol}`).catch(() => null),
    includeCandles ? fetch(`https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=5m&limit=100`).catch(() => null) : Promise.resolve(null),
  ]);

  const result: { quote?: Quote; candles?: number[] } = {};
  if (bookRes?.ok) {
    const book = await bookRes.json();
    const bid = Number(book.bidPrice);
    const ask = Number(book.askPrice);
    if (bid > 0 && ask > 0) result.quote = { bid, ask, timestamp: Date.now(), source: 'binance' };
  }
  if (includeCandles && candleRes?.ok) {
    const rows = await candleRes.json();
    const closes = Array.isArray(rows)
      ? rows.map((row: any[]) => Number(row?.[4])).filter((value: number) => Number.isFinite(value) && value > 0)
      : [];
    if (closes.length >= 30) result.candles = closes;
  }
  return result;
}

async function fetchForexMarketData(symbol: string, includeCandles: boolean): Promise<{ quote?: Quote; candles?: number[] }> {
  const clean = normalizeSymbolKey(symbol);
  if (clean.length !== 6) return {};
  const base = clean.slice(0, 3);
  const quoteCurrency = clean.slice(3, 6);
  const result: { quote?: Quote; candles?: number[] } = {};

  const latestRes = await fetch(`https://api.frankfurter.dev/v1/latest?base=${base}&symbols=${quoteCurrency}`).catch(() => null);
  if (latestRes?.ok) {
    const latest = await latestRes.json();
    const price = Number(latest?.rates?.[quoteCurrency]);
    if (price > 0) {
      const spread = clean.includes('JPY') ? 0.01 : 0.0002;
      result.quote = { bid: price - spread / 2, ask: price + spread / 2, timestamp: Date.now(), source: 'frankfurter' };
    }
  }

  if (includeCandles) {
    const end = new Date().toISOString().slice(0, 10);
    const start = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
    const historyRes = await fetch(`https://api.frankfurter.dev/v1/${start}..?base=${base}&symbols=${quoteCurrency}`).catch(() => null);
    if (historyRes?.ok) {
      const history = await historyRes.json();
      const closes = Object.entries(history?.rates || {})
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, rates]: [string, any]) => Number(rates?.[quoteCurrency]))
        .filter((value: number) => Number.isFinite(value) && value > 0);
      if (closes.length >= 30) result.candles = closes;
    }
  }
  return result;
}

async function fetchFallbackMarketData(symbol: string, includeCandles: boolean) {
  const clean = normalizeSymbolKey(symbol);
  if (['BTCUSD', 'ETHUSD', 'SOLUSD', 'BNBUSD', 'XRPUSD'].includes(clean)) {
    const crypto = await fetchCryptoMarketData(symbol, includeCandles);
    if (crypto.quote || crypto.candles?.length) return crypto;
  }
  if (clean.length === 6) {
    const forex = await fetchForexMarketData(symbol, includeCandles);
    if (forex.quote || forex.candles?.length) return forex;
  }
  return fetchYahooMarketData(symbol, includeCandles);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbols = '', candles = false, preferTwelveData = false } = await req.json().catch(() => ({}));
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

    const apiKey = preferTwelveData ? Deno.env.get('TWELVEDATA_API_KEY') : '';
    let quoteJson: any = {};
    let primaryProviderAvailable = Boolean(apiKey);
    if (apiKey) {
      const quoteUrl = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(providerSymbols.join(','))}&apikey=${apiKey}`;
      const quoteRes = await fetch(quoteUrl);
      if (quoteRes.ok) {
        quoteJson = await quoteRes.json();
      } else {
        primaryProviderAvailable = false;
        const err = await quoteRes.text();
        console.warn(`TwelveData quote unavailable, using Yahoo fallback: ${quoteRes.status}: ${err.slice(0, 240)}`);
      }
    } else {
      console.warn('Using Yahoo market data provider for live quotes/candles');
    }
    const quotes: Record<string, Quote> = {};

    const entries = typeof quoteJson === 'object' && quoteJson !== null
      ? Object.entries(quoteJson)
      : [];

    // Handles both multi-symbol map and single-symbol payload formats
    if ('symbol' in quoteJson && (quoteJson as any).symbol) {
      const symbol = normalizeSymbolKey((quoteJson as any).symbol);
      const price = Number((quoteJson as any).close ?? (quoteJson as any).price ?? 0);
      if (price > 0) {
        const spread = symbol.includes('JPY') ? 0.01 : 0.0002;
        quotes[symbol] = { bid: price - spread / 2, ask: price + spread / 2, timestamp: Date.now(), source: 'twelvedata' };
      }
    } else {
      for (const [, payload] of entries) {
        const p: any = payload;
        if (!p?.symbol) continue;
        const symbol = normalizeSymbolKey(p.symbol);
        const price = Number(p.close ?? p.price ?? 0);
        if (price <= 0) continue;
        const spread = symbol.includes('JPY') ? 0.01 : 0.0002;
        quotes[symbol] = { bid: price - spread / 2, ask: price + spread / 2, timestamp: Date.now(), source: 'twelvedata' };
      }
    }

    const responseBody: Record<string, unknown> = { quotes, source: primaryProviderAvailable ? 'twelvedata' : 'yahoo' };

    // 2) Optional candle fetch per symbol
    const candleMap: Record<string, number[]> = {};
    if (candles && apiKey && primaryProviderAvailable) {
      for (const providerSymbol of providerSymbols.slice(0, 10)) {
        const tsRes = await fetch(
          `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(providerSymbol)}&interval=5min&outputsize=100&apikey=${apiKey}`
        );
        if (!tsRes.ok) {
          const err = await tsRes.text();
          console.warn(`TwelveData candles unavailable for ${providerSymbol}, using fallback if needed: ${tsRes.status}: ${err.slice(0, 180)}`);
          continue;
        }
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

    // TwelveData can validly return empty objects for some symbols/accounts/quotas.
    // Fill missing assets from Yahoo Finance chart endpoints so the bot still uses real live market data.
    const missingSymbols = requestedSymbols.filter(symbol => !quotes[normalizeSymbolKey(symbol)]);
    const needsCandleFallback = candles
      ? requestedSymbols.filter(symbol => (candleMap[normalizeSymbolKey(symbol)] || []).length < 30)
      : [];
    const fallbackSymbols = Array.from(new Set([...missingSymbols, ...needsCandleFallback]));

    for (const symbol of fallbackSymbols.slice(0, 10)) {
      const fallback = await fetchFallbackMarketData(symbol, candles);
      const key = normalizeSymbolKey(symbol);
      if (fallback?.quote && !quotes[key]) quotes[key] = fallback.quote;
      if (candles && fallback?.candles?.length && fallback.candles.length >= 30) candleMap[key] = fallback.candles;
    }

    if (fallbackSymbols.length > 0) {
      responseBody.quotes = quotes;
      responseBody.candles = candleMap;
      responseBody.source = primaryProviderAvailable && Object.values(quotes).some((q: any) => q.source === 'twelvedata') ? 'twelvedata+yahoo' : 'yahoo';
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
