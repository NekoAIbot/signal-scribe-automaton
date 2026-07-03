// Uses built-in Deno.serve — no remote imports required.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
};

/**
 * Market Regime Detector
 * Input:  { symbol: string, candles?: number[], assetClass?: string }
 * Output: { regime, volatility, liquidity, session_quality, news_risk, features, confidence }
 *
 * Regimes:  trending_up | trending_down | ranging | breakout | choppy | quiet
 * Volatility / liquidity / session_quality: 'low' | 'medium' | 'high'
 * news_risk: 'none' | 'low' | 'medium' | 'high'
 */

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { symbol, candles: providedCandles, assetClass } = await req.json();
    if (!symbol) throw new Error("symbol required");

    // Fetch candles if not provided
    let closes: number[] = Array.isArray(providedCandles)
      ? providedCandles.map(Number).filter((n) => Number.isFinite(n) && n > 0)
      : [];

    if (closes.length < 30) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const res = await fetch(`${supabaseUrl}/functions/v1/fetch-market-quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${anonKey}`, apikey: anonKey },
        body: JSON.stringify({ symbols: symbol, candles: true }),
      });
      const j = await res.json().catch(() => ({}));
      const key = String(symbol).replace("/", "").toUpperCase();
      closes = (j?.candles?.[key] || []).map(Number).filter((n: number) => Number.isFinite(n) && n > 0);
    }

    if (closes.length < 20) {
      return json({
        regime: "quiet",
        volatility: "low",
        liquidity: "low",
        session_quality: sessionQualityForSymbol(symbol, assetClass),
        news_risk: "none",
        features: { insufficient_data: true, candles: closes.length },
        confidence: 0.2,
      });
    }

    const features = computeFeatures(closes);
    const regime = classifyRegime(features);
    const volatility = bucket(features.atrPct, [0.15, 0.4]);
    const liquidity = bucket(1 / Math.max(features.spreadProxy, 1e-6), [500, 2000]);
    const session = sessionQualityForSymbol(symbol, assetClass);
    const newsRisk = estimateNewsRisk(symbol, assetClass);

    return json({
      regime,
      volatility,
      liquidity,
      session_quality: session,
      news_risk: newsRisk,
      features,
      confidence: features.adx / 100,
    });
  } catch (e) {
    console.error("market-regime-detector:", e);
    return json({ error: (e as Error).message }, 400);
  }
});

function computeFeatures(closes: number[]) {
  const n = closes.length;
  const last = closes[n - 1];
  const ema = (period: number) => {
    const k = 2 / (period + 1);
    let e = closes[0];
    for (let i = 1; i < n; i++) e = closes[i] * k + e * (1 - k);
    return e;
  };
  const sma = (period: number) => {
    const slice = closes.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  };
  const ema20 = ema(20);
  const ema50 = ema(Math.min(50, n - 1));
  const sma20 = sma(20);

  // Returns & ATR-like true range percentage
  const returns: number[] = [];
  const trs: number[] = [];
  for (let i = 1; i < n; i++) {
    returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    trs.push(Math.abs(closes[i] - closes[i - 1]));
  }
  const atr = trs.slice(-14).reduce((a, b) => a + b, 0) / Math.min(14, trs.length);
  const atrPct = (atr / last) * 100;

  // Slope via least-squares on last 20
  const window = closes.slice(-20);
  const meanY = window.reduce((a, b) => a + b, 0) / window.length;
  const meanX = (window.length - 1) / 2;
  let num = 0, den = 0;
  for (let i = 0; i < window.length; i++) {
    num += (i - meanX) * (window[i] - meanY);
    den += (i - meanX) ** 2;
  }
  const slope = den ? num / den : 0;
  const slopePct = (slope / last) * 100;

  // Simple ADX proxy: |slope| relative to volatility
  const adx = Math.min(100, Math.abs(slopePct) / Math.max(atrPct, 1e-6) * 30);

  // Range compression: recent range vs long range
  const hi20 = Math.max(...window);
  const lo20 = Math.min(...window);
  const range20 = (hi20 - lo20) / last;
  const hi50 = Math.max(...closes.slice(-Math.min(50, n)));
  const lo50 = Math.min(...closes.slice(-Math.min(50, n)));
  const range50 = (hi50 - lo50) / last;
  const compression = range50 > 0 ? range20 / range50 : 1;

  // Spread proxy (higher volatility → wider spread)
  const spreadProxy = atrPct / 100;

  return {
    last,
    ema20,
    ema50,
    sma20,
    atrPct,
    slopePct,
    adx,
    range20Pct: range20 * 100,
    range50Pct: range50 * 100,
    compression,
    spreadProxy,
  };
}

function classifyRegime(f: ReturnType<typeof computeFeatures>) {
  const trending = f.adx > 25;
  const compressed = f.compression < 0.4 && f.atrPct < 0.3;
  const expanding = f.range20Pct > f.range50Pct * 0.75 && f.atrPct > 0.4;

  if (trending && f.slopePct > 0) return "trending_up";
  if (trending && f.slopePct < 0) return "trending_down";
  if (compressed) return "quiet";
  if (expanding && !trending) return "breakout";
  if (f.adx < 15 && f.atrPct > 0.5) return "choppy";
  return "ranging";
}

function bucket(value: number, thresholds: [number, number]): "low" | "medium" | "high" {
  if (value < thresholds[0]) return "low";
  if (value < thresholds[1]) return "medium";
  return "high";
}

function sessionQualityForSymbol(symbol: string, assetClass?: string): "low" | "medium" | "high" {
  const nowUtc = new Date().getUTCHours();
  if (assetClass === "crypto") return "high"; // 24/7
  const s = String(symbol).toUpperCase();
  // London: 07-16 UTC, NY: 12-21 UTC, Tokyo: 00-09 UTC
  const inLondon = nowUtc >= 7 && nowUtc < 16;
  const inNY = nowUtc >= 12 && nowUtc < 21;
  const inTokyo = nowUtc >= 0 && nowUtc < 9;
  const overlap = inLondon && inNY;

  if (s.includes("JPY") && inTokyo) return "high";
  if (overlap) return "high";
  if (inLondon || inNY) return "medium";
  return "low";
}

function estimateNewsRisk(_symbol: string, _assetClass?: string): "none" | "low" | "medium" | "high" {
  // Placeholder: real news gate lives in safety-check module (Phase 4).
  // Return 'low' during typical release windows (13:30 UTC = NFP/CPI window).
  const utc = new Date();
  const hh = utc.getUTCHours();
  const mm = utc.getUTCMinutes();
  const inNfpWindow = hh === 13 && mm >= 25 && mm <= 40;
  return inNfpWindow ? "high" : "low";
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
