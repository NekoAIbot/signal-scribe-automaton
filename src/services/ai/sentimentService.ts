
import { supabase } from "@/integrations/supabase/client";
import { MarketSentiment } from "./types";

// Function to get market sentiment data
export const getMarketSentiment = async (symbol?: string): Promise<MarketSentiment[]> => {
  try {
    // Try to get sentiment from database
    try {
      let query = supabase
        .from('market_sentiment')
        .select('*')
        .order('collected_at', { ascending: false });
      
      if (symbol) {
        query = query.eq('symbol', symbol);
      }
      
      const { data, error } = await query;
      
      if (error) {
        // If the error is about the table not existing, use mock data
        if (error.code === '42P01') {
          console.log("Table 'market_sentiment' doesn't exist yet. Using mock data.");
          return generateMockSentiment(symbol);
        }
        throw error;
      }
      
      if (data && data.length > 0) {
        return data as MarketSentiment[];
      }
    } catch (dbError) {
      console.error("Database error fetching market sentiment:", dbError);
      // Continue with mock data
    }
    
    // Return mock sentiment if no real data found
    return generateMockSentiment(symbol);
  } catch (error) {
    console.error("Error fetching market sentiment:", error);
    
    // Return mock sentiment as fallback
    return generateMockSentiment(symbol);
  }
};

// Function to add a sentiment record
export const addSentimentRecord = async (sentiment: Omit<MarketSentiment, 'collected_at'>): Promise<MarketSentiment | null> => {
  try {
    const sentimentRecord: MarketSentiment = {
      ...sentiment,
      collected_at: new Date().toISOString()
    };
    
    // Try to insert into database - if table exists
    try {
      const tableCheck = supabase
        .from('market_sentiment')
        .select('symbol')
        .limit(1);
        
      const { error: tableCheckError } = await tableCheck;
      
      if (!tableCheckError || tableCheckError.code !== '42P01') {
        // Table exists, try to insert
        const { data, error } = await supabase
          .from('market_sentiment')
          .insert({
            symbol: sentimentRecord.symbol,
            sentiment_score: sentimentRecord.sentiment_score,
            news_sentiment: sentimentRecord.news_sentiment,
            social_sentiment: sentimentRecord.social_sentiment,
            source: sentimentRecord.source,
            collected_at: sentimentRecord.collected_at
          })
          .select()
          .single();
          
        if (error) throw error;
        
        if (data) {
          return data as MarketSentiment;
        }
      }
    } catch (dbError) {
      console.error("Database error adding sentiment record:", dbError);
      // Continue with the original record
    }
    
    return sentimentRecord;
  } catch (error) {
    console.error("Error adding sentiment record:", error);
    return null;
  }
};

// Function to generate mock sentiment data for development
export const generateMockSentiment = (filterSymbol?: string): MarketSentiment[] => {
  const symbols = filterSymbol ? [filterSymbol] : ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD'];
  const sources = ['twitter', 'news', 'reddit', 'stocktwits', 'analyst'];
  const sentiment: MarketSentiment[] = [];
  
  // Generate one sentiment record per symbol
  symbols.forEach((symbol) => {
    // Generate random scores between -1 and 1
    const newsSentiment = Math.random() * 2 - 1; // -1 to 1
    const socialSentiment = Math.random() * 2 - 1; // -1 to 1
    
    // Calculate overall score as weighted average
    const overallScore = (newsSentiment * 0.6) + (socialSentiment * 0.4);
    
    // Generate time within the last 24 hours
    const time = new Date();
    time.setHours(time.getHours() - Math.floor(Math.random() * 24));
    
    sentiment.push({
      symbol,
      sentiment_score: overallScore,
      news_sentiment: newsSentiment,
      social_sentiment: socialSentiment,
      source: sources[Math.floor(Math.random() * sources.length)],
      collected_at: time.toISOString()
    });
  });
  
  return sentiment;
};
