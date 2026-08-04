/**
 * Unified Signal Service
 * 
 * Single pipeline: Generate Signal → Send 30s Telegram Warning → Send Telegram Signal → Execute on Broker
 * Records all trades with full indicator details. Sends daily summary at end of day.
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { fetchMainBrokerAccount, formatBrokerAccountName } from './brokerAccountSelection';

export interface UnifiedSignal {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  price: number;
  stopLoss?: number;
  takeProfit1?: number;
  takeProfit2?: number;
  strategy: string;
  confidence: number;
  time: string;
  status: 'new' | 'warning_sent' | 'sent_telegram' | 'executing' | 'executed' | 'failed';
  indicators?: {
    rsi?: number;
    macd?: { value: number; signal: number; histogram: number };
    ema_short?: number;
    ema_long?: number;
    bollinger?: { upper: number; middle: number; lower: number };
    atr?: number;
    stochastic?: { k: number; d: number };
    adx?: number;
    volume_sma?: number;
  };
  calculations?: Record<string, any>;
  modelUsed?: string;
  modelId?: string;
  modelVersion?: string;
  assetClass?: string;
  strategyId?: string;
  signalReasoning?: {
    market_regime: string;
    strategy_chosen: string;
    why_entry: string;
    why_sl: string;
    why_tp: string;
    confidence_breakdown: Record<string, any>;
    features: Record<string, any>;
  };
}

// Global state
let signalLoopInterval: number | null = null;
let dailySummaryTimeout: number | null = null;
let telegramEnabled = false;
let botEnabled = false;
const signalListeners = new Set<(signals: UnifiedSignal[]) => void>();
let latestSignals: UnifiedSignal[] = [];
let dailyTrades: { symbol: string; type: string; profit?: number; status: string }[] = [];

// Load persisted states
try {
  telegramEnabled = localStorage.getItem('telegramBotActive') !== 'false';
  botEnabled = localStorage.getItem('tradingBotRunning') !== 'false';
} catch {}

export function getTelegramEnabled() { return telegramEnabled; }
export function getBotEnabled() { return botEnabled; }
export function getLatestSignals() { return latestSignals; }

export function setTelegramEnabled(enabled: boolean) {
  telegramEnabled = enabled;
  localStorage.setItem('telegramBotActive', String(enabled));
  syncTradingBotSettings();
  ensureSignalLoop();
}

export function setBotEnabled(enabled: boolean) {
  botEnabled = enabled;
  localStorage.setItem('tradingBotRunning', String(enabled));
  syncTradingBotSettings();
  ensureSignalLoop();
}

export async function syncTradingBotSettings() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await (supabase as any).from('trading_bot_settings').upsert({
      user_id: user.id,
      bot_enabled: botEnabled,
      telegram_enabled: telegramEnabled,
      interval_seconds: 60,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  } catch (error) {
    console.error('Failed to sync trading bot settings:', error);
  }
}

function isMarketOpenForSymbol(symbol: string, at: Date) {
  const clean = symbol.replace('/', '').toUpperCase();
  const day = at.getUTCDay();
  const isWeekday = day >= 1 && day <= 5;
  if (['BTCUSD', 'ETHUSD', 'SOLUSD', 'BNBUSD', 'XRPUSD'].includes(clean)) return true;
  if (clean.length === 6) return isWeekday;
  return isWeekday;
}

export function onSignalsUpdate(listener: (signals: UnifiedSignal[]) => void) {
  signalListeners.add(listener);
  return () => { signalListeners.delete(listener); };
}

function notifyListeners() {
  signalListeners.forEach(fn => fn(latestSignals));
}

export function ensureSignalLoop() {
  const shouldRun = telegramEnabled || botEnabled;
  
  if (shouldRun && !signalLoopInterval) {
    runSignalCycle();
    signalLoopInterval = window.setInterval(runSignalCycle, 60000);
    scheduleDailySummary();
  } else if (!shouldRun && signalLoopInterval) {
    window.clearInterval(signalLoopInterval);
    signalLoopInterval = null;
    if (dailySummaryTimeout) {
      window.clearTimeout(dailySummaryTimeout);
      dailySummaryTimeout = null;
    }
  }
}

type ModelVote = {
  shouldSignal: boolean;
  type: 'BUY' | 'SELL';
  confidence: number;
  rawScore: number;
};

function evaluateTrainedModelSignal(model: any, indicators: {
  rsi: number;
  macdValue: number;
  macdSignal: number;
  emaShort: number;
  emaLong: number;
  adx: number;
  stochK: number;
  stochD: number;
}, riskProfile: string): ModelVote {
  const importance = model?.params?.feature_importance || {};
  const weights = {
    RSI: Number(importance.RSI ?? importance.rsi ?? 0.22),
    MACD: Number(importance.MACD ?? importance.macd ?? 0.24),
    EMA: Number(importance.EMA ?? importance.ema ?? 0.18),
    ADX: Number(importance.ADX ?? importance.adx ?? 0.14),
    Stochastic: Number(importance.Stochastic ?? importance.stochastic ?? 0.12),
  };

  const rsiScore = indicators.rsi < 50 ? (50 - indicators.rsi) / 50 : -((indicators.rsi - 50) / 50);
  const macdBase = Math.abs(indicators.macdSignal) || Math.abs(indicators.macdValue) || 0.00001;
  const macdScore = Math.max(-1, Math.min(1, (indicators.macdValue - indicators.macdSignal) / macdBase));
  const emaBase = Math.abs(indicators.emaLong) || 1;
  const emaScore = Math.max(-1, Math.min(1, ((indicators.emaShort - indicators.emaLong) / emaBase) * 1000));
  const stochScore = indicators.stochK < 50 ? (50 - indicators.stochK) / 50 : -((indicators.stochK - 50) / 50);
  const trendStrength = Math.max(0.25, Math.min(1.25, indicators.adx / 25));

  const weightedScore =
    rsiScore * weights.RSI +
    macdScore * weights.MACD +
    emaScore * weights.EMA * trendStrength +
    stochScore * weights.Stochastic;
  const totalWeight = weights.RSI + weights.MACD + weights.EMA + weights.Stochastic;
  const rawScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
  const edge = Math.abs(rawScore);
  const accuracy = Math.max(0.5, Number(model?.accuracy || 0.5));
  const confidence = Math.min(0.99, 0.48 + edge * 0.28 + accuracy * 0.24 + Math.min(indicators.adx / 100, 0.06));
  const threshold = riskProfile === 'low' ? 0.62 : riskProfile === 'high' ? 0.54 : 0.57;

  return {
    shouldSignal: confidence >= threshold && edge >= 0.025,
    type: rawScore >= 0 ? 'BUY' : 'SELL',
    confidence,
    rawScore,
  };
}

function scheduleDailySummary() {
  if (dailySummaryTimeout) window.clearTimeout(dailySummaryTimeout);
  
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 0, 0);
  const msUntilEnd = endOfDay.getTime() - now.getTime();
  
  dailySummaryTimeout = window.setTimeout(async () => {
    if (telegramEnabled) {
      await sendDailySummary();
    }
    dailyTrades = [];
    scheduleDailySummary(); // reschedule for next day
  }, Math.max(msUntilEnd, 60000));
}

async function sendDailySummary() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: todayTrades } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

    const trades = todayTrades || [];
    const totalTrades = trades.length;
    const totalPnL = trades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const closedTrades = trades.filter(t => t.status === 'closed');
    const winners = closedTrades.filter(t => (t.profit || 0) > 0).length;
    const winRate = closedTrades.length > 0 ? ((winners / closedTrades.length) * 100).toFixed(1) : '0';
    
    // Most traded assets
    const assetCounts: Record<string, number> = {};
    trades.forEach(t => { assetCounts[t.symbol] = (assetCounts[t.symbol] || 0) + 1; });
    const sortedAssets = Object.entries(assetCounts).sort((a, b) => b[1] - a[1]);
    const topAssets = sortedAssets.slice(0, 3).map(([s, c]) => `${s} (${c})`).join(', ');

    const message = `📊 DAILY TRADING SUMMARY 📊\n\n📅 ${new Date().toLocaleDateString()}\n\n📈 Total Trades: ${totalTrades}\n💰 Total P&L: $${totalPnL.toFixed(2)}\n🎯 Win Rate: ${winRate}%\n✅ Winners: ${winners}\n❌ Losers: ${closedTrades.length - winners}\n🔄 Still Open: ${trades.filter(t => t.status === 'open').length}\n\n📊 Most Traded:\n${topAssets || 'None'}\n\n⏰ Report generated: ${new Date().toLocaleString()}`;

    await supabase.functions.invoke('send-notification', {
      body: { type: 'telegram', message }
    });
  } catch (error) {
    console.error('Failed to send daily summary:', error);
  }
}

export async function runSignalCycle() {
  try {
    const signals = await generateAISignals();
    if (signals.length === 0) return;

    const savedSignals = await saveSignalsToDb(signals);
    savedSignals.forEach((saved, index) => {
      if (saved?.id && signals[index]) signals[index].id = saved.id;
    });

    latestSignals = [...signals, ...latestSignals].slice(0, 50);
    notifyListeners();

    // Fire execution + Telegram in parallel for instantaneous delivery
    await Promise.all(signals.map(async (signal) => {
      const tasks: Promise<any>[] = [];

      if (botEnabled) {
        signal.status = 'executing';
        notifyListeners();
        tasks.push(
          executeOnBroker(signal).then((ok) => {
            signal.status = ok ? 'executed' : 'failed';
            updateSignalExecutionStatus(signal.id, signal.status);
            notifyListeners();
          })
        );
      }

      if (telegramEnabled) {
        tasks.push(
          sendTelegramSignal(signal).then(() => {
            if (!botEnabled) {
              signal.status = 'sent_telegram';
              notifyListeners();
            }
          })
        );
      }

      await Promise.allSettled(tasks);
    }));
  } catch (error) {
    console.error('Signal cycle error:', error);
  }
}

async function generateAISignals(): Promise<UnifiedSignal[]> {
  try {
    const { data: activeStrategies, error: strategyError } = await supabase
      .from('trading_strategies')
      .select('id, name, indicators, risk_profile, ai_auto_select, model_ids, assets, is_active')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(25);

    if (strategyError) throw strategyError;
    if (!activeStrategies?.length) return [];

    const aiSoloActive = activeStrategies.some((strategy) => strategy.ai_auto_select);
    const referencedModelIds = Array.from(
      new Set(activeStrategies.flatMap((strategy) => strategy.model_ids || []))
    );

    const modelResult = aiSoloActive
      ? await supabase
          .from('ml_models')
          .select('id, name, type, accuracy, version, is_active, params')
          .eq('is_active', true)
      : referencedModelIds.length > 0
      ? await supabase
          .from('ml_models')
          .select('id, name, type, accuracy, version, is_active, params')
          .in('id', referencedModelIds)
          .eq('is_active', true)
      : { data: [], error: null };

    if (modelResult.error) throw modelResult.error;

    const modelMap = new Map((modelResult.data || []).map(model => [model.id, model]));

    // Fetch multi-asset market data
    const allSymbols = [
      'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'NZD/USD',
      'BTC/USD', 'ETH/USD', 'XAU/USD', 'US500', 'US30', 'USOIL'
    ].filter(symbol => isMarketOpenForSymbol(symbol, new Date()));
    
    const { data: quotesData, error: quotesError } = await supabase.functions.invoke('fetch-market-quotes', {
      body: { symbols: allSymbols.join(','), candles: true }
    });

    if (quotesError) throw quotesError;
    if (!quotesData?.quotes) return [];

    const quotes = quotesData.quotes;
    const candlesMap = quotesData.candles || {};
    const signals: UnifiedSignal[] = [];
    const now = new Date().toISOString();

    // Use AI for signal analysis - pass strategy/model context so trained models inform predictions
    let aiSignals: any[] = [];
    try {
      const activeModelIds = Array.from(modelMap.keys());
      const { data: aiData } = await supabase.functions.invoke('ml-predictions', {
        body: {
          type: 'market-prediction',
          quotes,
          symbols: Object.keys(quotes),
          strategyIds: activeStrategies.map(s => s.id),
          modelIds: activeModelIds,
        }
      });
      if (aiData?.predictions) aiSignals = aiData.predictions;
    } catch { /* fallback to technical analysis */ }

    const matchesIndicator = (indicators: string[] | null | undefined, keyword: string) =>
      indicators?.some(indicator => indicator.toLowerCase().includes(keyword)) ?? false;

    for (const [symbol, data] of Object.entries(quotes) as [string, any][]) {
      const bid = data.bid || data.price || 0;
      const ask = data.ask || data.price || 0;
      const mid = (bid + ask) / 2;
      if (mid === 0) continue;

      const displaySymbol = symbol.includes('/') ? symbol : (symbol.length === 6 ? symbol.slice(0, 3) + '/' + symbol.slice(3) : symbol);

      const aiSoloStrategy = activeStrategies.find((strategy) => strategy.ai_auto_select);
      const strategiesForSymbol = aiSoloStrategy ? [aiSoloStrategy] : activeStrategies;
      const matchingStrategies = strategiesForSymbol.filter((strategy) => {
        const assets = strategy.assets || [];
        if (assets.length === 0) return true;

        return assets.some((asset: string) => {
          const normalizedAsset = asset.replace('/', '');
          return asset === displaySymbol || normalizedAsset === symbol.replace('/', '');
        });
      });

      if (matchingStrategies.length === 0) continue;

      const normalizedSymbol = symbol.replace('/', '').toUpperCase();
      const candles: number[] = candlesMap[normalizedSymbol] || [];
      if (candles.length < 30) continue;

      // Real RSI calculation
      const rsiPeriod = 14;
      let gains = 0, losses = 0;
      for (let i = candles.length - rsiPeriod; i < candles.length; i++) {
        const diff = candles[i] - candles[i - 1];
        if (diff > 0) gains += diff; else losses -= diff;
      }
      const rs = losses === 0 ? 100 : gains / losses;
      const rsi = 100 - (100 / (1 + rs));

      // Real EMA calculation
      const calcEMA = (prices: number[], period: number) => {
        const k = 2 / (period + 1);
        let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
        for (let i = period; i < prices.length; i++) {
          ema = prices[i] * k + ema * (1 - k);
        }
        return ema;
      };
      const emaShort = calcEMA(candles, 12);
      const emaLong = calcEMA(candles, 26);

      // Real MACD
      const macdValue = emaShort - emaLong;
      const macdLine = candles.slice(-9).map((_, i) => {
        const slice = candles.slice(0, candles.length - 8 + i);
        return calcEMA(slice, 12) - calcEMA(slice, 26);
      });
      const macdSignal = macdLine.reduce((a, b) => a + b, 0) / macdLine.length;

      // Real ATR
      let atrSum = 0;
      for (let i = candles.length - 14; i < candles.length; i++) {
        atrSum += Math.abs(candles[i] - candles[i - 1]);
      }
      const atr = atrSum / 14;

      // Real ADX approximation
      let plusDM = 0, minusDM = 0;
      for (let i = candles.length - 14; i < candles.length; i++) {
        const diff = candles[i] - candles[i - 1];
        if (diff > 0) plusDM += diff; else minusDM -= diff;
      }
      const tr14 = atr * 14;
      const plusDI = tr14 > 0 ? (plusDM / tr14) * 100 : 0;
      const minusDI = tr14 > 0 ? (minusDM / tr14) * 100 : 0;
      const adx = plusDI + minusDI > 0 ? Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100 : 0;

      // Real Stochastic
      const stochPeriod = candles.slice(-14);
      const lowestLow = Math.min(...stochPeriod);
      const highestHigh = Math.max(...stochPeriod);
      const stochK = highestHigh !== lowestLow ? ((mid - lowestLow) / (highestHigh - lowestLow)) * 100 : 50;
      const stochD = candles.slice(-3).reduce((sum, p) => {
        const range = highestHigh - lowestLow;
        return sum + (range > 0 ? ((p - lowestLow) / range) * 100 : 50);
      }, 0) / 3;

      // AI prediction or technical analysis decision
      const aiPred = aiSignals.find((p: any) => p.symbol === symbol || p.symbol === displaySymbol);
      const chosenStrategy = aiSoloStrategy || matchingStrategies[0];
      const selectedIndicators = chosenStrategy.indicators?.length
        ? chosenStrategy.indicators
        : ['RSI', 'MACD', 'EMA', 'ADX', 'Stochastic'];
      const normalizedRisk = String(chosenStrategy.risk_profile || 'medium').toLowerCase();
      const strategyModels = (chosenStrategy.model_ids || [])
        .map((id: string) => modelMap.get(id))
        .filter((m: any) => m)
        .sort((a: any, b: any) => Number(b?.accuracy || 0) - Number(a?.accuracy || 0));
      const bestModel = strategyModels[0];
      const selectedModelId = bestModel?.id;
      const selectedModel = bestModel || null;
      const modelVote = selectedModel
        ? evaluateTrainedModelSignal(selectedModel, { rsi, macdValue, macdSignal, emaShort, emaLong, adx, stochK, stochD }, normalizedRisk)
        : null;

      const bullishConditions = [
        matchesIndicator(selectedIndicators, 'rsi') ? rsi < 40 : null,
        matchesIndicator(selectedIndicators, 'macd') ? macdValue > macdSignal : null,
        (matchesIndicator(selectedIndicators, 'ema') || matchesIndicator(selectedIndicators, 'sma')) ? emaShort > emaLong : null,
        matchesIndicator(selectedIndicators, 'adx') ? adx > 20 : null,
        matchesIndicator(selectedIndicators, 'stochastic') ? stochK < 25 && stochD < 30 : null,
      ];
      const bearishConditions = [
        matchesIndicator(selectedIndicators, 'rsi') ? rsi > 60 : null,
        matchesIndicator(selectedIndicators, 'macd') ? macdValue < macdSignal : null,
        (matchesIndicator(selectedIndicators, 'ema') || matchesIndicator(selectedIndicators, 'sma')) ? emaShort < emaLong : null,
        matchesIndicator(selectedIndicators, 'adx') ? adx > 20 : null,
        matchesIndicator(selectedIndicators, 'stochastic') ? stochK > 75 && stochD > 70 : null,
      ];

      const enabledConditions = bullishConditions.filter(condition => condition !== null).length || 1;
      const bullishVotes = bullishConditions.filter(Boolean).length;
      const bearishVotes = bearishConditions.filter(Boolean).length;
      const voteThreshold = normalizedRisk === 'low'
        ? Math.min(enabledConditions, 3)
        : normalizedRisk === 'high'
          ? 1
          : Math.min(enabledConditions, 2);
      
      let shouldSignal = false;
      let type: 'BUY' | 'SELL' = 'BUY';
      let confidence = 0.6;

      if (modelVote?.shouldSignal) {
        shouldSignal = true;
        type = modelVote.type;
        confidence = modelVote.confidence;
      } else if (chosenStrategy.ai_auto_select && aiPred) {
        shouldSignal = aiPred.confidence > 0.58;
        type = aiPred.direction === 'down' || aiPred.prediction === 'SELL' ? 'SELL' : 'BUY';
        confidence = aiPred.confidence;
      } else {
        const strongestVote = Math.max(bullishVotes, bearishVotes);
        shouldSignal = strongestVote >= voteThreshold;
        type = bullishVotes >= bearishVotes ? 'BUY' : 'SELL';
        confidence = 0.55 + (strongestVote / enabledConditions) * 0.25 + Math.min(adx / 100, 0.15);
      }

      if (shouldSignal && confidence > 0.6) {
        // Weight confidence by trained model accuracy
        if (bestModel?.accuracy) {
          confidence = Math.min(0.99, confidence * 0.6 + Number(bestModel.accuracy) * 0.4);
        }

        // Phase 2: local market-regime classification + fit multiplier
        const volatility = atr / Math.max(mid, 1e-9);
        const regime =
          adx >= 25 ? (emaShort > emaLong ? 'trending_up' : 'trending_down')
          : adx < 15 ? 'ranging'
          : volatility > 0.01 ? 'breakout' : 'choppy';
        const strategyKind = String(chosenStrategy.name || '').toLowerCase();
        const isTrendStrat = /trend|momentum|breakout|smc|ict/.test(strategyKind);
        const isRangeStrat = /reversal|mean|range|scalp|s\/r|support/.test(strategyKind);
        let regimeFit = 1.0;
        if ((regime.startsWith('trending') && isTrendStrat) || (regime === 'ranging' && isRangeStrat)) regimeFit = 1.10;
        else if ((regime.startsWith('trending') && isRangeStrat) || (regime === 'ranging' && isTrendStrat)) regimeFit = 0.85;
        else if (regime === 'choppy') regimeFit = 0.9;
        confidence = Math.min(0.99, confidence * regimeFit);

        // Determine asset class
        let assetClass = 'forex';
        if (['BTC/USD', 'ETH/USD', 'BTCUSD', 'ETHUSD'].includes(symbol)) assetClass = 'crypto';
        else if (['XAU/USD', 'XAUUSD', 'USOIL'].includes(symbol)) assetClass = 'commodities';
        else if (['US500', 'US30'].includes(symbol)) assetClass = 'indices';

        // ---- Risk analysis -> trade optimization -> quality gate ----
        const directionalVotes = type === 'BUY' ? bullishVotes : bearishVotes;
        const sourceCount = enabledConditions + (modelVote ? 1 : 0) + (aiPred ? 1 : 0);
        const agreeingSources = directionalVotes
          + (modelVote?.shouldSignal && modelVote.type === type ? 1 : 0)
          + (aiPred && ((aiPred.direction === 'down' || aiPred.prediction === 'SELL') ? 'SELL' : 'BUY') === type ? 1 : 0);

        const verdict = evaluateSignalQuality({
          symbol: displaySymbol,
          assetClass,
          type,
          price: mid,
          bid,
          ask,
          candles,
          atr,
          adx,
          rsi,
          macdValue,
          macdSignal,
          emaShort,
          emaLong,
          stochK,
          baseConfidence: confidence,
          modelAgreement: sourceCount > 0 ? agreeingSources / sourceCount : 0,
          historicalWinRate: bestModel?.accuracy != null ? Number(bestModel.accuracy) : null,
          regime,
        });

        if (!verdict.passed) {
          console.info('[quality-gate] rejected', displaySymbol, type, verdict.rejections);
          rejectedSignals.push({ symbol: displaySymbol, type, reasons: verdict.rejections, score: verdict.score });
          continue;
        }

        const opt = verdict.optimized;
        confidence = verdict.confidence;

        signals.push({
          id: `sig-${Date.now()}-${symbol.replace(/\//g, '')}`,
          symbol: displaySymbol,
          type,
          price: opt.entry,
          stopLoss: opt.stopLoss,
          takeProfit1: opt.takeProfit1,
          takeProfit2: opt.takeProfit2,
          strategy: chosenStrategy.name,
          strategyId: chosenStrategy.id,
          confidence,
          time: now,
          status: 'new',
          assetClass,
          modelId: selectedModelId,
          modelVersion: selectedModel?.version,
          modelUsed: selectedModel ? `${selectedModel.name} · ${selectedModel.type}` : (chosenStrategy.ai_auto_select ? 'AI Auto-Selection' : 'Technical Indicators'),
          indicators: {
            rsi,
            macd: { value: macdValue, signal: macdSignal, histogram: macdValue - macdSignal },
            ema_short: emaShort,
            ema_long: emaLong,
            atr,
            adx,
            stochastic: { k: stochK, d: stochD },
          },
          calculations: {
            spread: ask - bid,
            mid_price: mid,
            sl_distance: opt.slDistance,
            tp_distance: opt.tpDistance,
            risk_reward_ratio: opt.riskReward.toFixed(2),
            risk_fraction: opt.riskFraction,
            pip_value: symbol.includes('JPY') ? 0.01 : 0.0001,
            model_edge: modelVote?.rawScore,
            quality_score: Number(verdict.score.toFixed(4)),
            session: verdict.session,
            execution_timing: opt.timingNote,
          },
          signalReasoning: {
            market_regime: regime,
            strategy_chosen: chosenStrategy.name,
            why_entry: `${type} on ${displaySymbol}: ${modelVote?.shouldSignal ? 'model vote' : chosenStrategy.ai_auto_select && aiPred ? 'AI predictor' : `${directionalVotes}/${enabledConditions} indicator votes`}, ADX ${adx.toFixed(1)}, regime ${regime} (fit ×${regimeFit.toFixed(2)}), quality ${(verdict.score * 100).toFixed(0)}%`,
            why_sl: `ATR-anchored stop widened for spread (${opt.slDistance.toFixed(5)})`,
            why_tp: `Next structural level at ${opt.tpDistance.toFixed(5)}, RR ${opt.riskReward.toFixed(2)}`,
            confidence_breakdown: {
              base: Number((confidence / Math.max(verdict.score, 1e-6)).toFixed(4)),
              regime_fit: regimeFit,
              quality_score: verdict.score,
              final: confidence,
              model_accuracy: bestModel?.accuracy ?? null,
              factors: verdict.factors,
            },
            features: { rsi, adx, atr, volatility, ema_short: emaShort, ema_long: emaLong, macd: macdValue, macd_signal: macdSignal, stoch_k: stochK, stoch_d: stochD },
          },
        });
      }

    }

    // Rank by confidence and return top-N (quality over quantity)
    return signals.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  } catch (error) {
    console.error('Error generating AI signals:', error);
    return [];
  }
}

