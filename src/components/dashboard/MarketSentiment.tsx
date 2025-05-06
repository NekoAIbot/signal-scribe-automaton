
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Twitter, Newspaper, TrendingUp, BarChart2 } from 'lucide-react';

interface SentimentSource {
  source: string;
  value: number;
  icon: React.ReactNode;
}

export function MarketSentiment() {
  // This would normally come from an API call to the ML Predictions edge function
  const sentimentData = {
    symbol: 'EUR/USD',
    overall: 0.32, // -1.0 to 1.0
    sources: [
      { source: 'Twitter', value: 0.45, icon: <Twitter className="h-4 w-4" /> },
      { source: 'News', value: 0.25, icon: <Newspaper className="h-4 w-4" /> },
      { source: 'Technical', value: 0.28, icon: <TrendingUp className="h-4 w-4" /> },
      { source: 'Economic', value: 0.18, icon: <BarChart2 className="h-4 w-4" /> },
    ] as SentimentSource[],
    keywords: ['Federal Reserve', 'inflation', 'rate hike', 'economic growth'],
    updated: '3 minutes ago',
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
