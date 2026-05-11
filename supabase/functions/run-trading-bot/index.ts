import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type SignalSide = "BUY" | "SELL";

interface TimelineEvent {
  stage: string;
  status: "started" | "success" | "failed" | "skipped";
  at: string;
  message?: string;
  meta?: Record<string, unknown>;
}

const nowIso = () => new Date().toISOString();
const normalizeSymbolKey = (symbol: string) => symbol.replace("/", "").toUpperCase();
const displaySymbol = (symbol: string) => symbol.includes("/") ? symbol : (symbol.length === 6 ? `${symbol.slice(0, 3)}/${symbol.slice(3)}` : symbol);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    if (!supabaseUrl || !serviceKey || !anonKey) throw new Error("Backend trading secrets are not configured");

    const client = createClient(supabaseUrl, serviceKey);
    const requestBody = await req.json().catch(() => ({}));
    const requestedUserId = typeof requestBody.userId === "string" ? requestBody.userId : null;

    const { data: settings, error: settingsError } = await client
      .from("trading_bot_settings")
      .select("user_id, bot_enabled, telegram_enabled, interval_seconds, updated_at")
      .or("bot_enabled.eq.true,telegram_enabled.eq.true")
      .order("updated_at", { ascending: true })
      .limit(requestedUserId ? 1 : 25);

    if (settingsError) throw settingsError;

    const runnableSettings = (settings || []).filter((setting: any) => !requestedUserId || setting.user_id === requestedUserId);
    const results = [];

    for (const setting of runnableSettings) {
      results.push(await runForUser(client, supabaseUrl, anonKey, serviceKey, setting));
    }

    return json({ success: true, processed: results.length, results });
  } catch (error) {
    console.error("run-trading-bot error:", error);
    return json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

async function runForUser(client: any, supabaseUrl: string, anonKey: string, serviceKey: string, setting: any) {
  const timeline: TimelineEvent[] = [{ stage: "cycle", status: "started", at: nowIso(), message: "Scheduled trading cycle started" }];
  try {
    const userId = setting.user_id;
    const signals = await generateSignalsForUser(client, supabaseUrl, anonKey, userId, timeline);

    if (signals.length === 0) {
      timeline.push({ stage: "signal_generation", status: "skipped", at: nowIso(), message: "No valid market-hours signal from active strategies/models" });
      return { userId, generated: 0, executed: 0, telegramSent: 0, timeline };
    }

    const { data: savedSignals, error: saveError } = await client.from("trading_signals").insert(signals.map((signal: any) => ({
      user_id: userId,
      symbol: signal.symbol,
      signal_type: signal.type.toLowerCase(),
      entry_price: signal.price,
      stop_loss: signal.stopLoss,
      target_price: signal.takeProfit,
      confidence: signal.confidence,
      strategy_id: signal.strategyId,
      model_id: signal.modelId,
      timeframe: "5min",
      is_active: true,
      status: "new",
    }))).select("id");
    if (saveError) throw saveError;

    const outcomes = await Promise.allSettled(signals.map(async (signal: any, index: number) => {
      const signalId = savedSignals?.[index]?.id || null;
      const jobs: Promise<any>[] = [];

      if (setting.telegram_enabled) jobs.push(sendTelegram(supabaseUrl, anonKey, signal));
      if (setting.bot_enabled) jobs.push(executeTrade(supabaseUrl, anonKey, serviceKey, userId, signal));

      const settled = await Promise.allSettled(jobs);
      const executed = settled.some((result: any) => result.status === "fulfilled" && result.value?.success === true && result.value?.tradeId);
      await client.from("trading_signals").update({ status: executed ? "executed" : "sent_telegram", is_active: !executed }).eq("id", signalId);
      return { signal: signal.symbol, executed, settled };
    }));

    const executed = outcomes.filter((outcome: any) => outcome.status === "fulfilled" && outcome.value.executed).length;
    const retraining = await triggerAndProcessRetraining(client, supabaseUrl, anonKey, serviceKey, userId, timeline);
    timeline.push({ stage: "cycle", status: "success", at: nowIso(), message: `Generated ${signals.length}, executed ${executed}` });
    return { userId, generated: signals.length, executed, telegramSent: setting.telegram_enabled ? signals.length : 0, retraining, timeline };
  } catch (error) {
    timeline.push({ stage: "cycle", status: "failed", at: nowIso(), message: error instanceof Error ? error.message : "Unknown error" });
    console.error("runForUser failed:", error);
    return { userId: setting.user_id, generated: 0, executed: 0, telegramSent: 0, timeline };
  }
}

async function generateSignalsForUser(client: any, supabaseUrl: string, anonKey: string, userId: string, timeline: TimelineEvent[]) {
  const { data: activeStrategies, error: strategyError } = await client
    .from("trading_strategies")
    .select("id, name, indicators, risk_profile, ai_auto_select, model_ids, assets, is_active, updated_at")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(25);

  if (strategyError) throw strategyError;
  if (!activeStrategies?.length) return [];

  const aiSoloStrategy = activeStrategies.find((strategy: any) => strategy.ai_auto_select);
  const usableStrategies = aiSoloStrategy ? [aiSoloStrategy] : activeStrategies;

  const referencedModelIds = Array.from(new Set(usableStrategies.flatMap((strategy: any) => strategy.model_ids || [])));
  const { data: userModels, error: modelError } = await client
    .from("ml_models")
      .select("id, name, type, accuracy, version, is_active, params")
    .eq("user_id", userId)
    .eq("is_active", true);
  if (modelError) throw modelError;

  const models = aiSoloStrategy
    ? (userModels || []).sort((a: any, b: any) => Number(b.accuracy || 0) - Number(a.accuracy || 0))
    : (userModels || []).filter((model: any) => referencedModelIds.includes(model.id));
  const modelMap = new Map(models.map((model: any) => [model.id, model]));

  const symbols = filterSymbolsByMarketHours(resolveSymbols(usableStrategies), new Date());
  if (symbols.length === 0) {
    timeline.push({ stage: "market_hours", status: "skipped", at: nowIso(), message: "No selected markets are open for the current UTC date/time" });
    return [];
  }

  const quoteData = await invokeFunction(supabaseUrl, anonKey, "fetch-market-quotes", { symbols: symbols.join(","), candles: true });
  const quotes = quoteData?.quotes || {};
  const candlesMap = quoteData?.candles || {};
  if (Object.keys(quotes).length === 0) return [];

  const aiPredictions = await getMarketAdvice(supabaseUrl, anonKey, quotes, usableStrategies, models, aiSoloStrategy, timeline);
  const signals: any[] = [];

  for (const [rawSymbol, quote] of Object.entries(quotes) as [string, any][]) {
    if (signals.length >= 5) break;
    const symbol = displaySymbol(rawSymbol);
    const candles = candlesMap[normalizeSymbolKey(rawSymbol)] || [];
    if (!Array.isArray(candles) || candles.length < 30) continue;

    const strategies = usableStrategies.filter((strategy: any) => strategyMatchesSymbol(strategy, symbol, rawSymbol));
    if (strategies.length === 0) continue;

    const strategy = aiSoloStrategy || strategies[0];
    const bid = Number(quote.bid || quote.price || 0);
    const ask = Number(quote.ask || quote.price || 0);
    const mid = (bid + ask) / 2;
    if (!Number.isFinite(mid) || mid <= 0) continue;

    const indicators = calculateIndicators(candles, mid);
    const modelCandidates = (strategy.model_ids || []).map((id: string) => modelMap.get(id)).filter(Boolean);
    const selectedModel = aiSoloStrategy ? models[0] : modelCandidates.sort((a: any, b: any) => Number(b.accuracy || 0) - Number(a.accuracy || 0))[0];
    const modelVote = selectedModel ? evaluateModel(selectedModel, indicators, strategy.risk_profile || "medium") : null;
    const aiPred = aiPredictions.find((p: any) => normalizeSymbolKey(p.symbol || "") === normalizeSymbolKey(rawSymbol));

    const decision = decideSignal(strategy, indicators, modelVote, aiPred, Boolean(aiSoloStrategy));
    if (!decision.shouldSignal || decision.confidence <= 0.6) continue;

    const confidence = selectedModel?.accuracy
      ? Math.min(0.99, decision.confidence * 0.6 + Number(selectedModel.accuracy) * 0.4)
      : decision.confidence;
    const slDistance = indicators.atr * 1.5;
    const tpDistance = indicators.atr * 2.5;

    signals.push({
      symbol,
      type: decision.type,
      price: mid,
      stopLoss: decision.type === "BUY" ? mid - slDistance : mid + slDistance,
      takeProfit: decision.type === "BUY" ? mid + tpDistance : mid - tpDistance,
      confidence,
      strategy: aiSoloStrategy ? `AI Strategy · ${strategy.name}` : strategy.name,
      strategyId: strategy.id,
      modelId: selectedModel?.id || null,
      modelVersion: selectedModel?.version || null,
      modelUsed: selectedModel ? `${selectedModel.name} · ${selectedModel.type}` : "AI Market Strategy",
      assetClass: classifyAsset(symbol),
      indicators,
      calculations: { spread: ask - bid, market_time_utc: nowIso(), market_session: marketSession(new Date()), ai_solo: Boolean(aiSoloStrategy) },
    });
  }

  timeline.push({ stage: "signal_generation", status: "success", at: nowIso(), message: `Generated ${signals.length} signal(s) from live market data` });
  return signals;
}

function resolveSymbols(strategies: any[]) {
  const defaults = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD", "NZD/USD", "BTC/USD", "ETH/USD"];
  const configured = strategies.flatMap((strategy: any) => strategy.assets || []).filter(Boolean);
  return Array.from(new Set((configured.length ? configured : defaults).map((symbol: string) => displaySymbol(symbol.replace("/", "")))));
}

function filterSymbolsByMarketHours(symbols: string[], at: Date) {
  return symbols.filter((symbol) => {
    const asset = classifyAsset(symbol);
    if (asset === "crypto") return true;
    if (asset === "forex") return isForexOpen(at);
    return isWeekday(at);
  });
}

function isWeekday(at: Date) {
  const day = at.getUTCDay();
  return day >= 1 && day <= 5;
}

function isForexOpen(at: Date) {
  return isWeekday(at);
}

function classifyAsset(symbol: string) {
  const clean = normalizeSymbolKey(symbol);
  if (["BTCUSD", "ETHUSD", "SOLUSD", "BNBUSD", "XRPUSD"].includes(clean)) return "crypto";
  if (["XAUUSD", "XAGUSD", "USOIL"].includes(clean)) return "commodities";
  if (["US500", "US30", "NAS100"].includes(clean)) return "indices";
  return "forex";
}

function marketSession(at: Date) {
  const hour = at.getUTCHours();
  if (hour < 7) return "Asian Session";
  if (hour < 12) return "London Session";
  if (hour < 16) return "London/New York Overlap";
  if (hour < 21) return "New York Session";
  return "After Hours";
}

function strategyMatchesSymbol(strategy: any, display: string, raw: string) {
  const assets = strategy.assets || [];
  if (assets.length === 0) return true;
  return assets.some((asset: string) => normalizeSymbolKey(asset) === normalizeSymbolKey(display) || normalizeSymbolKey(asset) === normalizeSymbolKey(raw));
}

function calculateIndicators(candles: number[], mid: number) {
  const calcEMA = (prices: number[], period: number) => {
    const k = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < prices.length; i++) ema = prices[i] * k + ema * (1 - k);
    return ema;
  };
  let gains = 0, losses = 0;
  for (let i = candles.length - 14; i < candles.length; i++) {
    const diff = candles[i] - candles[i - 1];
    if (diff > 0) gains += diff; else losses -= diff;
  }
  const rsi = losses === 0 ? 100 : 100 - (100 / (1 + gains / losses));
  const emaShort = calcEMA(candles, 12);
  const emaLong = calcEMA(candles, 26);
  const macdValue = emaShort - emaLong;
  const macdLine = candles.slice(-9).map((_, i) => {
    const slice = candles.slice(0, candles.length - 8 + i);
    return calcEMA(slice, 12) - calcEMA(slice, 26);
  });
  const macdSignal = macdLine.reduce((a, b) => a + b, 0) / macdLine.length;
  let atrSum = 0, plusDM = 0, minusDM = 0;
  for (let i = candles.length - 14; i < candles.length; i++) {
    const diff = candles[i] - candles[i - 1];
    atrSum += Math.abs(diff);
    if (diff > 0) plusDM += diff; else minusDM -= diff;
  }
  const atr = atrSum / 14;
  const tr14 = atr * 14;
  const plusDI = tr14 > 0 ? (plusDM / tr14) * 100 : 0;
  const minusDI = tr14 > 0 ? (minusDM / tr14) * 100 : 0;
  const adx = plusDI + minusDI > 0 ? Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100 : 0;
  const stochPeriod = candles.slice(-14);
  const low = Math.min(...stochPeriod);
  const high = Math.max(...stochPeriod);
  const stochK = high !== low ? ((mid - low) / (high - low)) * 100 : 50;
  const stochD = candles.slice(-3).reduce((sum, p) => sum + (high > low ? ((p - low) / (high - low)) * 100 : 50), 0) / 3;
  return { rsi, ema_short: emaShort, ema_long: emaLong, macd: { value: macdValue, signal: macdSignal, histogram: macdValue - macdSignal }, atr, adx, stochastic: { k: stochK, d: stochD } };
}

