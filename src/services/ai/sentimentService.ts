
import { MarketSentiment } from "./types";

// Function to get market sentiment data
export const getMarketSentiment = async (symbol?: string): Promise<MarketSentiment[]> => {
  try {
    // Return mock sentiment since database tables don't exist yet
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
    
    // Just return the sentiment record since we can't insert into database
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
