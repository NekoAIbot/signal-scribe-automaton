import { AIInsight, MLModel, TrainingParams } from "./types";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Function to get AI insights using real account/trade/signal data
export const getAIInsights = async (): Promise<AIInsight | null> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return null;

    const [tradesRes, signalsRes] = await Promise.all([
      supabase
        .from('trades')
        .select('symbol, profit, status, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('trading_signals')
        .select('symbol, signal_type, confidence, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100),
    ]);

    if (tradesRes.error) throw tradesRes.error;
    if (signalsRes.error) throw signalsRes.error;

    const trades = tradesRes.data || [];
    const signals = signalsRes.data || [];

    const closedTrades = trades.filter(t => t.status === 'closed');
    const pnl = closedTrades.reduce((sum, t) => sum + Number(t.profit || 0), 0);
    const wins = closedTrades.filter(t => Number(t.profit || 0) > 0).length;
    const winRate = closedTrades.length > 0 ? wins / closedTrades.length : 0;

    const avgConfidence = signals.length > 0
      ? signals.reduce((sum, s) => sum + Number(s.confidence || 0), 0) / signals.length
      : 0;

    const marketPrediction: AIInsight['marketPrediction'] = pnl >= 0 ? 'Bullish' : 'Bearish';
    const riskAssessment: AIInsight['riskAssessment'] =
      winRate >= 0.6 ? 'Low' : winRate >= 0.45 ? 'Medium' : 'High';

    const bySymbol: Record<string, { count: number; score: number }> = {};
    for (const s of signals) {
      const symbol = s.symbol || 'UNKNOWN';
      if (!bySymbol[symbol]) bySymbol[symbol] = { count: 0, score: 0 };
      bySymbol[symbol].count += 1;
      bySymbol[symbol].score += Number(s.confidence || 0);
    }

    const topOpportunities = Object.entries(bySymbol)
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, 3)
      .map(([symbol, meta]) => ({
        symbol,
        direction: 'BUY',
        score: Math.min(0.99, meta.score / Math.max(meta.count, 1)),
      }));

    return {
      marketPrediction,
      riskAssessment,
      confidenceLevel: Math.min(0.99, Math.max(0.3, avgConfidence || 0.5)),
      created_at: new Date().toISOString(),
      topOpportunities,
    };
  } catch (error) {
    console.error("Error fetching AI insights:", error);
    return null;
  }
};

// Function to get ML models from the real database
export const getMLModels = async (): Promise<MLModel[]> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return [];

    const { data, error } = await supabase
      .from('ml_models')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(model => ({
      id: model.id,
      name: model.name,
      type: model.type,
      version: model.version || '1.0',
      is_active: !!model.is_active,
      created_at: model.created_at || new Date().toISOString(),
      accuracy: Number(model.accuracy || 0),
      indicators: model.indicators || [],
      params: model.params || {},
      user_id: model.user_id,
      updated_at: model.updated_at,
      last_trained_at: model.last_trained_at,
    })) as MLModel[];
  } catch (error) {
    console.error("Error fetching ML models:", error);
    return [];
  }
};

// Function to train a new ML model using the real edge function
export const trainMLModel = async (params: TrainingParams): Promise<MLModel | null> => {
  try {
    toast.loading(`Training ${params.modelType} model, please wait...`);

    const { data, error } = await supabase.functions.invoke('train-ml-model', {
      body: params,
    });

    if (error) throw error;
    if (!data?.success || !data?.model) {
      throw new Error(data?.error || 'Model training failed');
    }

    toast.success(`${params.modelType} model training completed`);
    return data.model as MLModel;
  } catch (error) {
    console.error("Error training ML model:", error);
    toast.error(`Failed to train ${params.modelType} model: ${(error as Error).message}`);
    return null;
  }
};