async function sendTelegramRiskWarning(signal: UnifiedSignal) {
  try {
    const indicatorSummary = signal.indicators
      ? `RSI: ${signal.indicators.rsi?.toFixed(1)} | ADX: ${signal.indicators.adx?.toFixed(1)} | ATR: ${signal.indicators.atr?.toFixed(5)}`
      : 'N/A';

    await supabase.functions.invoke('send-notification', {
      body: {
        type: 'telegram',
        message: `⚠️ RISK WARNING ⚠️\n\nA ${signal.type} signal for ${signal.symbol} will be sent in 30 seconds.\n\n📊 Indicators: ${indicatorSummary}\n🎯 Confidence: ${(signal.confidence * 100).toFixed(1)}%\n\n🔴 Trading involves significant risk of loss.\n🔴 Only trade with capital you can afford to lose.\n🔴 Past performance is not indicative of future results.\n🔴 Never risk more than 1-2% of your account per trade.\n\n⏳ Signal arriving in 30 seconds...`
      }
    });
  } catch (error) {
    console.error('Failed to send risk warning:', error);
  }
}

async function sendTelegramSignal(signal: UnifiedSignal) {
  try {
    const indicators = signal.indicators;
    let indicatorText = '';
    if (indicators) {
      indicatorText = `\n\n📐 Technical Analysis:\n` +
        `• RSI: ${indicators.rsi?.toFixed(1)}\n` +
        `• MACD: ${indicators.macd?.value?.toFixed(6)} (Signal: ${indicators.macd?.signal?.toFixed(6)})\n` +
        `• EMA Short: ${indicators.ema_short?.toFixed(5)}\n` +
        `• EMA Long: ${indicators.ema_long?.toFixed(5)}\n` +
        `• ADX: ${indicators.adx?.toFixed(1)}\n` +
        `• ATR: ${indicators.atr?.toFixed(5)}`;
    }

    const calcText = signal.calculations 
      ? `\n\n📏 Calculations:\n• R:R Ratio: ${signal.calculations.risk_reward_ratio}\n• Spread: ${signal.calculations.spread?.toFixed(5)}\n• SL Distance: ${signal.calculations.sl_distance?.toFixed(5)}`
      : '';

    await supabase.functions.invoke('send-notification', {
      body: {
        type: 'trade_alert',
        symbol: signal.symbol,
        action: signal.type,
        price: signal.price,
        strategy: signal.strategy,
        confidence: signal.confidence,
        stopLoss: signal.stopLoss,
        takeProfit: signal.takeProfit1,
        extraMessage: indicatorText + calcText,
      }
    });
  } catch (error) {
    console.error('Failed to send telegram signal:', error);
  }
}

