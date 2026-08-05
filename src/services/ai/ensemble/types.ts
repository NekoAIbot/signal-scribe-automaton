/**
 * Axion AI — ensemble contracts.
 *
 * Every model in Axion AI is a *specialist*. A specialist never publishes a
 * trade; it only reports what it believes. The Meta-Decision Engine is the
 * single component allowed to publish a direction.
 */

export type Direction = 'BUY' | 'SELL' | 'FLAT';

export interface SpecialistContext {
  symbol: string;
  assetClass: string;
  price: number;
  candles: number[];
  features: number[] | null;
  indicators: {
    rsi: number;
    macdValue: number;
    macdSignal: number;
    emaShort: number;
    emaLong: number;
    atr: number;
    adx: number;
    stochK: number;
    stochD: number;
  };
  regime: string;
  /** Optional server-side AI prediction for this symbol, if one was produced. */
  aiPrediction?: { direction?: string; prediction?: string; confidence?: number } | null;
  /** Trained model rows from ml_models. */
  trainedModels: Array<Record<string, any>>;
}

export interface SpecialistOutput {
  /** Stable identifier, e.g. "trend_following" or a model id. */
  id: string;
  /** Honest label — the algorithm that actually ran. */
  algorithm: string;
  /** Human label shown in explanations. */
  label: string;
  /** Probability that price rises over the signal horizon (0..1). */
  probability: number;
  /** How strongly this specialist stands behind its probability (0..1). */
  confidence: number;
  /** Epistemic uncertainty (0..1). Higher = less weight in the meta engine. */
  uncertainty: number;
  bias: Direction;
  featureImportance: Record<string, number>;
  /** Set when the specialist could not run; it is then excluded from voting. */
  unavailableReason?: string;
  version?: string | null;
  modelId?: string | null;
}

export interface MetaDecision {
  /** Only true when the meta engine authorises publication. */
  publish: boolean;
  direction: Direction;
  probability: number;
  confidence: number;
  /** Share of participating specialists that agree with `direction`. */
  agreement: number;
  uncertainty: number;
  engine: string;
  /** Specialists that genuinely contributed. */
  participants: SpecialistOutput[];
  /** Specialists deliberately excluded, with the honest reason. */
  excluded: Array<{ id: string; label: string; reason: string }>;
  featureImportance: Record<string, number>;
  rationale: string;
  modelId?: string | null;
  modelVersion?: string | null;
}

export interface InferenceEngine {
  id: 'development' | 'production';
  label: string;
  /** Returns null when the engine cannot serve this request. */
  infer(context: SpecialistContext): Promise<MetaDecision | null>;
}
