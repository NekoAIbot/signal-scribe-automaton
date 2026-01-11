import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { Brain, Loader2, TrendingUp, TrendingDown, Activity, AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

interface Strategy {
  id: string;
  name: string;
  risk_profile?: string;
  is_active?: boolean;
  indicators?: string[];
}

interface Model {
  id: string;
  name: string;
  type: string;
  accuracy?: number;
}

interface AIRecommendation {
  market_analysis: {
    trend: string;
    volatility: string;
    sentiment: string;
    key_levels?: number[];
  };
  recommended_strategies: Array<{
    strategy_id: string;
    confidence: number;
    reason: string;
  }>;
  recommended_models: Array<{
    model_id: string;
    confidence: number;
    reason: string;
  }>;
  overall_recommendation: string;
  risk_assessment: string;
}

interface AIStrategySelectorProps {
  strategies: Strategy[];
  models: Model[];
  onApplyRecommendations: (strategyIds: string[], modelIds: string[]) => void;
}

export function AIStrategySelector({ strategies, models, onApplyRecommendations }: AIStrategySelectorProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendation, setRecommendation] = useState<AIRecommendation | null>(null);

  const analyzeMarket = async () => {
    if (strategies.length === 0 || models.length === 0) {
      toast.error("You need at least one strategy and one model for AI analysis");
      return;
    }

    setIsAnalyzing(true);
    setRecommendation(null);

    try {
      // Get current market data (mock for now, would be real in production)
      const marketData = {
        pairs: [
          { symbol: 'EUR/USD', price: 1.0850, change24h: 0.15, rsi: 55, macd: { value: 0.0012, signal: 0.0008 } },
          { symbol: 'GBP/USD', price: 1.2680, change24h: -0.22, rsi: 42, macd: { value: -0.0018, signal: -0.0010 } },
          { symbol: 'USD/JPY', price: 149.50, change24h: 0.35, rsi: 68, macd: { value: 0.25, signal: 0.18 } },
        ],
        overallVolatility: 'medium',
        marketHours: 'London/NY overlap',
        economicEvents: ['Fed Speech', 'ECB Minutes'],
        timestamp: new Date().toISOString()
      };

      const { data, error } = await supabase.functions.invoke('ai-strategy-selector', {
        body: {
          marketData,
          availableModels: models,
          availableStrategies: strategies
        }
      });

      if (error) throw error;

      if (data?.success && data?.recommendation) {
        setRecommendation(data.recommendation);
        toast.success("AI analysis complete!");
      } else {
        throw new Error(data?.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('AI analysis error:', error);
      toast.error(`Analysis failed: ${(error as Error).message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyRecommendations = () => {
    if (!recommendation) return;

    const strategyIds = recommendation.recommended_strategies.map(s => s.strategy_id);
    const modelIds = recommendation.recommended_models.map(m => m.model_id);
    
    onApplyRecommendations(strategyIds, modelIds);
    toast.success("AI recommendations applied successfully!");
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'bullish': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'bearish': return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'volatile': return <Activity className="h-4 w-4 text-yellow-500" />;
      default: return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'low': return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">Low Risk</Badge>;
      case 'high': return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">High Risk</Badge>;
      default: return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">Medium Risk</Badge>;
    }
  };

  const getStrategyName = (id: string) => strategies.find(s => s.id === id)?.name || id;
  const getModelName = (id: string) => models.find(m => m.id === id)?.name || id;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Strategy Selector
        </CardTitle>
        <CardDescription>
          Let AI analyze market conditions and recommend the best strategies and models
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={analyzeMarket} 
          disabled={isAnalyzing || strategies.length === 0 || models.length === 0}
          className="w-full"
          size="lg"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing Market Conditions...
            </>
          ) : (
            <>
              <Brain className="mr-2 h-4 w-4" />
              Run AI Analysis
            </>
          )}
        </Button>

        {(strategies.length === 0 || models.length === 0) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-3 rounded-md">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            {strategies.length === 0 && models.length === 0
              ? "Create strategies and train models first"
              : strategies.length === 0
                ? "Create at least one strategy first"
                : "Train at least one model first"
            }
          </div>
        )}

        {recommendation && (
          <div className="space-y-4 mt-4 animate-in fade-in-50">
            {/* Market Analysis */}
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Market Analysis
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex items-center gap-2">
                  {getTrendIcon(recommendation.market_analysis.trend)}
                  <span className="text-sm capitalize">{recommendation.market_analysis.trend}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Volatility: </span>
                  <span className="capitalize">{recommendation.market_analysis.volatility}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Sentiment: </span>
                  <span className="capitalize">{recommendation.market_analysis.sentiment}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {getRiskBadge(recommendation.risk_assessment)}
              </div>
            </div>

            {/* Recommended Strategies */}
            {recommendation.recommended_strategies.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Recommended Strategies</h4>
                {recommendation.recommended_strategies.map((rec, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-background rounded-md border">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="font-medium">{getStrategyName(rec.strategy_id)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={rec.confidence * 100} className="w-20 h-2" />
                      <span className="text-sm text-muted-foreground">{(rec.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recommended Models */}
            {recommendation.recommended_models.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Recommended Models</h4>
                {recommendation.recommended_models.map((rec, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-background rounded-md border">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-primary" />
                      <span className="font-medium">{getModelName(rec.model_id)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={rec.confidence * 100} className="w-20 h-2" />
                      <span className="text-sm text-muted-foreground">{(rec.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Overall Recommendation */}
            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
              <h4 className="font-semibold text-sm mb-2">AI Recommendation</h4>
              <p className="text-sm text-muted-foreground">{recommendation.overall_recommendation}</p>
            </div>

            <Button onClick={applyRecommendations} className="w-full">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Apply AI Recommendations
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
