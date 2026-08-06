/**
 * Axion AI — specialist models.
 *
 * Two families:
 *  1. Statistical specialists — always available, computed from live market
 *     data. They are labelled for what they are, never as "neural networks".
 *  2. Trained specialists — real fitted artifacts loaded from ml_models. A
 *     model without a deployable artifact is EXCLUDED and reported as such.
 */

import { isModelArtifact, predictProbability, type ModelArtifact } from '../ml/core.ts';
import type { Direction, SpecialistContext, SpecialistOutput } from './types.ts';

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const bias = (p: number): Direction => (p > 0.52 ? 'BUY' : p < 0.48 ? 'SELL' : 'FLAT');

function statistical(
  id: string,
  label: string,
  probability: number,
  confidence: number,
  uncertainty: number,
  featureImportance: Record<string, number>,
): SpecialistOutput {
  const p = clamp01(probability);
  return {
    id,
    algorithm: `statistical:${id}`,
    label,
    probability: p,
    confidence: clamp01(confidence),
    uncertainty: clamp01(uncertainty),
    bias: bias(p),
    featureImportance,
  };
}

/* -------------------------------------------------- statistical family */

export function trendSpecialist(ctx: SpecialistContext): SpecialistOutput {
  const { emaShort, emaLong, adx } = ctx.indicators;
  const slope = emaLong > 0 ? (emaShort - emaLong) / emaLong : 0;
  const strength = Math.min(adx / 40, 1);
  const p = 0.5 + Math.tanh(slope * 400) * 0.35 * strength;
  return statistical('trend_following', 'Trend Following', p, 0.4 + strength * 0.5, 0.5 - strength * 0.35, {
    ema_ratio: 0.6,
    adx_14: 0.4,
  });
}

export function momentumSpecialist(ctx: SpecialistContext): SpecialistOutput {
  const { rsi, macdValue, macdSignal, stochK } = ctx.indicators;
  const macdBias = Math.tanh((macdValue - macdSignal) / Math.max(Math.abs(macdSignal) || ctx.price * 0.0005, 1e-9));
  const rsiBias = (50 - rsi) / 50; // oversold = bullish
  const stochBias = (50 - stochK) / 50;
  const score = macdBias * 0.5 + rsiBias * 0.3 + stochBias * 0.2;
  const p = 0.5 + Math.tanh(score) * 0.32;
  return statistical('momentum', 'Momentum', p, 0.55, 0.4, { macd_hist: 0.5, rsi_14: 0.3, stoch_k: 0.2 });
}

export function meanReversionSpecialist(ctx: SpecialistContext): SpecialistOutput {
  const window = ctx.candles.slice(-20);
  if (window.length < 20) {
    return { ...statistical('mean_reversion', 'Mean Reversion', 0.5, 0, 1, {}), unavailableReason: 'Not enough candles' };
  }
  const mean = window.reduce((a, b) => a + b, 0) / window.length;
  const sd = Math.sqrt(window.reduce((a, b) => a + (b - mean) ** 2, 0) / window.length);
  const z = sd > 0 ? (ctx.price - mean) / sd : 0;
  const p = 0.5 - Math.tanh(z / 2) * 0.3;
  // Only meaningful in a ranging market.
  const relevance = ctx.regime === 'ranging' ? 0.75 : ctx.regime === 'choppy' ? 0.5 : 0.25;
  return statistical('mean_reversion', 'Mean Reversion', p, relevance, 1 - relevance, { bb_pos: 1 });
}

export function volatilitySpecialist(ctx: SpecialistContext): SpecialistOutput {
  const atrPct = ctx.price > 0 ? ctx.indicators.atr / ctx.price : 0;
  // Volatility does not pick a direction — it modulates conviction.
  const tooQuiet = atrPct < 0.0004;
  const tooWild = atrPct > 0.02;
  const usable = !tooQuiet && !tooWild;
  return {
    ...statistical('volatility', 'Volatility Model', 0.5, usable ? 0.5 : 0.1, usable ? 0.4 : 0.9, { atr_pct: 1 }),
    bias: 'FLAT',
    unavailableReason: usable ? undefined : tooQuiet ? 'Volatility too low to trade' : 'Volatility outside tradable band',
  };
}

