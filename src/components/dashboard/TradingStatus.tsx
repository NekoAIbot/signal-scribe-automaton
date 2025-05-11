
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { getAIInsights } from "@/services/ai/modelService";
import { useQuery } from "@tanstack/react-query";

export function TradingStatus() {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Fetch AI insights
  const { data: insights, isLoading: isLoadingInsights } = useQuery({
    queryKey: ['aiInsights'],
    queryFn: getAIInsights,
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000
  });
  
  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Format time as HH:MM:SS
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  
  // Get color based on market prediction
  const getMarketColor = (prediction?: string) => {
    if (!prediction) return "text-muted-foreground";
    switch (prediction) {
      case 'Bullish': return "text-success-DEFAULT";
      case 'Bearish': return "text-danger-DEFAULT";
      default: return "text-muted-foreground";
    }
  };
  
  return (
    <Card className="bg-trading-card border-trading-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Trading Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Current Time</p>
            <p className="text-xl font-bold">{formatTime(currentTime)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Market Prediction</p>
            {isLoadingInsights ? (
              <p className="text-xl font-bold">Loading...</p>
            ) : (
              <p className={`text-xl font-bold flex items-center ${getMarketColor(insights?.marketPrediction)}`}>
                {insights?.marketPrediction === 'Bullish' && <TrendingUp className="mr-1 h-5 w-5" />}
                {insights?.marketPrediction === 'Bearish' && <TrendingDown className="mr-1 h-5 w-5" />}
                {insights?.marketPrediction || 'Unknown'}
              </p>
            )}
          </div>
        </div>
        
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Risk Assessment</p>
          {isLoadingInsights ? (
            <p className="text-base">Loading...</p>
          ) : (
            <div className="flex items-center">
              <Badge variant={
                insights?.riskAssessment === 'High' ? "destructive" : 
                insights?.riskAssessment === 'Medium' ? "warning" : 
                "success"
              }>
                {insights?.riskAssessment || 'Unknown'}
              </Badge>
              <p className="ml-2 text-sm">
                Confidence: {Math.round((insights?.confidenceLevel || 0) * 100)}%
              </p>
            </div>
          )}
        </div>
        
        {insights?.topOpportunities && (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Top Opportunities</p>
            <div className="space-y-2">
              {insights.topOpportunities.map((opportunity: any, index: number) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span>{opportunity.symbol}</span>
                  <div className="flex items-center">
                    <Badge variant={opportunity.direction === 'BUY' ? "success" : "destructive"} className="mr-2">
                      {opportunity.direction}
                    </Badge>
                    <span>{Math.round(opportunity.score * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {!insights && !isLoadingInsights && (
          <div className="flex items-center justify-center py-4 text-center text-muted-foreground">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <span>Failed to load AI trading insights</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
