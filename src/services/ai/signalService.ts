
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EnhancedSignal } from "./types";
import { getMarketSentiment } from "./sentimentService";
import { getActiveStrategies } from "./modelService";

// Function to get enhanced signals with AI processing
export const getEnhancedSignals = async () => {
  try {
    const { data, error } = await (supabase as any)
      .from('enhanced_signals')
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
    
    // Insert the signal into the database
    const { data, error } = await (supabase as any)
      .from('enhanced_signals')
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
