// Axion AI — genuine supervised learning implementations.
// Deterministic, dependency-free trainers used by the train-ml-model edge
// function. No synthetic labels, no random metrics: every number here is
// produced by fitting real feature/label pairs and scoring a held-out split.

import {
  FEATURE_NAMES,
  ModelArtifact,
  TrainingMetrics,
  TreeNode,
  sigmoid,
  rawMargin,
  predictProbability,
} from './core.ts';

export interface Dataset {
  X: number[][];
  y: number[];
  /** Forward return per row — used for expected-value scoring. */
  r: number[];
}

/* ------------------------------------------------------------ utilities */

function standardise(X: number[][]) {
  const cols = X[0]?.length ?? 0;
  const mean = new Array(cols).fill(0);
  const std = new Array(cols).fill(1);
  for (let c = 0; c < cols; c++) {
    let s = 0;
    for (const row of X) s += row[c];
    mean[c] = s / Math.max(X.length, 1);
    let v = 0;
    for (const row of X) v += (row[c] - mean[c]) ** 2;
    std[c] = Math.sqrt(v / Math.max(X.length, 1)) || 1;
  }
  const Z = X.map((row) => row.map((v, c) => (v - mean[c]) / std[c]));
  return { Z, mean, std };
}

/** Deterministic PRNG so retraining on identical data is reproducible. */
function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------ regression tree */

interface TreeStats { importance: number[] }

function buildTree(
  Z: number[][],
  grad: number[],
  hess: number[],
  idx: number[],
  depth: number,
  maxDepth: number,
  minChild: number,
  lambda: number,
  stats: TreeStats,
): TreeNode {
  const sumG = idx.reduce((a, i) => a + grad[i], 0);
  const sumH = idx.reduce((a, i) => a + hess[i], 0);
  const leafValue = -sumG / (sumH + lambda);

  if (depth >= maxDepth || idx.length < minChild * 2) return { v: leafValue };

  const parentScore = (sumG * sumG) / (sumH + lambda);
  let best: { f: number; t: number; gain: number; left: number[]; right: number[] } | null = null;
  const cols = Z[0].length;

  for (let f = 0; f < cols; f++) {
    const values = idx.map((i) => Z[i][f]).sort((a, b) => a - b);
    const candidates: number[] = [];
    for (let q = 1; q <= 7; q++) {
      const t = values[Math.floor((values.length * q) / 8)];
      if (t !== undefined && !candidates.includes(t)) candidates.push(t);
    }
    for (const t of candidates) {
      const left: number[] = [];
      const right: number[] = [];
      for (const i of idx) (Z[i][f] <= t ? left : right).push(i);
      if (left.length < minChild || right.length < minChild) continue;
      const gL = left.reduce((a, i) => a + grad[i], 0);
      const hL = left.reduce((a, i) => a + hess[i], 0);
      const gR = sumG - gL;
      const hR = sumH - hL;
      const gain = (gL * gL) / (hL + lambda) + (gR * gR) / (hR + lambda) - parentScore;
      if (gain > 1e-8 && (!best || gain > best.gain)) best = { f, t, gain, left, right };
    }
  }

  if (!best) return { v: leafValue };
  stats.importance[best.f] += best.gain;

  return {
    f: best.f,
    t: best.t,
    l: buildTree(Z, grad, hess, best.left, depth + 1, maxDepth, minChild, lambda, stats),
    r: buildTree(Z, grad, hess, best.right, depth + 1, maxDepth, minChild, lambda, stats),
  };
}

function evalTree(node: TreeNode, x: number[]): number {
  let n: any = node;
  while (n.f !== undefined) n = x[n.f] <= n.t ? n.l : n.r;
  return n.v;
}

/* ------------------------------------------------------------ learners */

export function trainGradientBoosting(
  data: Dataset,
  opts: { rounds?: number; learningRate?: number; maxDepth?: number; lambda?: number } = {},
): ModelArtifact {
  const rounds = opts.rounds ?? 120;
  const lr = opts.learningRate ?? 0.08;
  const maxDepth = opts.maxDepth ?? 3;
  const lambda = opts.lambda ?? 1.0;

  const { Z, mean, std } = standardise(data.X);
  const n = Z.length;
  const base = Math.log(
    Math.max(1e-6, data.y.reduce((a, b) => a + b, 0) / n) /
      Math.max(1e-6, 1 - data.y.reduce((a, b) => a + b, 0) / n),
  );

  const scores = new Array(n).fill(base);
  const trees: TreeNode[] = [];
  const stats: TreeStats = { importance: new Array(Z[0].length).fill(0) };
  const idx = Z.map((_, i) => i);
  const minChild = Math.max(8, Math.floor(n * 0.02));

  for (let round = 0; round < rounds; round++) {
    const grad = new Array(n);
    const hess = new Array(n);
    for (let i = 0; i < n; i++) {
      const p = sigmoid(scores[i]);
      grad[i] = p - data.y[i];
      hess[i] = Math.max(p * (1 - p), 1e-6);
    }
    const tree = buildTree(Z, grad, hess, idx, 0, maxDepth, minChild, lambda, stats);
    trees.push(tree);
    for (let i = 0; i < n; i++) scores[i] += lr * evalTree(tree, Z[i]);
  }

  return finalise('gbdt', { mean, std, trees, baseScore: base, learningRate: lr }, stats.importance, data);
}

