
import { supabase } from "@/integrations/supabase/client";
import { MarketSentiment } from "./types";
import { toast } from "sonner";

// Function to get market sentiment for a particular symbol
export const getMarketSentiment = async (symbol: string): Promise<MarketSentiment | null> => {
  try {
    // Try to get sentiment from database
    try {
      const { data, error } = await supabase
        .from('market_sentiments')
        .select('*')
        .eq('symbol', symbol)
        .order('collected_at', { ascending: false })
        .limit(1);
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        return data[0] as MarketSentiment;
      }
    } catch (dbError) {
      console.error("Database error fetching market sentiment:", dbError);
      // Continue to on-demand analysis or fallback
    }
    
    // If no sentiment found, try to analyze sentiment on-demand
    return await analyzeSentimentOnDemand(symbol);
  } catch (error) {
    console.error("Error fetching market sentiment:", error);
    
    // Return simulated sentiment for development
    return {
      symbol,
      sentiment_score: (Math.random() * 2) - 1, // -1 to 1
      news_sentiment: (Math.random() * 2) - 1, // -1 to 1
      social_sentiment: (Math.random() * 2) - 1, // -1 to 1
      source: 'simulation',
      collected_at: new Date().toISOString()
    };
  }
};

// Function to analyze sentiment on demand
export const analyzeSentimentOnDemand = async (symbol: string): Promise<MarketSentiment | null> => {
  try {
    // Call Supabase Edge Function for sentiment analysis
    const { data, error } = await supabase.functions.invoke('ml-predictions', {
      body: { symbol: symbol, type: 'sentiment-analysis', sources: ['news', 'social'] }
    });
    
    if (error) throw error;
    
    if (data && data.success) {
      // Try to store the sentiment in the database for future use
      try {
        const { error: insertError } = await supabase
          .from('market_sentiments')
          .insert({
            symbol: symbol,
            sentiment_score: data.sentiment.overall,
            news_sentiment: data.sentiment.news,
            social_sentiment: data.sentiment.social,
            source: 'api',
            collected_at: new Date().toISOString()
          });
          
        if (insertError) console.error("Error storing sentiment:", insertError);
      } catch (dbError) {
        console.error("Database error storing sentiment:", dbError);
        // Continue with function data even if DB insert fails
      }
      
      return {
        symbol,
        sentiment_score: data.sentiment.overall,
        news_sentiment: data.sentiment.news,
        social_sentiment: data.sentiment.social,
        source: 'api',
        collected_at: data.timestamp
      };
    }
    
    return null;
  } catch (error) {
    console.error("Error analyzing sentiment:", error);
    toast.error("Failed to analyze market sentiment");
    
    // Return simulated sentiment for development
    return {
      symbol,
      sentiment_score: (Math.random() * 2) - 1, // -1 to 1
      news_sentiment: (Math.random() * 2) - 1, // -1 to 1
      social_sentiment: (Math.random() * 2) - 1, // -1 to 1
      source: 'simulation',
      collected_at: new Date().toISOString()
    };
  }
};

// Function to get bulk sentiment for multiple symbols
export const getBulkSentiment = async (symbols: string[]): Promise<Record<string, MarketSentiment>> => {
  try {
    // Try to get sentiments from database
    let data;
    let error;
    
    try {
      const response = await supabase
        .from('market_sentiments')
        .select('*')
        .in('symbol', symbols)
        .order('collected_at', { ascending: false });
        
      data = response.data;
      error = response.error;
      
      if (error) throw error;
    } catch (dbError) {
      console.error("Database error fetching bulk sentiment:", dbError);
      // Continue with mock data
    }
    
    const result: Record<string, MarketSentiment> = {};
    
    // Get the latest sentiment for each symbol
    if (data && data.length > 0) {
      symbols.forEach(symbol => {
        const sentiments = data.filter(item => item.symbol === symbol);
        if (sentiments.length > 0) {
          result[symbol] = sentiments[0] as MarketSentiment;
        } else {
          // If no sentiment found for symbol, create a neutral one
          result[symbol] = {
            symbol,
            sentiment_score: 0,
            news_sentiment: 0,
            social_sentiment: 0,
            source: 'default',
            collected_at: new Date().toISOString()
          };
        }
      });
      
      return result;
    }
    
    // If database fetch failed or returned empty, generate simulated sentiments
    symbols.forEach(symbol => {
      result[symbol] = {
        symbol,
        sentiment_score: (Math.random() * 2) - 1, // -1 to 1
        news_sentiment: (Math.random() * 2) - 1, // -1 to 1
        social_sentiment: (Math.random() * 2) - 1, // -1 to 1
        source: 'simulation',
        collected_at: new Date().toISOString()
      };
    });
    
    return result;
  } catch (error) {
    console.error("Error fetching bulk sentiment:", error);
    
    // Return simulated sentiments
    const result: Record<string, MarketSentiment> = {};
    symbols.forEach(symbol => {
      result[symbol] = {
        symbol,
        sentiment_score: (Math.random() * 2) - 1, // -1 to 1
        news_sentiment: (Math.random() * 2) - 1, // -1 to 1
        social_sentiment: (Math.random() * 2) - 1, // -1 to 1
        source: 'simulation',
        collected_at: new Date().toISOString()
      };
    });
    
    return result;
  }
};
