import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function RiskEngine() {
  const [riskData, setRiskData] = useState({
    correlationRisk: 0,
    leverageRisk: 0,
    volatilityRisk: 0,
    overallRisk: 0,
  });

  useEffect(() => {
    fetchRiskData();
    const interval = setInterval(fetchRiskData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchRiskData = async () => {
    try {
      // Calculate risk from user's open trades
      const { data: trades } = await supabase
        .from('trades')
        .select('*')
        .eq('status', 'open');

      if (trades && trades.length > 0) {
        // Correlation: how many trades on similar pairs
        const symbols = trades.map(t => t.symbol);
        const uniqueSymbols = new Set(symbols);
        const correlationRisk = Math.min(100, Math.round((1 - uniqueSymbols.size / Math.max(symbols.length, 1)) * 100));

        // Leverage: total lot size exposure
        const totalLots = trades.reduce((sum, t) => sum + (t.lot_size || 0.01), 0);
        const leverageRisk = Math.min(100, Math.round(totalLots * 50));

        // Volatility: based on unrealized PnL swing
        const totalProfit = trades.reduce((sum, t) => sum + Math.abs(t.profit || 0), 0);
        const volatilityRisk = Math.min(100, Math.round(totalProfit * 2));

        const overallRisk = Math.round((correlationRisk + leverageRisk + volatilityRisk) / 3);

        setRiskData({ correlationRisk, leverageRisk, volatilityRisk, overallRisk });
      } else {
        setRiskData({ correlationRisk: 0, leverageRisk: 0, volatilityRisk: 0, overallRisk: 0 });
      }
    } catch (err) {
      console.error('Risk calculation error:', err);
    }
  };
  
  // Function to determine risk level description and styling
  const getRiskLevel = (value: number): { 
    label: string; 
    variant: "default" | "destructive" | "outline" | "secondary" | "success" | "warning" | "info" 
  } => {
    if (value <= 20) return { label: "Very Low", variant: "success" };
    if (value <= 40) return { label: "Low", variant: "success" };
    if (value <= 60) return { label: "Moderate", variant: "warning" };
    if (value <= 80) return { label: "High", variant: "warning" };
    return { label: "Very High", variant: "destructive" };
  };
  
  const overallRiskLevel = getRiskLevel(riskData.overallRisk);
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Risk Engine</CardTitle>
        <CardDescription>
          <div className="flex justify-between items-center">
            <span>Overall Market Risk</span>
            <Badge 
              variant={overallRiskLevel.variant} 
              className="ml-2"
            >
              {overallRiskLevel.label}
            </Badge>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <div className="flex justify-between mb-1">
            <span>Correlation Risk</span>
            <Badge 
              variant={getRiskLevel(riskData.correlationRisk).variant} 
              className="text-xs"
            >
              {getRiskLevel(riskData.correlationRisk).label}
            </Badge>
          </div>
          <Progress value={riskData.correlationRisk} className="h-2" />
        </div>
        
        <div>
          <div className="flex justify-between mb-1">
            <span>Leverage Risk</span>
            <Badge 
              variant={getRiskLevel(riskData.leverageRisk).variant} 
              className="text-xs"
            >
              {getRiskLevel(riskData.leverageRisk).label}
            </Badge>
          </div>
          <Progress value={riskData.leverageRisk} className="h-2" />
        </div>
        
        <div>
          <div className="flex justify-between mb-1">
            <span>Volatility Risk</span>
            <Badge 
              variant={getRiskLevel(riskData.volatilityRisk).variant} 
              className="text-xs"
            >
              {getRiskLevel(riskData.volatilityRisk).label}
            </Badge>
          </div>
          <Progress value={riskData.volatilityRisk} className="h-2" />
        </div>
        
        <div className="text-xs text-muted-foreground mt-2">
          <div>AI Risk Engine evaluates multiple risk factors in real-time</div>
          <div className="flex items-center gap-1 mt-1">
            <ArrowRight className="h-3 w-3" /> 
            <span>Adjust position sizing based on current risk level</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