export function regimeSpecialist(ctx: SpecialistContext): SpecialistOutput {
  const p = ctx.regime === 'trending_up' ? 0.68 : ctx.regime === 'trending_down' ? 0.32 : 0.5;
  const conf = ctx.regime.startsWith('trending') ? 0.65 : 0.35;
  return statistical('regime_classifier', 'Regime Classifier', p, conf, 1 - conf, { adx_14: 0.7, vol_20: 0.3 });
}

export function aiAdvisorSpecialist(ctx: SpecialistContext): SpecialistOutput | null {
  const pred = ctx.aiPrediction;
  if (!pred) return null;
  const dir = (pred.direction === 'down' || pred.prediction === 'SELL') ? 'SELL' : 'BUY';
  const conf = clamp01(Number(pred.confidence ?? 0.5));
  const p = dir === 'BUY' ? 0.5 + conf * 0.4 : 0.5 - conf * 0.4;
  return {
    id: 'ai_advisor',
    algorithm: 'llm:market-context',
    label: 'AI Market Advisor',
    probability: p,
    confidence: conf,
    uncertainty: 1 - conf,
    bias: bias(p),
    featureImportance: {},
  };
}

/* ------------------------------------------------------ trained family */

function artifactOf(model: Record<string, any>): ModelArtifact | null {
  const candidate = model?.params?.artifact;
  return isModelArtifact(candidate) ? (candidate as ModelArtifact) : null;
}

export function trainedSpecialists(ctx: SpecialistContext): SpecialistOutput[] {
  return (ctx.trainedModels || []).map((model) => {
    const label = String(model.name || model.type || 'Model');
    const declaredType = String(model.type || 'unknown');
    const artifact = artifactOf(model);

    if (!artifact) {
      return {
        id: String(model.id),
        algorithm: 'none',
        label,
        probability: 0.5,
        confidence: 0,
        uncertainty: 1,
        bias: 'FLAT' as Direction,
        featureImportance: {},
        modelId: String(model.id),
        version: model.version ?? null,
        unavailableReason: `${declaredType} has no trained artifact — retrain it before it can vote`,
      };
    }

    if (!ctx.features) {
      return {
        id: String(model.id),
        algorithm: model.params?.actual_algorithm || artifact.kind,
        label,
        probability: 0.5,
        confidence: 0,
        uncertainty: 1,
        bias: 'FLAT' as Direction,
        featureImportance: artifact.featureImportance || {},
        modelId: String(model.id),
        version: model.version ?? null,
        unavailableReason: 'Not enough live history to build the feature vector',
      };
    }

    const probability = predictProbability(artifact, ctx.features);
    const accuracy = Number(model.accuracy ?? 0);
    const calibrationError = Number(model.params?.metrics?.calibration_error ?? 0.15);
    const validationRows = Number(model.params?.metrics?.samples_validation ?? artifact.samples ?? 0);
    // Conviction rises with edge over 0.5, validated accuracy and sample size.
    const edge = Math.abs(probability - 0.5) * 2;
    const sampleTrust = Math.min(1, validationRows / 200);
    const confidence = clamp01(edge * (0.4 + accuracy * 0.6) * (0.5 + sampleTrust * 0.5));
    const uncertainty = clamp01(1 - confidence + calibrationError);

    return {
      id: String(model.id),
      algorithm: String(model.params?.actual_algorithm || artifact.kind),
      label,
      probability,
      confidence,
      uncertainty,
      bias: bias(probability),
      featureImportance: artifact.featureImportance || {},
      modelId: String(model.id),
      version: model.version ?? null,
    };
  });
}

export function collectSpecialists(ctx: SpecialistContext): SpecialistOutput[] {
  const out: SpecialistOutput[] = [
    trendSpecialist(ctx),
    momentumSpecialist(ctx),
    meanReversionSpecialist(ctx),
    volatilitySpecialist(ctx),
    regimeSpecialist(ctx),
    ...trainedSpecialists(ctx),
  ];
  const advisor = aiAdvisorSpecialist(ctx);
  if (advisor) out.push(advisor);
  return out;
}