async function executeOnBroker(signal: UnifiedSignal): Promise<boolean> {
  try {
    // Verify user is authenticated before attempting broker queries
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('User not authenticated, cannot execute on broker');
      toast.error('Authentication required for trade execution');
      return false;
    }

    const account = await fetchMainBrokerAccount();

    if (!account) {
      console.log('No active main broker account to execute on');
      return false;
    }

    try {
      const { data: result, error: execError } = await supabase.functions.invoke('execute-trade', {
        body: {
          symbol: signal.symbol,
          type: signal.type,
          price: signal.price,
          lotSize: 0.01,
          stopLoss: signal.stopLoss,
          takeProfit: signal.takeProfit1,
          brokerAccountId: account.id,
          strategyId: signal.strategyId || null,
          modelId: signal.modelId || null,
          modelVersion: signal.modelVersion || null,
          indicators: signal.indicators,
          calculations: signal.calculations,
          modelUsed: signal.modelUsed,
          assetClass: signal.assetClass,
        }
      });
      
      if (execError || !result?.success) {
        console.error(`Failed on ${account.account_name}:`, execError || result?.error);
        toast.error(`Failed on ${formatBrokerAccountName(account)}: ${result?.error || execError?.message || 'Unknown error'}`);
        return false;
      }

      toast.success(`Trade executed on ${formatBrokerAccountName(account)}: ${signal.type} ${signal.symbol}`);
      dailyTrades.push({ symbol: signal.symbol, type: signal.type, status: 'executed' });
      return true;
    } catch (execError) {
      console.error(`Failed on ${account.account_name}:`, execError);
      return false;
    }
  } catch (error) {
    console.error('Broker execution error:', error);
    return false;
  }
}

