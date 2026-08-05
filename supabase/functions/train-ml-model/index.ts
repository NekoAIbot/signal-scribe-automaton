// Axion AI — model training.
// Genuine supervised learning on real market history + verified trade outcomes.
// The public request/response contract is unchanged; only the internals are real.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { FEATURE_NAMES } from "../_shared/ml/core.ts";
import {
  calibrate,
  evaluate,
  resolveLearner,
  timeSplit,
  train,
} from "../_shared/ml/learners.ts";
import {
  MIN_ROWS,
  buildDataset,
  datasetFromTradeOutcomes,
  fetchHistory,
  mergeDatasets,
} from "../_shared/ml/dataset.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  try {
    const params = await req.json();
    const authHeader = req.headers.get('Authorization');
    const internalUserId = req.headers.get('x-internal-user-id');
    const internalSecret = req.headers.get('x-trading-bot-secret');
    const service = createClient(supabaseUrl, serviceKey);

    let userId: string;
    if (internalUserId && internalSecret === serviceKey) {
      userId = internalUserId;
    } else if (authHeader?.startsWith('Bearer ')) {
      const { data: { user }, error } = await service.auth.getUser(authHeader.replace('Bearer ', ''));
      if (error || !user) throw new Error('User not authenticated');
      userId = user.id;
    } else {
      throw new Error('Missing authorization header');
    }

    const isPropFirm = params.mode === 'prop-firm' || String(params.name || '').toLowerCase().includes('prop');
    const requestedType = params.modelType || 'XGBoost';
    const { learner, honestLabel } = resolveLearner(requestedType);
    const modelName = params.name || `${isPropFirm ? 'PropFirm ' : ''}${requestedType} ${new Date().toLocaleDateString()}`;
    const symbols: string[] = params.symbols || (isPropFirm
      ? ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'XAU/USD', 'US500']
      : ['EUR/USD', 'GBP/USD', 'BTC/USD', 'XAU/USD']);
    const horizon = Number(params.horizon || 5);

    // ---- 1. Real historical market data -------------------------------
    const series = await fetchHistory(supabaseUrl, anonKey, symbols);
    if (!series.length) {
      return json({
        success: false,
        error: 'No real market history is available right now, so training was refused. Axion AI never trains on synthetic data.',
      }, 422);
    }

    let dataset = buildDataset(series, horizon);

    // ---- 2. Verified execution outcomes -------------------------------
    const { data: trades } = await service
      .from('trades')
      .select('trade_type, entry_price, profit, status, execution_timeline, created_at')
      .eq('user_id', userId)
      .eq('status', 'closed')
      .order('created_at', { ascending: true })
      .limit(1000);

    const closedTrades = trades || [];
    const outcomeRows = datasetFromTradeOutcomes(closedTrades);
    dataset = mergeDatasets(dataset, outcomeRows);

    if (dataset.X.length < MIN_ROWS) {
      return json({
        success: false,
        error: `Only ${dataset.X.length} genuine training rows are available (minimum ${MIN_ROWS}). Training refused rather than padded with synthetic samples.`,
      }, 422);
    }

    // ---- 3. Chronological fit + calibration + honest evaluation -------
    const { train: trainSet, valid } = timeSplit(dataset, 0.25);
    let artifact = train(learner, trainSet);
    artifact = { ...calibrate(artifact, valid), horizon };
    const metrics = evaluate(artifact, trainSet, valid);
    const accuracy = Math.min(0.97, Math.max(0.4, metrics.accuracy));

    const windowStart = closedTrades[0]?.created_at || null;
    const windowEnd = closedTrades[closedTrades.length - 1]?.created_at || null;

    const trainingStats = {
      engine: 'axion-ml-v1',
      requested_type: requestedType,
      actual_algorithm: honestLabel,
      learner,
      horizon,
      symbols,
      isPropFirm,
      feature_set: FEATURE_NAMES,
      dataset: {
        rows: dataset.X.length,
        market_rows: dataset.X.length - outcomeRows.X.length,
        outcome_rows: outcomeRows.X.length,
        symbols_used: series.map((s) => s.symbol),
        period_start: windowStart,
        period_end: windowEnd,
        base_rate: metrics.baseRate,
      },
      metrics: {
        accuracy: metrics.accuracy,
        precision: metrics.precision,
        recall: metrics.recall,
        f1_score: metrics.f1,
        auc: metrics.auc,
        brier: metrics.brier,
        log_loss: metrics.logLoss,
        calibration_error: metrics.calibrationError,
        win_rate: metrics.winRate,
        expected_value: metrics.expectedValue,
        samples_train: metrics.samplesTrain,
        samples_validation: metrics.samplesValidation,
      },
      feature_importance: artifact.featureImportance,
      risk_metrics: isPropFirm
        ? { maxDailyDrawdown: 0.04, maxTotalDrawdown: 0.1, maxLotSize: 0.02, minConfidence: 0.7 }
        : null,
      // The deployable weights. Inference loads this and nothing else.
      artifact,
      notes: `${honestLabel} fitted on ${dataset.X.length} real rows (${outcomeRows.X.length} from verified executions). Validation AUC ${metrics.auc}, calibration error ${metrics.calibrationError}.`,
    };

    // ---- 4. Persist model + version -----------------------------------
    const indicators = params.indicators || ['RSI', 'MACD', 'EMA', 'ATR', 'ADX', 'Stochastic', 'Bollinger'];
    let model: any = null;

    if (params.modelId) {
      const { data: existing } = await service.from('ml_models').select('*').eq('id', params.modelId).maybeSingle();
      if (existing) {
        const newVersion = (parseFloat(existing.version || '1.0') + 0.1).toFixed(1);
        const { data, error } = await service.from('ml_models')
          .update({
            accuracy: Number(accuracy.toFixed(4)),
            params: trainingStats,
            indicators,
            last_trained_at: new Date().toISOString(),
            version: newVersion,
          })
          .eq('id', existing.id).select().single();
        if (error) throw error;
        model = data;
      }
    }

    if (!model) {
      const { data, error } = await service.from('ml_models')
        .insert({
          user_id: userId,
          name: modelName,
          type: requestedType,
          version: '1.0',
          params: trainingStats,
          is_active: true,
          accuracy: Number(accuracy.toFixed(4)),
          indicators,
          last_trained_at: new Date().toISOString(),
        })
        .select().single();
      if (error) throw error;
      model = data;
    }

    await service.from('model_versions').upsert({
      user_id: userId,
      model_id: model.id,
      version: model.version || '1.0',
      previous_version: params.previousVersion || null,
      trained_at: model.last_trained_at || new Date().toISOString(),
      activated_for_signals_at: new Date().toISOString(),
      trigger_reason: params.triggerReason || 'manual',
      executed_trade_count: closedTrades.length,
      trade_sample_window_start: windowStart,
      trade_sample_window_end: windowEnd,
      metrics: trainingStats.metrics,
      model_snapshot: {
        name: model.name,
        type: model.type,
        actual_algorithm: honestLabel,
        accuracy: model.accuracy,
        indicators,
        params: trainingStats,
      },
    }, { onConflict: 'model_id,version' });

    return json({
      success: true,
      model: {
        id: model.id,
        name: model.name,
        type: model.type,
        actual_algorithm: honestLabel,
        accuracy: model.accuracy,
        version: model.version,
        is_active: model.is_active,
        indicators: model.indicators,
        created_at: model.created_at,
        last_trained_at: model.last_trained_at,
        isPropFirm,
        metrics: trainingStats.metrics,
        feature_importance: trainingStats.feature_importance,
        risk_metrics: trainingStats.risk_metrics,
        dataset: trainingStats.dataset,
        notes: trainingStats.notes,
      },
    });
  } catch (error) {
    console.error('Error training model:', error);
    return json({ success: false, error: (error as Error).message }, 500);
  }
});