export function trainRandomForest(
  data: Dataset,
  opts: { trees?: number; maxDepth?: number; seed?: number } = {},
): ModelArtifact {
  const count = opts.trees ?? 40;
  const maxDepth = opts.maxDepth ?? 4;
  const rng = mulberry(opts.seed ?? 42);
  const { Z, mean, std } = standardise(data.X);
  const n = Z.length;
  const stats: TreeStats = { importance: new Array(Z[0].length).fill(0) };
  const trees: TreeNode[] = [];
  const minChild = Math.max(6, Math.floor(n * 0.03));

  for (let t = 0; t < count; t++) {
    const bag: number[] = [];
    for (let i = 0; i < n; i++) bag.push(Math.floor(rng() * n));
    // Forest leaves hold class probabilities: gradient = -y, hessian = 1 gives
    // the mean label at each leaf when negated.
    const grad = data.y.map((y) => -y);
    const hess = new Array(n).fill(1);
    trees.push(buildTree(Z, grad, hess, bag, 0, maxDepth, minChild, 0, stats));
  }

  return finalise('forest', { mean, std, trees }, stats.importance, data);
}

export function trainLogistic(
  data: Dataset,
  opts: { epochs?: number; learningRate?: number; l2?: number } = {},
): ModelArtifact {
  const epochs = opts.epochs ?? 400;
  const lr = opts.learningRate ?? 0.08;
  const l2 = opts.l2 ?? 1e-4;
  const { Z, mean, std } = standardise(data.X);
  const cols = Z[0].length;
  const weights = new Array(cols).fill(0);
  let bias = 0;

  for (let e = 0; e < epochs; e++) {
    const gradW = new Array(cols).fill(0);
    let gradB = 0;
    for (let i = 0; i < Z.length; i++) {
      const p = sigmoid(Z[i].reduce((acc, v, c) => acc + v * weights[c], bias));
      const err = p - data.y[i];
      for (let c = 0; c < cols; c++) gradW[c] += err * Z[i][c];
      gradB += err;
    }
    for (let c = 0; c < cols; c++) weights[c] -= lr * (gradW[c] / Z.length + l2 * weights[c]);
    bias -= lr * (gradB / Z.length);
  }

  const importance = weights.map(Math.abs);
  return finalise('logistic', { mean, std, weights, bias }, importance, data);
}

/* ------------------------------------------------------------ finalise + score */

function finalise(
  kind: ModelArtifact['kind'],
  parts: Partial<ModelArtifact>,
  rawImportance: number[],
  data: Dataset,
): ModelArtifact {
  const total = rawImportance.reduce((a, b) => a + b, 0) || 1;
  const featureImportance: Record<string, number> = {};
  FEATURE_NAMES.forEach((name, i) => {
    featureImportance[name] = Number(((rawImportance[i] || 0) / total).toFixed(4));
  });

  return {
    kind,
    featureNames: [...FEATURE_NAMES],
    mean: parts.mean!,
    std: parts.std!,
    weights: parts.weights,
    bias: parts.bias,
    trees: parts.trees,
    baseScore: parts.baseScore,
    learningRate: parts.learningRate,
    featureImportance,
    horizon: 0,
    trainedAt: new Date().toISOString(),
    samples: data.X.length,
  };
}

/** Platt scaling fitted on the validation split so probabilities are honest. */
export function calibrate(artifact: ModelArtifact, valid: Dataset): ModelArtifact {
  const margins = valid.X.map((x) => rawMargin(artifact, x));
  let a = 1;
  let b = 0;
  for (let e = 0; e < 300; e++) {
    let ga = 0;
    let gb = 0;
    for (let i = 0; i < margins.length; i++) {
      const p = sigmoid(a * margins[i] + b);
      const err = p - valid.y[i];
      ga += err * margins[i];
      gb += err;
    }
    a -= 0.05 * (ga / Math.max(margins.length, 1));
    b -= 0.05 * (gb / Math.max(margins.length, 1));
  }
  return { ...artifact, calibration: { a, b } };
}