async function updateSignalExecutionStatus(signalId: string, status: UnifiedSignal['status']) {
  if (!signalId || signalId.startsWith('sig-')) return;
  try {
    await supabase
      .from('trading_signals')
      .update({ status, is_active: status !== 'executed' })
      .eq('id', signalId);
  } catch (error) {
    console.error('Failed to update signal status:', error);
  }
}

async function saveSignalsToDb(signals: UnifiedSignal[]) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const inserts = signals.map(s => ({
      user_id: user.id,
      symbol: s.symbol,
      signal_type: s.type.toLowerCase() as 'buy' | 'sell',
      entry_price: s.price,
      stop_loss: s.stopLoss,
      target_price: s.takeProfit1,
      confidence: s.confidence,
      strategy_id: s.strategyId || null,
      model_id: s.modelId || null,
        model_version: s.modelVersion || null,
      timeframe: '1h',
      is_active: s.status !== 'executed',
      status: s.status,
    }));

    const { data, error } = await supabase.from('trading_signals').insert(inserts).select('id');
    if (error) throw error;
    const reasoningRows = (data || [])
      .map((saved, index) => {
        const reasoning = signals[index]?.signalReasoning;
        return saved?.id && reasoning ? { signal_id: saved.id, ...reasoning } : null;
      })
      .filter(Boolean);
    if (reasoningRows.length > 0) {
      const { error: reasoningError } = await supabase.from('signal_reasoning').insert(reasoningRows as any);
      if (reasoningError) console.warn('signal_reasoning insert failed', reasoningError.message);
    }
    return data || [];
  } catch (error) {
    console.error('Failed to save signals:', error);
    return [];
  }
}

// Initialize on load
ensureSignalLoop();
