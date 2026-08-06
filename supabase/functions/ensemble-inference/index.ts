// Axion AI — served production ensemble.
// Loads the user's ACTIVE trained artifacts server-side, runs the exact same
// specialist + meta-decision maths as the browser engine, and returns a single
// authorised decision. No artifact is ever shipped to the client.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { collectSpecialists } from "../_shared/ensemble/specialists.ts";
import { decide } from "../_shared/ensemble/metaDecision.ts";
import type { SpecialistContext } from "../_shared/ensemble/types.ts";
import { buildFeatureRow, isModelArtifact } from "../_shared/ml/core.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const num = (v: unknown, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: { user }, error: authErr } = await service.auth.getUser(token);
    if (authErr || !user) return json({ ok: false, error_code: "AUTH_FAILED", message: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const symbol = String(body.symbol || "").toUpperCase();
    if (!symbol) return json({ ok: false, message: "symbol is required" }, 400);

    const candles: number[] = Array.isArray(body.candles) ? body.candles.map((c: unknown) => num(c)) : [];
    const features: number[] | null = Array.isArray(body.features)
      ? body.features.map((f: unknown) => num(f))
      : buildFeatureRow(candles);

    const ind = body.indicators || {};
    const context: SpecialistContext = {
      symbol,
      assetClass: String(body.assetClass || "forex"),
      price: num(body.price),
      candles,
      features,
      indicators: {
        rsi: num(ind.rsi, 50),
        macdValue: num(ind.macdValue),
        macdSignal: num(ind.macdSignal),
        emaShort: num(ind.emaShort),
        emaLong: num(ind.emaLong),
        atr: num(ind.atr),
        adx: num(ind.adx, 20),
        stochK: num(ind.stochK, 50),
        stochD: num(ind.stochD, 50),
      },
      regime: String(body.regime || "unknown"),
      aiPrediction: body.aiPrediction ?? null,
      trainedModels: [],
    };

    // Active trained models for this user, newest first.
    const { data: models, error } = await service
      .from("ml_models")
      .select("id, name, type, version, accuracy, params, is_active, user_id, last_trained_at")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("last_trained_at", { ascending: false, nullsFirst: false })
      .limit(12);
    if (error) throw new Error(error.message);

    const deployable = (models || []).filter((m) => isModelArtifact((m.params as any)?.artifact));
    context.trainedModels = models || [];

    // Version provenance for the models that can actually vote.
    const modelIds = deployable.map((m) => m.id);
    let versionIndex: Record<string, string> = {};
    if (modelIds.length) {
      const { data: versions } = await service
        .from("model_versions")
        .select("model_id, version, activated_for_signals_at")
        .in("model_id", modelIds)
        .order("activated_for_signals_at", { ascending: false });
      for (const v of versions || []) {
        if (!versionIndex[v.model_id]) versionIndex[v.model_id] = v.version;
      }
    }

    const specialists = collectSpecialists(context);
    const decision = decide(specialists, context, { engine: "production" });

    return json({
      ok: true,
      decision: {
        ...decision,
        engine: "production",
        modelVersion: decision.modelId ? versionIndex[decision.modelId] ?? decision.modelVersion ?? null : null,
      },
      served: {
        trained_models_loaded: (models || []).length,
        deployable_artifacts: deployable.length,
        feature_vector: features ? features.length : 0,
      },
    });
  } catch (e) {
    console.error("ensemble-inference failed:", e);
    return json({ ok: false, message: (e as Error)?.message || String(e) }, 500);
  }
});
