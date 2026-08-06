import { describe, it, expect } from 'vitest';
import { collectSpecialists } from '@/services/ai/ensemble/specialists';
import { decide } from '@/services/ai/ensemble/metaDecision';
import { buildFeatureRow, predictProbability, isModelArtifact, FEATURE_NAMES } from '@/services/ai/ml/core';
import type { SpecialistContext } from '@/services/ai/ensemble/types';

function series(n: number, start: number, drift: number) {
  return Array.from({ length: n }, (_, i) => start + drift * i + Math.sin(i / 3) * (start * 0.0004));
}

function ctx(overrides: Partial<SpecialistContext> = {}): SpecialistContext {
  const candles = series(120, 1.1, 0.0004);
  return {
    symbol: 'EUR/USD',
    assetClass: 'forex',
    price: candles[candles.length - 1],
    candles,
    features: buildFeatureRow(candles),
    indicators: {
      rsi: 42, macdValue: 0.0012, macdSignal: 0.0004,
      emaShort: 1.148, emaLong: 1.142, atr: 0.0009, adx: 31, stochK: 38, stochD: 41,
    },
    regime: 'trending_up',
    aiPrediction: { direction: 'up', confidence: 0.71 },
    trainedModels: [],
    ...overrides,
  };
}

// A real, tiny logistic artifact — the same shape train-ml-model persists.
const artifact = {
  kind: 'logistic' as const,
  featureNames: [...FEATURE_NAMES],
  mean: FEATURE_NAMES.map(() => 0),
  std: FEATURE_NAMES.map(() => 1),
  weights: FEATURE_NAMES.map((_, i) => (i === 0 ? 1.4 : 0.05)),
  bias: 0.1,
  featureImportance: { ret_1: 0.7, rsi_14: 0.3 },
  horizon: 5,
  trainedAt: new Date().toISOString(),
  samples: 420,
};

describe('ML core', () => {
  it('builds a full feature vector from live candles', () => {
    const features = buildFeatureRow(series(120, 1.1, 0.0004));
    expect(features).not.toBeNull();
    expect(features!.length).toBe(FEATURE_NAMES.length);
    expect(features!.every((v) => Number.isFinite(v))).toBe(true);
  });

  it('refuses to build features without enough history', () => {
    expect(buildFeatureRow([1, 2, 3])).toBeNull();
  });

  it('validates artifacts and produces calibrated probabilities', () => {
    expect(isModelArtifact(artifact)).toBe(true);
    expect(isModelArtifact({ kind: 'logistic' })).toBe(false);
    const p = predictProbability(artifact as any, buildFeatureRow(series(120, 1.1, 0.0004))!);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
  });
});

describe('Specialists', () => {
  it('excludes trained models that have no deployable artifact', () => {
    const outputs = collectSpecialists(ctx({
      trainedModels: [{ id: 'm1', name: 'LSTM Alpha', type: 'LSTM', version: '1.2', params: {} }],
    }));
    const trained = outputs.find((s) => s.modelId === 'm1')!;
    expect(trained.confidence).toBe(0);
    expect(trained.unavailableReason).toMatch(/no trained artifact/i);
  });

  it('lets a real artifact vote with an honest algorithm label', () => {
    const outputs = collectSpecialists(ctx({
      trainedModels: [{
        id: 'm2', name: 'GBDT Core', type: 'XGBoost', version: '2.0', accuracy: 0.61,
        params: { artifact, actual_algorithm: 'gradient_boosted_trees', metrics: { samples_validation: 300, calibration_error: 0.05 } },
      }],
    }));
    const trained = outputs.find((s) => s.modelId === 'm2')!;
    expect(trained.unavailableReason).toBeUndefined();
    expect(trained.algorithm).toBe('gradient_boosted_trees');
    expect(trained.probability).toBeGreaterThan(0);
  });
});

describe('Meta-Decision Engine', () => {
  it('is the only publisher and reports every excluded specialist', () => {
    const context = ctx();
    const decision = decide(collectSpecialists(context), context, { engine: 'development' });
    expect(['BUY', 'SELL', 'FLAT']).toContain(decision.direction);
    expect(decision.engine).toBe('development');
    expect(Array.isArray(decision.excluded)).toBe(true);
    expect(decision.rationale.length).toBeGreaterThan(10);
  });

  it('refuses to publish when too few specialists have conviction', () => {
    const context = ctx({ aiPrediction: null });
    const decision = decide(
      [{ id: 'trend_following', algorithm: 'statistical', label: 'Trend', probability: 0.7, confidence: 0.6, uncertainty: 0.3, bias: 'BUY', featureImportance: {} }],
      context,
      { engine: 'development' },
    );
    expect(decision.publish).toBe(false);
    expect(decision.rationale).toMatch(/held back/i);
  });

  it('blocks publication when volatility is outside the tradable band', () => {
    const flat = Array.from({ length: 120 }, () => 1.1);
    const context = ctx({ candles: flat, price: 1.1, indicators: { ...ctx().indicators, atr: 0.00001 } });
    const decision = decide(collectSpecialists(context), context, { engine: 'development' });
    expect(decision.publish).toBe(false);
    expect(decision.direction).toBe('FLAT');
  });

  it('weights confident specialists above uncertain contradicting ones', () => {
    const context = ctx();
    const decision = decide([
      { id: 'a', algorithm: 's', label: 'A', probability: 0.82, confidence: 0.9, uncertainty: 0.1, bias: 'BUY', featureImportance: { ret_1: 1 } },
      { id: 'b', algorithm: 's', label: 'B', probability: 0.78, confidence: 0.8, uncertainty: 0.2, bias: 'BUY', featureImportance: { rsi_14: 1 } },
      { id: 'c', algorithm: 's', label: 'C', probability: 0.44, confidence: 0.15, uncertainty: 0.9, bias: 'SELL', featureImportance: {} },
    ], context, { engine: 'development' });
    expect(decision.direction).toBe('BUY');
    expect(decision.publish).toBe(true);
    expect(decision.agreement).toBeGreaterThan(0.6);
    expect(Object.keys(decision.featureImportance).length).toBeGreaterThan(0);
  });
});