export function evaluate(artifact: ModelArtifact, train: Dataset, valid: Dataset): TrainingMetrics {
  const probs = valid.X.map((x) => predictProbability(artifact, x));
  const preds = probs.map((p) => (p >= 0.5 ? 1 : 0));

  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;
  for (let i = 0; i < preds.length; i++) {
    if (preds[i] === 1 && valid.y[i] === 1) tp++;
    else if (preds[i] === 1) fp++;
    else if (valid.y[i] === 1) fn++;
    else tn++;
  }
  const total = Math.max(preds.length, 1);
  const accuracy = (tp + tn) / total;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  // AUC via rank statistic.
  const order = probs.map((p, i) => ({ p, y: valid.y[i] })).sort((x, y) => x.p - y.p);
  let rankSum = 0;
  let pos = 0;
  order.forEach((o, i) => {
    if (o.y === 1) {
      rankSum += i + 1;
      pos++;
    }
  });
  const neg = order.length - pos;
  const auc = pos > 0 && neg > 0 ? (rankSum - (pos * (pos + 1)) / 2) / (pos * neg) : 0.5;

  const brier = probs.reduce((a, p, i) => a + (p - valid.y[i]) ** 2, 0) / total;
  const logLoss =
    -probs.reduce((a, p, i) => {
      const c = Math.min(1 - 1e-9, Math.max(1e-9, p));
      return a + (valid.y[i] * Math.log(c) + (1 - valid.y[i]) * Math.log(1 - c));
    }, 0) / total;

  // Reliability: |mean(p) - observed| across 5 confidence buckets.
  let calibrationError = 0;
  for (let b = 0; b < 5; b++) {
    const lo = b / 5;
    const hi = (b + 1) / 5;
    const bucket = probs.map((p, i) => ({ p, y: valid.y[i] })).filter((o) => o.p >= lo && o.p < hi);
    if (!bucket.length) continue;
    const avgP = bucket.reduce((a, o) => a + o.p, 0) / bucket.length;
    const obs = bucket.reduce((a, o) => a + o.y, 0) / bucket.length;
    calibrationError += (Math.abs(avgP - obs) * bucket.length) / total;
  }

  // Trading economics on high-conviction validation rows only.
  const acted = probs
    .map((p, i) => ({ p, r: valid.r[i] }))
    .filter((o) => o.p >= 0.55 || o.p <= 0.45);
  const wins = acted.filter((o) => (o.p >= 0.55 ? o.r > 0 : o.r < 0)).length;
  const winRate = acted.length ? wins / acted.length : 0;
  const expectedValue = acted.length
    ? acted.reduce((a, o) => a + (o.p >= 0.55 ? o.r : -o.r), 0) / acted.length
    : 0;

  return {
    accuracy: round(accuracy),
    precision: round(precision),
    recall: round(recall),
    f1: round(f1),
    auc: round(auc),
    brier: round(brier),
    logLoss: round(logLoss),
    calibrationError: round(calibrationError),
    winRate: round(winRate),
    expectedValue: Number(expectedValue.toFixed(6)),
    samplesTrain: train.X.length,
    samplesValidation: valid.X.length,
    baseRate: round(valid.y.reduce((a, b) => a + b, 0) / total),
  };
}

const round = (n: number) => Number((Number.isFinite(n) ? n : 0).toFixed(4));

/** Chronological split — never shuffle time series. */
export function timeSplit(data: Dataset, validFraction = 0.25): { train: Dataset; valid: Dataset } {
  const cut = Math.max(1, Math.floor(data.X.length * (1 - validFraction)));
  return {
    train: { X: data.X.slice(0, cut), y: data.y.slice(0, cut), r: data.r.slice(0, cut) },
    valid: { X: data.X.slice(cut), y: data.y.slice(cut), r: data.r.slice(cut) },
  };
}

/** Maps a requested model type onto the learner that actually runs. */
export function resolveLearner(modelType: string): {
  learner: 'gbdt' | 'forest' | 'logistic';
  honestLabel: string;
} {
  const t = String(modelType || '').toLowerCase();
  if (/xgboost|lightgbm|catboost|gradient|transformer|lstm|gru|cnn/.test(t)) {
    return { learner: 'gbdt', honestLabel: 'gradient_boosted_trees' };
  }
  if (/forest|bagging|ensemble/.test(t)) return { learner: 'forest', honestLabel: 'random_forest' };
  return { learner: 'logistic', honestLabel: 'logistic_regression' };
}

export function train(learner: 'gbdt' | 'forest' | 'logistic', data: Dataset): ModelArtifact {
  if (learner === 'gbdt') return trainGradientBoosting(data);
  if (learner === 'forest') return trainRandomForest(data);
  return trainLogistic(data);
}
