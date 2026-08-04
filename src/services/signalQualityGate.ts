/**
 * Axion AI — Signal Quality Gate & Trade Optimizer
 *
 * Sits between the model/ensemble decision and signal publication:
 *   Ensemble Evaluation -> Decision Engine -> [Risk Analysis -> Trade Optimization -> Quality Gate]
 *
 * Every number that reaches the user (confidence, RR, SL/TP, size) is produced
 * here from the same feature set, so nothing is disconnected.
 */

export interface QualityInput {
  symbol: string;
  assetClass: 'forex' | 'crypto' | 'commodities' | 'indices' | string;
  type: 'BUY' | 'SELL';
  price: number;
  bid: number;
  ask: number;
  candles: number[];
  atr: number;
  adx: number;
  rsi: number;
  macdValue: number;
  macdSignal: number;
  emaShort: number;
  emaLong: number;
  stochK: number;
  /** 0..1 raw confidence coming out of the decision engine. */
  baseConfidence: number;
  /** Fraction of active decision sources agreeing with `type` (0..1). */
  modelAgreement: number;
  /** Historical win-rate of the model/strategy used (0..1), when known. */
  historicalWinRate?: number | null;
  /** Detected market regime from the decision engine. */
  regime: string;
  at?: Date;
}

export interface QualityFactor {
  name: string;
  score: number;   // 0..1
  weight: number;  // relative weight
  detail: string;
}

export interface OptimizedTrade {
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  slDistance: number;
  tpDistance: number;
  riskReward: number;
  /** Suggested risk as a fraction of account equity. */
  riskFraction: number;
  timingNote: string;
}

export interface QualityVerdict {
  passed: boolean;
  /** Blended 0..1 quality score. */
  score: number;
  /** Confidence after quality weighting — this is the number shown to users. */
  confidence: number;
  factors: QualityFactor[];
  rejections: string[];
  session: string;
  optimized: OptimizedTrade;
}

const MIN_QUALITY_SCORE = 0.58;
const MIN_CONFIDENCE = 0.62;
const MIN_RR = 1.5;

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

/** Trading session in UTC — drives spread/liquidity expectations for FX. */
export function currentSession(at: Date): string {
  const h = at.getUTCHours();
  const day = at.getUTCDay();
  if (day === 0 || day === 6) return 'weekend';
  if (h >= 12 && h < 17) return 'london_newyork_overlap';
  if (h >= 7 && h < 16) return 'london';
  if (h >= 13 && h < 21) return 'new_york';
  if (h >= 0 && h < 9) return 'asian';
  return 'off_session';
}

function sessionScore(assetClass: string, session: string): number {
  if (assetClass === 'crypto') return session === 'weekend' ? 0.7 : 0.85;
  switch (session) {
    case 'london_newyork_overlap': return 1;
    case 'london': return 0.9;
    case 'new_york': return 0.85;
    case 'asian': return 0.55;
    case 'weekend': return 0;
    default: return 0.4;
  }
}

/** Nearest swing high/low from the recent candle window. */
function marketStructure(candles: number[], price: number, type: 'BUY' | 'SELL') {
  const window = candles.slice(-60);
  if (window.length < 10) return { headroom: 0, detail: 'insufficient history' };
  const high = Math.max(...window);
  const low = Math.min(...window);
  const range = high - low;
  if (range <= 0) return { headroom: 0, detail: 'flat range' };
  const headroom = type === 'BUY' ? (high - price) / range : (price - low) / range;
  return {
    headroom: clamp01(headroom),
    detail: `${(headroom * 100).toFixed(0)}% of the 60-bar range left toward ${type === 'BUY' ? 'resistance' : 'support'}`,
  };
}

