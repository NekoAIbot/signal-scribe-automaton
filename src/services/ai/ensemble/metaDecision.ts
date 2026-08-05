/**
 * Axion AI — Meta-Decision Engine.
 *
 * The ONLY component in the system permitted to publish a direction. Individual
 * specialists cannot emit BUY/SELL; contradictory specialists are resolved here
 * by inverse-uncertainty weighting in log-odds space.
 */

import type { Direction, MetaDecision, SpecialistContext, SpecialistOutput } from './types';

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const logit = (p: number) => {
  const c = Math.min(0.995, Math.max(0.005, p));
  return Math.log(c / (1 - c));
};
const sigmoid = (z: number) => 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, z))));

export interface MetaOptions {
  engine: string;
  /** Minimum blended probability edge required to publish. */
  minEdge?: number;
  /** Minimum share of participants that must agree. */
  minAgreement?: number;
  minParticipants?: number;
}

export function decide(
  specialists: SpecialistOutput[],
  ctx: SpecialistContext,
  options: MetaOptions,
): MetaDecision {
  const minEdge = options.minEdge ?? 0.06;
  const minAgreement = options.minAgreement ?? 0.6;
  const minParticipants = options.minParticipants ?? 3;

  const excluded = specialists
    .filter((s) => s.unavailableReason || s.confidence <= 0)
    .map((s) => ({ id: s.id, label: s.label, reason: s.unavailableReason || 'No conviction this cycle' }));

  const participants = specialists.filter((s) => !s.unavailableReason && s.confidence > 0 && s.bias !== 'FLAT');

  const blockers = specialists.filter((s) => s.id === 'volatility' && s.unavailableReason);

  if (participants.length < minParticipants || blockers.length) {
    return {
      publish: false,
      direction: 'FLAT',
      probability: 0.5,
      confidence: 0,
      agreement: 0,
      uncertainty: 1,
      engine: options.engine,
      participants,
      excluded,
      featureImportance: {},
      rationale: blockers.length
        ? `Held back: ${blockers[0].unavailableReason}.`
        : `Held back: only ${participants.length} specialist(s) had conviction (minimum ${minParticipants}).`,
    };
  }

  // Inverse-uncertainty weighted blend of log-odds.
  let weightSum = 0;
  let weighted = 0;
  const importance: Record<string, number> = {};

  for (const s of participants) {
    const w = (s.confidence * (1 - clamp01(s.uncertainty) * 0.8)) || 1e-6;
    weightSum += w;
    weighted += logit(s.probability) * w;
    for (const [feature, value] of Object.entries(s.featureImportance || {})) {
      importance[feature] = (importance[feature] || 0) + value * w;
    }
  }

  const probability = sigmoid(weighted / Math.max(weightSum, 1e-9));
  const direction: Direction = probability >= 0.5 ? 'BUY' : 'SELL';
  const agreeing = participants.filter((s) => s.bias === direction);
  const agreement = agreeing.length / participants.length;
  const edge = Math.abs(probability - 0.5);
  const uncertainty = clamp01(
    participants.reduce((a, s) => a + s.uncertainty, 0) / participants.length,
  );

  // Conviction blends the statistical edge, cross-specialist agreement and the
  // residual uncertainty of the panel.
  const confidence = clamp01(0.5 + edge * 0.6 + (agreement - 0.5) * 0.3 - uncertainty * 0.15);

  const importanceTotal = Object.values(importance).reduce((a, b) => a + b, 0) || 1;
  const featureImportance = Object.fromEntries(
    Object.entries(importance)
      .map(([k, v]) => [k, Number((v / importanceTotal).toFixed(4))])
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 8),
  ) as Record<string, number>;

  const publish = edge >= minEdge && agreement >= minAgreement;
  const bestTrained = agreeing
    .filter((s) => s.modelId)
    .sort((a, b) => b.confidence - a.confidence)[0];

  const names = agreeing.map((s) => `${s.label} (${s.algorithm})`).join(', ');
  const rationale = publish
    ? `${direction} on ${ctx.symbol}: ${agreeing.length}/${participants.length} specialists agree — ${names}. Blended probability ${(probability * 100).toFixed(1)}% in the ${ctx.regime} regime.`
    : `No publication: edge ${(edge * 100).toFixed(1)}% (need ${(minEdge * 100).toFixed(0)}%), agreement ${(agreement * 100).toFixed(0)}% (need ${(minAgreement * 100).toFixed(0)}%).`;

  return {
    publish,
    direction,
    probability,
    confidence,
    agreement,
    uncertainty,
    engine: options.engine,
    participants,
    excluded,
    featureImportance,
    rationale,
    modelId: bestTrained?.modelId ?? null,
    modelVersion: bestTrained?.version ?? null,
  };
}
