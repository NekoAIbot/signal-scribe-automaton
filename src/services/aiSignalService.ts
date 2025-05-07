
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Types for AI and ML features
export interface MLModel {
  id: string;
  name: string;
  type: 'DQN' | 'PPO' | 'LSTM' | 'Transformer';
  version: string;
  params?: any;
  is_active: boolean;
}

export interface TradingStrategy {
  id: string;
  name: string;
  description?: string;
  model_id?: string;
  parameters?: any;
  risk_profile: 'Low' | 'Medium' | 'High';
  is_active: boolean;
}

export interface MarketSentiment {
  symbol: string;
  sentiment_score: number;
  news_sentiment?: number;
  social_sentiment?: number;
  source: string;
  collected_at?: string;
}

export interface EnhancedSignal {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  price: number;
  time?: string;
  status: 'new' | 'executing' | 'executed' | 'failed';
  strategy_id?: string;
  strategy_name?: string;
  confidence_score?: number;
  technical_factors?: {
    rsi?: number;
    macd?: { value: number; signal: number };
    ema?: { short: number; long: number };
    volatility?: number;
    [key: string]: any;
  };
  sentiment_factors?: {
    news_score?: number;
    social_score?: number;
    overall_sentiment?: number;
    [key: string]: any;
  };
  stop_loss?: number;
  take_profit_levels?: number[];
  volatility_forecast?: number;
  risk_adjustment?: number;
  execution_data?: any;
}

// Function to fetch available ML models
export const getActiveModels = async () => {
  try {
    // Using type assertion to bypass TypeScript errors
    const { data, error } = await (supabase
      .from('ml_models') as any)
      .select('*')
      .eq('is_active', true);
      
    if (error) throw error;
    return data as MLModel[];
  } catch (error) {
    console.error("Error fetching ML models:", error);
    toast.error("Failed to load ML models");
    return [];
  }
};

// Function to fetch active trading strategies
export const getActiveStrategies = async () => {
  try {
    // Using type assertion to bypass TypeScript errors
    const { data, error } = await (supabase
      .from('trading_strategies') as any)
      .select('*')
      .eq('is_active', true);
      
    if (error) throw error;
    return data as TradingStrategy[];
  } catch (error) {
    console.error("Error fetching trading strategies:", error);
    toast.error("Failed to load trading strategies");
    return [];
  }
};

// Function to fetch market sentiment data
export const getMarketSentiment = async (symbol: string) => {
  try {
    // Using type assertion to bypass TypeScript errors
    const { data, error } = await (supabase
      .from('market_sentiment') as any)
      .select('*')
      .eq('symbol', symbol)
      .order('collected_at', { ascending: false })
      .limit(1);
      
    if (error) throw error;
    return data[0] as MarketSentiment | undefined;
  } catch (error) {
    console.error("Error fetching market sentiment:", error);
    return undefined;
  }
};

// Function to get enhanced signals with AI processing
export const getEnhancedSignals = async () => {
  try {
    // Using type assertion to bypass TypeScript errors
    const { data, error } = await (supabase
      .from('enhanced_signals') as any)
      .select('*')
      .order('time', { ascending: false })
      .limit(10);
      
    if (error) throw error;
    return data as EnhancedSignal[];
  } catch (error) {
    console.error("Error fetching enhanced signals:", error);
    toast.error("Failed to load AI trading signals");
    return [];
  }
};

// Generate AI-enhanced signal
export const generateEnhancedSignal = async (symbol: string, price: number, baseType: 'BUY' | 'SELL') => {
  try {
    // Get current market sentiment
    const sentiment = await getMarketSentiment(symbol);
    
    // Get active strategy
    const strategies = await getActiveStrategies();
    const activeStrategy = strategies.length > 0 ? strategies[0] : null;
    
    // Calculate confidence score based on technical and sentiment factors
    // This is a simplified version - in production, this would use ML model predictions
    const technicalScore = Math.random() * 0.6 + 0.4; // 0.4 to 1.0
    const sentimentScore = sentiment ? 
      (sentiment.sentiment_score + 1) / 2 : // Convert -1 to 1 range to 0 to 1
      0.5; // Neutral if no sentiment data
    
    const confidenceScore = (technicalScore * 0.7) + (sentimentScore * 0.3);
    
    // Calculate dynamic stop loss and take profit based on volatility
    const volatility = Math.random() * 0.05 + 0.01; // 1% to 6% volatility example
    const stopLossPercent = baseType === 'BUY' ? volatility * 1.5 : -volatility * 1.5;
    const stopLoss = baseType === 'BUY' ? 
      price * (1 - stopLossPercent) : 
      price * (1 + stopLossPercent);
    
    // Multiple take profit levels
    const takeProfitLevels = baseType === 'BUY' ?
      [price * 1.02, price * 1.05, price * 1.08] :
      [price * 0.98, price * 0.95, price * 0.92];
    
    // Create technical and sentiment factors objects
    const technicalFactors = {
      rsi: Math.random() * 100,
      macd: { value: Math.random() * 0.01 - 0.005, signal: Math.random() * 0.01 - 0.005 },
      ema: { short: price * (1 + (Math.random() * 0.02 - 0.01)), long: price * (1 + (Math.random() * 0.02 - 0.01)) },
      volatility: volatility
    };
    
    const sentimentFactors = sentiment ? {
      news_score: sentiment.news_sentiment,
      social_score: sentiment.social_sentiment,
      overall_sentiment: sentiment.sentiment_score
    } : { overall_sentiment: 0 };
    
    // Create the enhanced signal
    const newSignal = {
      symbol,
      type: baseType,
      price,
      status: 'new' as const,
      strategy_id: activeStrategy?.id,
      strategy_name: activeStrategy?.name,
      confidence_score: confidenceScore,
      technical_factors: technicalFactors,
      sentiment_factors: sentimentFactors,
      stop_loss: stopLoss,
      take_profit_levels: takeProfitLevels,
      volatility_forecast: volatility,
      risk_adjustment: confidenceScore * 0.8 // Risk scales with confidence
    };
    
    // Insert the signal into the database using type assertion to bypass TypeScript errors
    const { data, error } = await (supabase
      .from('enhanced_signals') as any)
      .insert(newSignal)
      .select();
      
    if (error) throw error;
    
    return data[0] as EnhancedSignal;
  } catch (error) {
    console.error("Error generating enhanced signal:", error);
    toast.error("Failed to generate AI trading signal");
    throw error;
  }
};

// Update the dashboard with AI insights
export const getAIInsights = async () => {
  try {
    // This would typically be a complex ML inference in production
    // Here we're generating example insights
    const insights = {
      marketPrediction: Math.random() > 0.5 ? 'Bullish' : 'Bearish',
      confidenceLevel: Math.floor(Math.random() * 100),
      keyFactors: [
        'High volume detected',
        'Positive sentiment trend',
        'Technical breakout pattern'
      ],
      riskAssessment: Math.random() > 0.7 ? 'High' : Math.random() > 0.4 ? 'Medium' : 'Low',
      recommendedAction: Math.random() > 0.6 ? 'Consider new positions' : 'Monitor existing positions'
    };
    
    return insights;
  } catch (error) {
    console.error("Error generating AI insights:", error);
    return null;
  }
};
