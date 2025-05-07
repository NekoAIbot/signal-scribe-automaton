
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowRight } from "lucide-react";

export function RiskEngine() {
  // In a real app, this would come from a risk engine service
  const [riskData] = useState({
    correlationRisk: 28,
    leverageRisk: 62,
    volatilityRisk: 45,
    overallRisk: 42,
  });
  
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
        <CardDescription className="flex justify-between items-center">
          <span>Overall Market Risk</span>
          <Badge 
            variant={overallRiskLevel.variant} 
            className="ml-2"
          >
            {overallRiskLevel.label}
          </Badge>
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
          <p>AI Risk Engine evaluates multiple risk factors in real-time</p>
          <p className="flex items-center gap-1 mt-1">
            <ArrowRight className="h-3 w-3" /> 
            <span>Adjust position sizing based on current risk level</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
