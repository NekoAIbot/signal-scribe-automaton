/**
 * Axion AI — ML core (features + artifact inference).
 *
 * This file is intentionally dependency-free and self-contained so the exact
 * same maths runs in the browser (inference) and inside edge functions
 * (training). The edge copy lives at supabase/functions/_shared/ml/core.ts and
 * MUST be kept byte-identical apart from its header comment.
 */

export const FEATURE_NAMES = [
  'ret_1',
  'ret_5',
  'ret_20',
  'rsi_14',
  'macd_hist',
  'ema_ratio',
  'atr_pct',
  'adx_14',
  'stoch_k',
  'bb_pos',
  'vol_20',
  'range_pos_50',
] as const;

export type FeatureName = (typeof FEATURE_NAMES)[number];

export interface TreeLeaf { v: number }
export interface TreeSplit { f: number; t: number; l: TreeNode; r: TreeNode }
export type TreeNode = TreeLeaf | TreeSplit;

export type ArtifactKind = 'logistic' | 'gbdt' | 'forest';

export interface ModelArtifact {
  kind: ArtifactKind;
  featureNames: string[];
  mean: number[];
  std: number[];
  /** logistic */
  weights?: number[];
  bias?: number;
  /** tree ensembles */
  trees?: TreeNode[];
  baseScore?: number;
  learningRate?: number;
  /** Platt calibration applied to the raw margin/probability. */
  calibration?: { a: number; b: number };
  featureImportance: Record<string, number>;
  horizon: number;
  trainedAt: string;
  /** Rows the artifact was fitted on — used for honesty reporting. */
  samples: number;
}

export interface TrainingMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  auc: number;
  brier: number;
  logLoss: number;
  calibrationError: number;
  winRate: number;
  expectedValue: number;
  samplesTrain: number;
  samplesValidation: number;
  baseRate: number;
}

/* ------------------------------------------------------------------ maths */

export const sigmoid = (z: number) => 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, z))));

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function ema(values: number[], period: number): number {
  if (values.length < period) return mean(values);
  const k = 2 / (period + 1);
  let e = mean(values.slice(0, period));
  for (let i = period; i < values.length; i++) e = values[i] * k + e * (1 - k);
  return e;
}

function rsi(values: number[], period = 14): number {
  if (values.length < period + 1) return 50;
  let gain = 0;
  let loss = 0;
  for (let i = values.length - period; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gain += d; else loss -= d;
  }
  if (gain + loss === 0) return 50;
  const rs = gain / Math.max(loss, 1e-12);
  return 100 - 100 / (1 + rs);
}

function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
}

/**
 * Build one feature row from a close-price window. The window must end at the
 * bar the prediction is made on (no look-ahead).
 */
export function buildFeatureRow(window: number[]): number[] | null {
  if (!Array.isArray(window) || window.length < 60) return null;
  const price = window[window.length - 1];
  if (!Number.isFinite(price) || price <= 0) return null;

  const ret = (n: number) => {
    const past = window[window.length - 1 - n];
    return past > 0 ? (price - past) / past : 0;
  };

  const e12 = ema(window.slice(-60), 12);
  const e26 = ema(window.slice(-60), 26);
  const macdSeries: number[] = [];
  for (let i = 8; i >= 0; i--) {
    const slice = window.slice(0, window.length - i);
    macdSeries.push(ema(slice.slice(-60), 12) - ema(slice.slice(-60), 26));
  }
  const macdValue = macdSeries[macdSeries.length - 1];
  const macdSignal = mean(macdSeries);

  const last15 = window.slice(-15);
  let trSum = 0;
  for (let i = 1; i < last15.length; i++) trSum += Math.abs(last15[i] - last15[i - 1]);
  const atr = trSum / Math.max(last15.length - 1, 1);

  let plusDM = 0;
  let minusDM = 0;
  for (let i = 1; i < last15.length; i++) {
    const d = last15[i] - last15[i - 1];
    if (d > 0) plusDM += d; else minusDM -= d;
  }
  const dmTotal = plusDM + minusDM;
  const adx = dmTotal > 0 ? (Math.abs(plusDM - minusDM) / dmTotal) * 100 : 0;

  const win14 = window.slice(-14);
  const lo14 = Math.min(...win14);
  const hi14 = Math.max(...win14);
  const stochK = hi14 > lo14 ? ((price - lo14) / (hi14 - lo14)) * 100 : 50;

  const win20 = window.slice(-20);
  const m20 = mean(win20);
  const sd20 = stdev(win20);
  const bbPos = sd20 > 0 ? (price - m20) / (2 * sd20) : 0;

  const rets20: number[] = [];
  for (let i = window.length - 20; i < window.length; i++) {
    const prev = window[i - 1];
    if (prev > 0) rets20.push((window[i] - prev) / prev);
  }

  const win50 = window.slice(-50);
  const lo50 = Math.min(...win50);
  const hi50 = Math.max(...win50);

  const row = [
    ret(1),
    ret(5),
    ret(20),
    (rsi(window, 14) - 50) / 50,
    (macdValue - macdSignal) / Math.max(price * 0.001, 1e-9),
    e26 > 0 ? e12 / e26 - 1 : 0,
    atr / price,
    adx / 100,
    (stochK - 50) / 50,
    bbPos,
    stdev(rets20),
    hi50 > lo50 ? (price - lo50) / (hi50 - lo50) - 0.5 : 0,
  ];

  return row.every((v) => Number.isFinite(v)) ? row : null;
}

/* ------------------------------------------------------------- inference */

function treePredict(node: TreeNode, x: number[]): number {
  let n = node;
  while ((n as TreeSplit).f !== undefined) {
    const s = n as TreeSplit;
    n = x[s.f] <= s.t ? s.l : s.r;
  }
  return (n as TreeLeaf).v;
}

export function rawMargin(artifact: ModelArtifact, features: number[]): number {
  const z = features.map((v, i) => {
    const sd = artifact.std[i] || 1;
    return (v - (artifact.mean[i] ?? 0)) / (sd === 0 ? 1 : sd);
  });

  if (artifact.kind === 'logistic') {
    const w = artifact.weights || [];
    return z.reduce((acc, v, i) => acc + v * (w[i] || 0), artifact.bias || 0);
  }

  const trees = artifact.trees || [];
  if (artifact.kind === 'forest') {
    if (!trees.length) return 0;
    const p = trees.reduce((acc, t) => acc + treePredict(t, z), 0) / trees.length;
    const clipped = Math.min(0.999, Math.max(0.001, p));
    return Math.log(clipped / (1 - clipped));
  }

  const lr = artifact.learningRate ?? 0.1;
  return trees.reduce((acc, t) => acc + lr * treePredict(t, z), artifact.baseScore || 0);
}

/** Calibrated probability that the next `horizon` bars close higher. */
export function predictProbability(artifact: ModelArtifact, features: number[]): number {
  const margin = rawMargin(artifact, features);
  const cal = artifact.calibration;
  return sigmoid(cal ? cal.a * margin + cal.b : margin);
}

export function isModelArtifact(value: unknown): value is ModelArtifact {
  const a = value as ModelArtifact;
  return (
    !!a &&
    typeof a === 'object' &&
    Array.isArray(a.featureNames) &&
    Array.isArray(a.mean) &&
    Array.isArray(a.std) &&
    (a.kind === 'logistic' || a.kind === 'gbdt' || a.kind === 'forest')
  );
}