function evaluateModel(model: any, indicators: any, riskProfile: string) {
  const importance = model?.params?.feature_importance || {};
  const weights = { RSI: Number(importance.RSI ?? 0.22), MACD: Number(importance.MACD ?? 0.24), EMA: Number(importance.EMA ?? 0.18), Stochastic: Number(importance.Stochastic ?? 0.12) };
  const rsiScore = indicators.rsi < 50 ? (50 - indicators.rsi) / 50 : -((indicators.rsi - 50) / 50);
  const macdBase = Math.abs(indicators.macd.signal) || Math.abs(indicators.macd.value) || 0.00001;
  const macdScore = Math.max(-1, Math.min(1, (indicators.macd.value - indicators.macd.signal) / macdBase));
  const emaScore = Math.max(-1, Math.min(1, ((indicators.ema_short - indicators.ema_long) / (Math.abs(indicators.ema_long) || 1)) * 1000));
  const stochScore = indicators.stochastic.k < 50 ? (50 - indicators.stochastic.k) / 50 : -((indicators.stochastic.k - 50) / 50);
  const totalWeight = weights.RSI + weights.MACD + weights.EMA + weights.Stochastic;
  const rawScore = totalWeight > 0 ? (rsiScore * weights.RSI + macdScore * weights.MACD + emaScore * weights.EMA + stochScore * weights.Stochastic) / totalWeight : 0;
  const confidence = Math.min(0.99, 0.48 + Math.abs(rawScore) * 0.28 + Math.max(0.5, Number(model?.accuracy || 0.5)) * 0.24 + Math.min(indicators.adx / 100, 0.06));
  const threshold = riskProfile === "low" ? 0.62 : riskProfile === "high" ? 0.54 : 0.57;
  return { shouldSignal: confidence >= threshold && Math.abs(rawScore) >= 0.025, type: rawScore >= 0 ? "BUY" as SignalSide : "SELL" as SignalSide, confidence, rawScore };
}

