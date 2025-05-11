
import { supabase } from "@/integrations/supabase/client";
import { MLModel, TrainingParams, BacktestResult, BacktestParams } from "./types";
import { toast } from "sonner";

// Mock ML models for development
const mockModels: MLModel[] = [
  {
    id: '1',
    name: 'LSTM Forex Model',
    type: 'LSTM',
    version: '1.0.0',
    is_active: true,
    accuracy: 0.78,
    indicators: ['RSI', 'MACD', 'Bollinger Bands'],
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Deep Q-Network',
    type: 'DQN',
    version: '2.1.3',
    is_active: true,
    accuracy: 0.72,
    indicators: ['Stochastic', 'ATR', 'Moving Averages'],
    created_at: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Transformer Model',
    type: 'Transformer',
    version: '1.2.0',
    is_active: false,
    accuracy: 0.81,
    indicators: ['RSI', 'Volume Profile', 'Price Action'],
    created_at: new Date().toISOString()
  }
];

// Get all ML models
export const getMLModels = async (): Promise<MLModel[]> => {
  try {
    // Try to get models from database
    const { data, error } = await supabase
      .from('ml_models')
      .select('*');
      
    if (error) throw error;
    
    if (data && data.length > 0) {
      return data as MLModel[];
    }
    
    // Return mock data if no models found in database
    return mockModels;
  } catch (error) {
    console.error("Error fetching ML models:", error);
    toast.error("Failed to load ML models, using mock data");
    
    // Return mock data in case of error
    return mockModels;
  }
};

// Get a single ML model by ID
export const getMLModelById = async (modelId: string): Promise<MLModel | null> => {
  try {
    // Try to get model from database
    const { data, error } = await supabase
      .from('ml_models')
      .select('*')
      .eq('id', modelId)
      .single();
      
    if (error) throw error;
    
    return data as MLModel;
  } catch (error) {
    console.error(`Error fetching ML model ${modelId}:`, error);
    
    // Return mock model if ID matches
    const mockModel = mockModels.find(m => m.id === modelId);
    if (mockModel) return mockModel;
    
    // Return first mock model as fallback
    return mockModels[0];
  }
};

// Train a new ML model
export const trainModel = async (params: TrainingParams): Promise<MLModel> => {
  try {
    toast.info(`Training ${params.modelType} model...`);
    
    // Try to call model training edge function
    const { data: functionData, error: functionError } = await supabase.functions.invoke('train-ml-model', {
      body: params
    });
    
    if (functionError) throw functionError;
    
    if (functionData && functionData.success && functionData.model) {
      // Try to insert new model into the database
      try {
        const { data, error } = await supabase
          .from('ml_models')
          .insert(functionData.model);
          
        if (error) throw error;
      } catch (dbError) {
        console.error("Error saving model to database:", dbError);
        // Continue with function data even if DB insert fails
      }
      
      toast.success(`${params.modelType} model trained successfully!`);
      return functionData.model as MLModel;
    }
    
    throw new Error("Model training failed or returned invalid data");
  } catch (error) {
    console.error("Error training model:", error);
    toast.error("Failed to train model. Using simulated result.");
    
    // Generate simulated training result
    const newModelId = `sim-${Date.now()}`;
    const accuracy = 0.6 + Math.random() * 0.3; // Between 0.6 and 0.9
    
    const simulatedModel: MLModel = {
      id: newModelId,
      name: `${params.modelType} Model ${newModelId.slice(-4)}`,
      type: params.modelType,
      version: '1.0.0',
      is_active: true,
      accuracy,
      indicators: params.indicators || ['RSI', 'MACD', 'EMA'],
      created_at: new Date().toISOString(),
    };
    
    return simulatedModel;
  }
};

// Run backtest on a strategy
export const runBacktest = async (params: BacktestParams): Promise<BacktestResult> => {
  try {
    toast.info(`Running backtest for strategy ${params.strategyId}...`);
    
    // Try to call backtest edge function
    const { data, error } = await supabase.functions.invoke('backtest-strategy', {
      body: params
    });
    
    if (error) throw error;
    
    if (data && data.success && data.result) {
      toast.success("Backtest completed successfully!");
      return data.result as BacktestResult;
    }
    
    throw new Error("Backtest failed or returned invalid data");
  } catch (error) {
    console.error("Error running backtest:", error);
    toast.error("Failed to run backtest. Using simulated result.");
    
    // Generate simulated backtest result
    const winRate = 0.55 + Math.random() * 0.25; // Between 0.55 and 0.8
    const profitFactor = 1.2 + Math.random() * 1.3; // Between 1.2 and 2.5
    const totalTrades = Math.floor(50 + Math.random() * 150); // Between 50 and 200 trades
    const winningTrades = Math.floor(totalTrades * winRate);
    const netProfit = Math.floor((params.initialCapital || 10000) * (Math.random() * 0.3)); // Up to 30% profit
    
    const simulatedBacktest: BacktestResult = {
      id: `sim-${Date.now()}`,
      strategyId: params.strategyId,
      startDate: params.startDate,
      endDate: params.endDate,
      totalTrades,
      winRate: Number(winRate.toFixed(2)),
      profitFactor: Number(profitFactor.toFixed(2)),
      sharpeRatio: Number((0.8 + Math.random() * 1.2).toFixed(2)), // Between 0.8 and 2.0
      maxDrawdown: Number((5 + Math.random() * 15).toFixed(2)), // Between 5% and 20%
      netProfit,
      symbols: params.symbols,
      tradesData: []
    };
    
    return simulatedBacktest;
  }
};

// Get AI insights for the market
export const getAIInsights = async (): Promise<any> => {
  // Simulated AI insights for development
  const marketOutlook = ['Bullish', 'Bearish', 'Neutral'][Math.floor(Math.random() * 3)];
  const confidence = Math.round((0.6 + Math.random() * 0.39) * 100); // 60-99% confidence
  
  return {
    marketPrediction: marketOutlook,
    riskAssessment: Math.random() > 0.5 ? 'Medium' : Math.random() > 0.5 ? 'Low' : 'High',
    confidenceLevel: confidence / 100,
    created_at: new Date().toISOString(),
    topOpportunities: [
      { symbol: 'EUR/USD', score: Number((0.6 + Math.random() * 0.4).toFixed(2)), direction: Math.random() > 0.5 ? 'BUY' : 'SELL' },
      { symbol: 'GBP/USD', score: Number((0.6 + Math.random() * 0.4).toFixed(2)), direction: Math.random() > 0.5 ? 'BUY' : 'SELL' },
      { symbol: 'USD/JPY', score: Number((0.6 + Math.random() * 0.4).toFixed(2)), direction: Math.random() > 0.5 ? 'BUY' : 'SELL' },
    ],
    riskFactors: [
      { factor: 'Market Volatility', level: Math.random() > 0.5 ? 'High' : 'Medium' },
      { factor: 'Economic Events', level: Math.random() > 0.5 ? 'Medium' : 'Low' },
      { factor: 'Liquidity', level: Math.random() > 0.5 ? 'High' : 'Medium' }
    ]
  };
};
