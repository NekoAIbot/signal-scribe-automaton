import { MarketSentiment } from "./types";
import { supabase } from "@/integrations/supabase/client";

// Function to get market sentiment data using recent stored signals
export const getMarketSentiment = async (symbol?: string): Promise<MarketSentiment[]> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return [];

    let query = supabase
      .from('trading_signals')
      .select('symbol, signal_type, confidence, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200);

    if (symbol) query = query.eq('symbol', symbol);

    const { data, error } = await query;
    if (error) throw error;

    const grouped = new Map<string, { buy: number; sell: number; confidence: number; count: number; latest: string }>();

    for (const row of data || []) {
      const key = row.symbol;
      const current = grouped.get(key) || { buy: 0, sell: 0, confidence: 0, count: 0, latest: row.created_at || new Date().toISOString() };
      if (row.signal_type === 'buy') current.buy += 1;
      if (row.signal_type === 'sell') current.sell += 1;
      current.confidence += Number(row.confidence || 0);
      current.count += 1;
      if (row.created_at && row.created_at > current.latest) current.latest = row.created_at;
      grouped.set(key, current);
    }

    return Array.from(grouped.entries()).map(([sym, stats]) => {
      const rawScore = (stats.buy - stats.sell) / Math.max(stats.count, 1);
      const confidenceAdj = Math.min(1, Math.max(0, stats.confidence / Math.max(stats.count, 1)));
      const sentimentScore = rawScore * (0.5 + confidenceAdj * 0.5);

      return {
        symbol: sym,
        sentiment_score: sentimentScore,
        news_sentiment: sentimentScore,
        social_sentiment: sentimentScore,
        source: 'signals',
        collected_at: stats.latest,
      };
    });
  } catch (error) {
    console.error("Error fetching market sentiment:", error);
    return [];
  }
};

// Function to add a sentiment record
export const addSentimentRecord = async (sentiment: Omit<MarketSentiment, 'collected_at'>): Promise<MarketSentiment | null> => {
  try {
    const sentimentRecord: MarketSentiment = {
      ...sentiment,
      collected_at: new Date().toISOString()
    };

    // No dedicated sentiment table currently exists, return computed record only.
    return sentimentRecord;
  } catch (error) {
    console.error("Error adding sentiment record:", error);
    return null;
  }
};
