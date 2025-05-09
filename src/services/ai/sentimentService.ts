
import { supabase } from "@/integrations/supabase/client";
import { MarketSentiment } from "./types";

// Function to fetch market sentiment data
export const getMarketSentiment = async (symbol: string) => {
  try {
    const { data, error } = await (supabase as any)
      .from('market_sentiment')
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
