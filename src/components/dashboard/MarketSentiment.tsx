import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Twitter, Newspaper, TrendingUp, BarChart2, RefreshCcw } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";

interface SentimentSource {
  source: string;
  value: number;
  icon: React.ReactNode;
}

export function MarketSentiment() {
  const [loading, setLoading] = useState(true);
  const [sentimentData, setSentimentData] = useState({
    symbol: 'EUR/USD',
    overall: 0,
    sources: [] as SentimentSource[],
    keywords: [] as string[],
    updated: 'loading...',
  });

  useEffect(() => {
    fetchSentiment();
    const interval = setInterval(fetchSentiment, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchSentiment = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('ml-predictions', {
        body: { type: 'sentiment', symbol: 'EUR/USD' },
      });

      if (error) throw error;

      if (data?.sentiment) {
        const s = data.sentiment;
        setSentimentData({
          symbol: s.symbol || 'EUR/USD',
          overall: s.overall ?? 0,
          sources: [
            { source: 'Twitter', value: s.twitter ?? 0, icon: <Twitter className="h-4 w-4" /> },
            { source: 'News', value: s.news ?? 0, icon: <Newspaper className="h-4 w-4" /> },
            { source: 'Technical', value: s.technical ?? 0, icon: <TrendingUp className="h-4 w-4" /> },
            { source: 'Economic', value: s.economic ?? 0, icon: <BarChart2 className="h-4 w-4" /> },
          ],
          keywords: s.keywords || ['Market analysis', 'Interest rates', 'Economic data'],
          updated: 'just now',
        });
      }
    } catch (err) {
      console.error('Sentiment fetch error:', err);
      // Keep previous data on error
    } finally {
      setLoading(false);
    }
  };

  // Helper function to determine sentiment class
  const getSentimentClass = (value: number) => {
    if (value > 0.3) return "text-success-DEFAULT";
    if (value < -0.3) return "text-danger-DEFAULT";
    return "text-warning-DEFAULT";
  };
  
  // Helper function to convert sentiment value to percentage
  const sentimentToPercent = (value: number) => {
    // Convert -1.0 to 1.0 range to 0-100%
    return Math.round(((value + 1) / 2) * 100);
  };

  // Helper function to get sentiment label
  const getSentimentLabel = (value: number) => {
    if (value > 0.7) return "Very Bullish";
    if (value > 0.3) return "Bullish";
    if (value > -0.3) return "Neutral";
    if (value > -0.7) return "Bearish";
    return "Very Bearish";
  };

  return (
    <Card className="bg-trading-card border-trading-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">Market Sentiment Analysis</CardTitle>
        <Badge variant="outline" className="text-xs">
          Updated {sentimentData.updated}
        </Badge>
      </CardHeader>
      
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{sentimentData.symbol}</span>
            <Badge variant="default" className={
              sentimentData.overall > 0.3 ? "bg-success-DEFAULT" : 
              sentimentData.overall < -0.3 ? "bg-danger-DEFAULT" : 
              "bg-warning-DEFAULT"
            }>
              {getSentimentLabel(sentimentData.overall)}
            </Badge>
          </div>
          <span className={`text-lg font-bold ${getSentimentClass(sentimentData.overall)}`}>
            {sentimentToPercent(sentimentData.overall)}%
          </span>
        </div>
        
        <div className="space-y-3">
          {sentimentData.sources.map((source, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {source.icon}
                <span className="text-sm">{source.source}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-36 h-2 bg-trading-bg rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${getSentimentClass(source.value)}`}
                    style={{ 
                      width: `${sentimentToPercent(source.value)}%`,
                      backgroundColor: 'currentColor',
                      opacity: 0.5
                    }}
                  />
                </div>
                <span className={`text-sm ${getSentimentClass(source.value)}`}>
                  {sentimentToPercent(source.value)}%
                </span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4">
          <p className="text-sm font-medium mb-2">Trending Keywords</p>
          <div className="flex flex-wrap gap-2">
            {sentimentData.keywords.map((keyword, index) => (
              <Badge key={index} variant="outline" className="bg-trading-bg/50">
                {keyword}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
