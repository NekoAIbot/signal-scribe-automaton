
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, TrendingDown, TrendingUp, AlertTriangle, BarChart3 } from 'lucide-react';

export function RiskEngine() {
  // This would normally come from an API or service
  const riskData = {
    overallRisk: 38,
    volatilityForecast: 'Medium',
    drawdownPrediction: {
      probability: 15,
      expectedSize: '2.4%'
    },
    correlationRisk: 'Low',
    marketSentiment: 'Neutral',
    riskFactors: [
      { name: 'News volatility', status: 'High' },
      { name: 'Technical levels', status: 'Medium' },
      { name: 'Liquidity', status: 'Low' },
      { name: 'Market sentiment', status: 'Medium' }
    ]
  };

  // Helper function for badge variants
  const getRiskBadgeVariant = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'high':
        return { variant: "outline", className: "border-danger-DEFAULT text-danger-DEFAULT" };
      case 'medium':
        return { variant: "outline", className: "border-warning-DEFAULT text-warning-DEFAULT" };
      case 'low':
        return { variant: "outline", className: "border-success-DEFAULT text-success-DEFAULT" };
      default:
        return { variant: "outline", className: "border-info-DEFAULT text-info-DEFAULT" };
    }
  };

  return (
    <Card className="bg-trading-card border-trading-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle className="text-base font-medium">Predictive Risk Engine</CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm">Overall Risk Level</span>
              <span className="text-sm font-medium">{riskData.overallRisk}%</span>
            </div>
            <Progress 
              value={riskData.overallRisk} 
              className="h-2" 
              indicatorClassName={riskData.overallRisk < 30 ? "bg-success-DEFAULT" : riskData.overallRisk < 70 ? "bg-warning-DEFAULT" : "bg-danger-DEFAULT"}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-1 mb-1">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Volatility Forecast</span>
              </div>
              <Badge {...getRiskBadgeVariant(riskData.volatilityForecast)}>
                {riskData.volatilityForecast}
              </Badge>
            </div>
            
            <div>
              <div className="flex items-center gap-1 mb-1">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Correlation Risk</span>
              </div>
              <Badge {...getRiskBadgeVariant(riskData.correlationRisk)}>
                {riskData.correlationRisk}
              </Badge>
            </div>
          </div>
          
          <div className="bg-trading-bg p-3 rounded-md">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-danger-DEFAULT" />
              <p className="text-sm font-medium">Drawdown Prediction</p>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1">
              <div className="flex items-center">
                <div className="mr-2 h-2.5 w-2.5 rounded-full bg-warning-DEFAULT" />
                <span className="text-xs text-muted-foreground">Probability:</span>
                <span className="text-xs ml-1">{riskData.drawdownPrediction.probability}%</span>
              </div>
              <div className="flex items-center">
                <div className="mr-2 h-2.5 w-2.5 rounded-full bg-danger-DEFAULT" />
                <span className="text-xs text-muted-foreground">Size:</span>
                <span className="text-xs ml-1">{riskData.drawdownPrediction.expectedSize}</span>
              </div>
            </div>
          </div>
          
          <div>
            <p className="text-sm font-medium mb-2">Risk Factors</p>
            <div className="space-y-2">
              {riskData.riskFactors.map((factor, idx) => (
                <div key={idx} className="flex items-center justify-between bg-trading-bg/50 px-3 py-2 rounded-md">
                  <span className="text-xs">{factor.name}</span>
                  <Badge {...getRiskBadgeVariant(factor.status)} variant="outline">
                    {factor.status === 'High' && <AlertTriangle className="h-3 w-3 mr-1" />}
                    {factor.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