function decideSignal(strategy: any, indicators: any, modelVote: any, aiPred: any, aiSolo: boolean) {
  if (aiSolo && aiPred) return { shouldSignal: Number(aiPred.confidence || 0) >= 0.58, type: aiPred.direction === "down" ? "SELL" as SignalSide : "BUY" as SignalSide, confidence: Number(aiPred.confidence || 0.6) };
  if (modelVote?.shouldSignal) return modelVote;

  const selected = strategy.indicators?.length ? strategy.indicators.map((i: string) => i.toLowerCase()) : ["rsi", "macd", "ema", "adx", "stochastic"];
  const enabled = (key: string) => selected.some((item: string) => item.includes(key));
  const bullish = [enabled("rsi") ? indicators.rsi < 40 : null, enabled("macd") ? indicators.macd.value > indicators.macd.signal : null, enabled("ema") ? indicators.ema_short > indicators.ema_long : null, enabled("adx") ? indicators.adx > 20 : null, enabled("stochastic") ? indicators.stochastic.k < 25 && indicators.stochastic.d < 30 : null];
  const bearish = [enabled("rsi") ? indicators.rsi > 60 : null, enabled("macd") ? indicators.macd.value < indicators.macd.signal : null, enabled("ema") ? indicators.ema_short < indicators.ema_long : null, enabled("adx") ? indicators.adx > 20 : null, enabled("stochastic") ? indicators.stochastic.k > 75 && indicators.stochastic.d > 70 : null];
  const enabledCount = bullish.filter(v => v !== null).length || 1;
  const bullishVotes = bullish.filter(Boolean).length;
  const bearishVotes = bearish.filter(Boolean).length;
  const strongest = Math.max(bullishVotes, bearishVotes);
  const risk = String(strategy.risk_profile || "medium").toLowerCase();
  const threshold = risk === "low" ? Math.min(enabledCount, 3) : risk === "high" ? 1 : Math.min(enabledCount, 2);
  return { shouldSignal: strongest >= threshold, type: bullishVotes >= bearishVotes ? "BUY" as SignalSide : "SELL" as SignalSide, confidence: 0.55 + (strongest / enabledCount) * 0.25 + Math.min(indicators.adx / 100, 0.15) };
}

