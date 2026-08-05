/**
 * Axion AI — inference engine registry.
 *
 * Two interchangeable engines behind one interface:
 *  - development: the live statistical + trained-artifact ensemble that runs in
 *    the browser today. Real market data, real inference, no random trades.
 *  - production:  a served ensemble (edge function `ensemble-inference`). When
 *    our own trained production ensemble is deployed it drops in here with no
 *    changes to callers.
 *
 * Selection is configuration-based:
 *   VITE_AXION_INFERENCE_ENGINE=production   (build-time)
 *   localStorage['axion.inference_engine']   (runtime override)
 */

import { supabase } from '@/integrations/supabase/client';
import { buildFeatureRow } from '../ml/core';
import { collectSpecialists } from './specialists';
import { decide } from './metaDecision';
import type { InferenceEngine, MetaDecision, SpecialistContext } from './types';

export * from './types';
export { collectSpecialists } from './specialists';
export { decide } from './metaDecision';

export type EngineId = 'development' | 'production';

export function getEngineId(): EngineId {
  try {
    const override = localStorage.getItem('axion.inference_engine');
    if (override === 'production' || override === 'development') return override;
  } catch {
    /* storage unavailable */
  }
  const configured = (import.meta as any).env?.VITE_AXION_INFERENCE_ENGINE;
  return configured === 'production' ? 'production' : 'development';
}

export function setEngineId(id: EngineId) {
  try {
    localStorage.setItem('axion.inference_engine', id);
  } catch {
    /* ignore */
  }
}

export function buildContext(input: Omit<SpecialistContext, 'features'>): SpecialistContext {
  return { ...input, features: buildFeatureRow(input.candles) };
}

const developmentEngine: InferenceEngine = {
  id: 'development',
  label: 'Development Inference Engine (live statistical + trained artifacts)',
  async infer(context) {
    return decide(collectSpecialists(context), context, { engine: 'development' });
  },
};

const productionEngine: InferenceEngine = {
  id: 'production',
  label: 'Production Ensemble (served)',
  async infer(context) {
    try {
      const { data, error } = await supabase.functions.invoke('ensemble-inference', {
        body: {
          symbol: context.symbol,
          assetClass: context.assetClass,
          price: context.price,
          features: context.features,
          regime: context.regime,
          indicators: context.indicators,
        },
      });
      if (error || !data?.ok || !data?.decision) return null;
      return { ...(data.decision as MetaDecision), engine: 'production' };
    } catch {
      return null;
    }
  },
};

export const ENGINES: Record<EngineId, InferenceEngine> = {
  development: developmentEngine,
  production: productionEngine,
};

/**
 * Run inference with the configured engine. Production silently degrades to the
 * development engine when it is not deployed yet — and says so in the rationale
 * so the displayed AI information always matches the real execution path.
 */
export async function runInference(context: SpecialistContext): Promise<MetaDecision> {
  const id = getEngineId();
  if (id === 'production') {
    const served = await productionEngine.infer(context);
    if (served) return served;
    const fallback = await developmentEngine.infer(context);
    return {
      ...(fallback as MetaDecision),
      rationale: `Production ensemble unavailable — decided by the development engine. ${fallback?.rationale ?? ''}`,
    };
  }
  return (await developmentEngine.infer(context)) as MetaDecision;
}