function momentumScore(input: QualityInput): number {
  const macdAligned = input.type === 'BUY'
    ? input.macdValue > input.macdSignal
    : input.macdValue < input.macdSignal;
  const emaAligned = input.type === 'BUY' ? input.emaShort > input.emaLong : input.emaShort < input.emaLong;
  // Penalise chasing an already-exhausted move.
  const exhausted = input.type === 'BUY' ? input.rsi > 78 || input.stochK > 92
    : input.rsi < 22 || input.stochK < 8;
  let s = 0.3 + (macdAligned ? 0.35 : 0) + (emaAligned ? 0.35 : 0);
  if (exhausted) s -= 0.35;
  return clamp01(s);
}

function volatilityScore(atr: number, price: number, assetClass: string): { score: number; pct: number } {
  const pct = price > 0 ? atr / price : 0;
  // Sweet spot bands: enough movement to pay for the spread, not so much that stops are noise.
  const [lo, hi] = assetClass === 'crypto' ? [0.002, 0.045] : [0.0004, 0.012];
  if (pct <= 0) return { score: 0, pct };
  if (pct < lo) return { score: clamp01(pct / lo) * 0.6, pct };
  if (pct > hi) return { score: clamp01(hi / pct) * 0.7, pct };
  return { score: 1, pct };
}

function spreadScore(bid: number, ask: number, atr: number): { score: number; ratio: number } {
  const spread = Math.max(ask - bid, 0);
  if (atr <= 0) return { score: 0.5, ratio: 0 };
  const ratio = spread / atr;                 // spread as a share of one ATR
  if (ratio <= 0.05) return { score: 1, ratio };
  if (ratio >= 0.35) return { score: 0, ratio };
  return { score: clamp01(1 - (ratio - 0.05) / 0.3), ratio };
}

/**
 * Trade optimization: ATR-anchored stop widened for spread, TP targeted at the
 * next structural level but never below the minimum RR.
 */
export function optimizeTrade(input: QualityInput, session: string): OptimizedTrade {
  const { atr, price, type, assetClass } = input;
  const spread = Math.max(input.ask - input.bid, 0);
  const window = input.candles.slice(-60);
  const high = window.length ? Math.max(...window) : price;
  const low = window.length ? Math.min(...window) : price;

  // Wider stops in high-ADX trends, tighter in ranges; always clear of the spread.
  const trendFactor = input.adx >= 25 ? 1.8 : input.adx <= 15 ? 1.2 : 1.5;
  const slDistance = Math.max(atr * trendFactor + spread, price * (assetClass === 'crypto' ? 0.0015 : 0.0003));

  // Target the next structural level, capped so RR stays sane.
  const structureTarget = type === 'BUY' ? high - spread : low + spread;
  const structureDistance = Math.abs(structureTarget - price);
  const baseTp = atr * (input.adx >= 25 ? 3 : 2.2);
  const tpDistance = Math.max(slDistance * MIN_RR, Math.min(baseTp, structureDistance > 0 ? structureDistance : baseTp));

  const riskReward = slDistance > 0 ? tpDistance / slDistance : 0;

  // Risk exposure: 1% baseline, scaled by conviction and cut in thin sessions.
  const conviction = clamp01(input.baseConfidence * 0.6 + input.modelAgreement * 0.4);
  const sessionCut = session === 'asian' || session === 'off_session' ? 0.6 : 1;
  const riskFraction = Number((0.005 + 0.01 * conviction).toFixed(4)) * sessionCut;

  return {
    entry: price,
    stopLoss: type === 'BUY' ? price - slDistance : price + slDistance,
    takeProfit1: type === 'BUY' ? price + tpDistance : price - tpDistance,
    takeProfit2: type === 'BUY' ? price + tpDistance * 1.6 : price - tpDistance * 1.6,
    slDistance,
    tpDistance,
    riskReward,
    riskFraction,
    timingNote: sessionCut < 1
      ? `Thin ${session} liquidity — risk reduced 40%.`
      : `Executing inside ${session} liquidity.`,
  };
}

