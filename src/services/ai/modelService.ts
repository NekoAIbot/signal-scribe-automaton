
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  MLModel, 
  TradingStrategy, 
  TechnicalIndicator, 
  TrainingParams,
  BacktestParams,
  BacktestResult,
  AIInsight
} from "./types";

// Function to fetch available ML models
export const getActiveModels = async () => {
  try {
    const { data, error } = await supabase
      .from('ml_models')
      .select('*')
      .eq('is_active', true);
      
    if (error) throw error;
    return data as MLModel[];
  } catch (error) {
    console.error("Error fetching ML models:", error);
    toast.error("Failed to load ML models");
    
    // Return fallback data for development
    return [
      { id: '1', name: 'Forex Price Predictor', type: 'LSTM', version: '1.2.0', is_active: true, accuracy: 0.78, indicators: ['RSI', 'MACD', 'EMA'] },
      { id: '2', name: 'Market Sentiment Analyzer', type: 'Transformer', version: '2.1.0', is_active: true, accuracy: 0.82, indicators: ['RSI', 'Bollinger Bands', 'Volume'] },
      { id: '3', name: 'Volatility Forecaster', type: 'GRU', version: '1.0.5', is_active: true, accuracy: 0.75, indicators: ['ATR', 'Bollinger Bands', 'Stochastic'] }
    ];
  }
};

// Function to get AI insights for market analysis
export const getAIInsights = async (): Promise<AIInsight> => {
  try {
    const { data, error } = await supabase
      .from('ai_insights')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (error) throw error;
    
    if (data && data.length > 0) {
      return data[0] as AIInsight;
    }
    
    // Return default data if no insights found
    return {
      marketPrediction: "Neutral",
      riskAssessment: "Medium",
      confidenceLevel: 65,
      created_at: new Date().toISOString()
    };
  } catch (error) {
    console.error("Error fetching AI insights:", error);
    toast.error("Failed to load AI insights");
    
    // Return fallback data
    return {
      marketPrediction: "Neutral",
      riskAssessment: "Medium",
      confidenceLevel: 65,
      created_at: new Date().toISOString()
    };
  }
};

// Function to fetch active trading strategies
export const getActiveStrategies = async () => {
  try {
    const { data, error } = await supabase
      .from('trading_strategies')
      .select('*')
      .eq('is_active', true);
      
    if (error) throw error;
    return data as TradingStrategy[];
  } catch (error) {
    console.error("Error fetching trading strategies:", error);
    toast.error("Failed to load trading strategies");
    
    // Return fallback data for development
    return [
      { 
        id: '1', 
        name: 'Trend Following', 
        description: 'Uses moving averages to identify trends',
        model_id: '1',
        risk_profile: 'Medium',
        is_active: true,
        indicators: ['EMA', 'MACD', 'ADX'],
        timeframes: ['1h', '4h', 'D1']
      },
      { 
        id: '2', 
        name: 'RSI Reversal', 
        description: 'Spots overbought and oversold conditions',
        model_id: '2',
        risk_profile: 'High',
        is_active: true,
        indicators: ['RSI', 'Stochastic', 'CCI'],
        timeframes: ['15m', '1h', '4h']
      }
    ];
  }
};

// Function to fetch available technical indicators
export const getAvailableIndicators = async () => {
  try {
    const { data, error } = await supabase
      .from('technical_indicators')
      .select('*');
      
    if (error) throw error;
    return data as TechnicalIndicator[];
  } catch (error) {
    console.error("Error fetching technical indicators:", error);
    toast.error("Failed to load technical indicators");
    
    // Return fallback data
    return [
      {
        id: '1',
        name: 'RSI',
        description: 'Relative Strength Index',
        parameters: { period: { type: 'number', default: 14, min: 2, max: 50 } },
        is_active: true,
        category: 'momentum'
      },
      {
        id: '2',
        name: 'MACD',
        description: 'Moving Average Convergence Divergence',
        parameters: { 
          fastPeriod: { type: 'number', default: 12, min: 2, max: 50 },
          slowPeriod: { type: 'number', default: 26, min: 2, max: 50 },
          signalPeriod: { type: 'number', default: 9, min: 2, max: 50 }
        },
        is_active: true,
        category: 'momentum'
      },
      {
        id: '3',
        name: 'Bollinger Bands',
        description: 'Volatility bands placed above and below a moving average',
        parameters: { 
          period: { type: 'number', default: 20, min: 2, max: 100 },
          stdDev: { type: 'number', default: 2, min: 1, max: 5 }
        },
        is_active: true,
        category: 'volatility'
      },
      {
        id: '4',
        name: 'EMA',
        description: 'Exponential Moving Average',
        parameters: { period: { type: 'number', default: 20, min: 2, max: 200 } },
        is_active: true,
        category: 'trend'
      },
      {
        id: '5',
        name: 'ATR',
        description: 'Average True Range',
        parameters: { period: { type: 'number', default: 14, min: 1, max: 50 } },
        is_active: true,
        category: 'volatility'
      }
    ];
  }
};

// Function to train a new model
export const trainModel = async (params: TrainingParams): Promise<MLModel> => {
  try {
    const { data, error } = await supabase.functions.invoke('train-ml-model', {
      body: JSON.stringify(params)
    });
    
    if (error) throw error;
    
    toast.success("Model training completed successfully");
    return data.model;
  } catch (error) {
    console.error("Error training model:", error);
    toast.error("Failed to train model");
    
    // Return simulated result for development
    return {
      id: `new-${Date.now()}`,
      name: `${params.modelType} ${new Date().toLocaleDateString()}`,
      type: params.modelType,
      version: '1.0.0',
      params: params,
      is_active: false,
      accuracy: 0.7 + Math.random() * 0.2, // 0.7-0.9 range
      created_at: new Date().toISOString(),
      indicators: params.indicators || ['RSI', 'MACD', 'EMA']
    };
  }
};

// Function to run a backtest on a strategy
export const runBacktest = async (params: BacktestParams): Promise<BacktestResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('backtest-strategy', {
      body: JSON.stringify(params)
    });
    
    if (error) throw error;
    
    toast.success("Backtest completed successfully");
    return data.result;
  } catch (error) {
    console.error("Error running backtest:", error);
    toast.error("Failed to run backtest");
    
    // Return simulated result
    return {
      id: `backtest-${Date.now()}`,
      strategyId: params.strategyId,
      startDate: params.startDate,
      endDate: params.endDate,
      totalTrades: 30 + Math.floor(Math.random() * 20),
      winRate: 0.55 + Math.random() * 0.2,
      profitFactor: 1.2 + Math.random() * 0.8,
      sharpeRatio: 1.0 + Math.random() * 1.0,
      maxDrawdown: 5 + Math.random() * 10,
      netProfit: Math.random() * 5000,
      symbols: params.symbols,
      tradesData: []
    };
  }
};