async function getMarketAdvice(supabaseUrl: string, anonKey: string, quotes: any, strategies: any[], models: any[], aiSolo: any, timeline: TimelineEvent[]) {
  try {
    const data = await invokeFunction(supabaseUrl, anonKey, "ml-predictions", { type: "market-prediction", quotes, symbols: Object.keys(quotes), strategyIds: strategies.map((s: any) => s.id), modelIds: models.map((m: any) => m.id), aiSolo: Boolean(aiSolo), currentTimeUtc: nowIso(), marketSession: marketSession(new Date()) });
    const predictions = Array.isArray(data?.predictions) ? data.predictions : [];
    timeline.push({ stage: "ai_advice", status: "success", at: nowIso(), message: `AI reviewed current market condition for ${predictions.length || Object.keys(quotes).length} symbols` });
    return predictions;
  } catch (error) {
    timeline.push({ stage: "ai_advice", status: "failed", at: nowIso(), message: error instanceof Error ? error.message : "AI advice unavailable" });
    return [];
  }
}

async function sendTelegram(supabaseUrl: string, anonKey: string, signal: any) {
  return invokeFunction(supabaseUrl, anonKey, "send-notification", {
    type: "trade_alert",
    symbol: signal.symbol,
    action: signal.type,
    price: signal.price,
    strategy: signal.strategy,
    confidence: signal.confidence,
    stopLoss: signal.stopLoss,
    takeProfit: signal.takeProfit,
    extraMessage: `\n\n🧠 Model: ${signal.modelUsed}\n🕒 Market time UTC: ${signal.calculations.market_time_utc}\n📍 Session: ${signal.calculations.market_session}`,
  });
}

async function executeTrade(supabaseUrl: string, anonKey: string, serviceKey: string, userId: string, signal: any) {
  return invokeFunction(supabaseUrl, anonKey, "execute-trade", {
    symbol: signal.symbol,
    type: signal.type,
    price: signal.price,
    lotSize: 0.01,
    stopLoss: signal.stopLoss,
    takeProfit: signal.takeProfit,
    forceMainBroker: true,
    strategyId: signal.strategyId,
    modelId: signal.modelId,
    indicators: signal.indicators,
    calculations: signal.calculations,
    modelUsed: signal.modelUsed,
    assetClass: signal.assetClass,
  }, { "x-internal-user-id": userId, "x-trading-bot-secret": serviceKey });
}

async function invokeFunction(supabaseUrl: string, anonKey: string, name: string, body: Record<string, unknown>, extraHeaders: Record<string, string> = {}) {
  const response = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": anonKey, "Authorization": `Bearer ${anonKey}`, ...extraHeaders },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(data?.error || data?.message || `${name} failed with ${response.status}`);
  return data;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}