/** Full risk analysis + optimization + quality gate for one candidate signal. */
export function evaluateSignalQuality(input: QualityInput): QualityVerdict {
  const at = input.at ?? new Date();
  const session = currentSession(at);
  const optimized = optimizeTrade(input, session);

  const trend = clamp01((input.adx - 10) / 30);
  const vol = volatilityScore(input.atr, input.price, input.assetClass);
  const mom = momentumScore(input);
  const structure = marketStructure(input.candles, input.price, input.type);
  const spread = spreadScore(input.bid, input.ask, input.atr);
  const sess = sessionScore(input.assetClass, session);
  const rrScore = clamp01((optimized.riskReward - 1) / 2);
  const agreement = clamp01(input.modelAgreement);
  const history = input.historicalWinRate == null ? 0.5 : clamp01(input.historicalWinRate);
  const regimeAligned = /trending/.test(input.regime)
    ? (input.type === 'BUY') === input.regime.endsWith('up')
    : true;

  const factors: QualityFactor[] = [
    { name: 'trend_strength', score: trend, weight: 1.2, detail: `ADX ${input.adx.toFixed(1)}` },
    { name: 'volatility', score: vol.score, weight: 1.1, detail: `ATR ${(vol.pct * 100).toFixed(2)}% of price` },
    { name: 'momentum', score: mom, weight: 1.2, detail: `RSI ${input.rsi.toFixed(1)}, MACD ${(input.macdValue - input.macdSignal).toFixed(5)}` },
    { name: 'market_structure', score: structure.headroom, weight: 1.0, detail: structure.detail },
    { name: 'liquidity_session', score: sess, weight: 1.0, detail: session },
    { name: 'spread_cost', score: spread.score, weight: 1.1, detail: `spread is ${(spread.ratio * 100).toFixed(1)}% of ATR` },
    { name: 'risk_reward', score: rrScore, weight: 1.3, detail: `RR ${optimized.riskReward.toFixed(2)}` },
    { name: 'model_agreement', score: agreement, weight: 1.4, detail: `${(agreement * 100).toFixed(0)}% of sources agree` },
    { name: 'historical_performance', score: history, weight: 0.9, detail: input.historicalWinRate == null ? 'no track record yet (neutral 0.5)' : `${(history * 100).toFixed(0)}% win rate` },
    { name: 'regime_alignment', score: regimeAligned ? 1 : 0.25, weight: 1.0, detail: `${input.regime} vs ${input.type}` },
  ];

  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  const score = factors.reduce((s, f) => s + f.score * f.weight, 0) / totalWeight;

  // Confidence is the decision-engine probability *conditioned* on quality —
  // it can never exceed what the evidence supports.
  const confidence = clamp01(input.baseConfidence * (0.55 + 0.45 * score));

  const rejections: string[] = [];
  if (session === 'weekend' && input.assetClass !== 'crypto') rejections.push('Market closed for this asset class.');
  if (spread.score <= 0) rejections.push(`Spread too wide (${(spread.ratio * 100).toFixed(0)}% of ATR) — execution cost eats the edge.`);
  if (optimized.riskReward < MIN_RR) rejections.push(`Risk/reward ${optimized.riskReward.toFixed(2)} is below the ${MIN_RR} minimum.`);
  if (vol.score < 0.25) rejections.push('Volatility outside the tradeable band for this asset.');
  if (!regimeAligned) rejections.push(`Direction fights the detected ${input.regime} regime.`);
  if (structure.headroom < 0.15) rejections.push('Price is already parked at the structural level it would target.');
  if (agreement < 0.5) rejections.push('Insufficient model agreement.');
  if (score < MIN_QUALITY_SCORE) rejections.push(`Composite quality ${(score * 100).toFixed(0)}% is below the ${MIN_QUALITY_SCORE * 100}% gate.`);
  if (confidence < MIN_CONFIDENCE) rejections.push(`Quality-adjusted confidence ${(confidence * 100).toFixed(0)}% is below the ${MIN_CONFIDENCE * 100}% gate.`);

  return { passed: rejections.length === 0, score, confidence, factors, rejections, session, optimized };
}

export const QUALITY_THRESHOLDS = { MIN_QUALITY_SCORE, MIN_CONFIDENCE, MIN_RR };
