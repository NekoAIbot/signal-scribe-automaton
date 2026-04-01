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
      // Fetch real market data from the market quotes edge function
      const { data: quoteData, error: quoteError } = await supabase.functions.invoke('fetch-market-quotes', {
        body: { symbols: 'EURUSD,GBPUSD,USDJPY,AUDUSD,BTCUSD,ETHUSD,XAUUSD,SPX' }
      });

      if (quoteError) {
        console.error('Quote fetch error:', quoteError);
      }

      const quotes = quoteData?.quotes || {};
      const candles = quoteData?.candles || {};

      // Build real market data payload from live quotes
      const pairs = Object.entries(quotes).map(([sym, q]: [string, any]) => {
        const history = candles[sym] || [];
        const rsi = calculateRSI(history);
        const ema12 = calculateEMA(history, 12);
        const ema26 = calculateEMA(history, 26);
        const macdValue = ema12 - ema26;
        const mid = (q.bid + q.ask) / 2;
        const prevMid = history.length > 1 ? history[history.length - 2] : mid;
        const change24h = prevMid ? ((mid - prevMid) / prevMid) * 100 : 0;

        return {
          symbol: sym.length === 6 ? sym.slice(0, 3) + '/' + sym.slice(3) : sym,
          price: mid,
          bid: q.bid,
          ask: q.ask,
          change24h: Number(change24h.toFixed(4)),
          rsi: Number(rsi.toFixed(2)),
          macd: { value: Number(macdValue.toFixed(6)), signal: 0 },
          dataPoints: history.length,
        };
      });

      const marketData = {
        pairs,
        source: quoteData?.source || 'unknown',
        overallVolatility: pairs.some(p => Math.abs(p.change24h) > 1) ? 'high' : pairs.some(p => Math.abs(p.change24h) > 0.3) ? 'medium' : 'low',
        marketHours: getMarketSession(),
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
        toast.success("AI analysis complete with live market data!");
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

  const activateAllSelections = () => {
    if (strategies.length === 0 || models.length === 0) {
      toast.error('Create strategies and train models first');
      return;
    }

    onApplyRecommendations(
      strategies.map(strategy => strategy.id),
      models.map(model => model.id)
    );
    toast.success('All saved strategies and trained models are now active.');
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
          AI analyzes live market data and recommends the best strategies and models
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <Button 
            onClick={analyzeMarket} 
            disabled={isAnalyzing || strategies.length === 0 || models.length === 0}
            className="w-full"
            size="lg"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing Live Market Data...
              </>
            ) : (
              <>
                <Brain className="mr-2 h-4 w-4" />
                Run AI Analysis (Live Data)
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={activateAllSelections}
            disabled={strategies.length === 0 || models.length === 0 || isAnalyzing}
            className="w-full"
            size="lg"
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Use All Saved Strategies & Models
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          AI recommendations are additive, so you can combine AI-selected setups with your manual strategy and model choices.
        </p>

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
              Add AI Recommendations to Active Selection
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Helper functions for technical indicators
function calculateRSI(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50;
  const changes = prices.slice(-period - 1).map((p, i, arr) => i > 0 ? p - arr[i - 1] : 0).slice(1);
  const gains = changes.filter(c => c > 0);
  const losses = changes.filter(c => c < 0).map(c => Math.abs(c));
  const avgGain = gains.length ? gains.reduce((a, b) => a + b, 0) / period : 0;
  const avgLoss = losses.length ? losses.reduce((a, b) => a + b, 0) / period : 0;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateEMA(prices: number[], period: number): number {
  if (prices.length === 0) return 0;
  if (prices.length < period) return prices[prices.length - 1];
  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

function getMarketSession(): string {
  const hour = new Date().getUTCHours();
  if (hour >= 0 && hour < 7) return 'Asian Session';
  if (hour >= 7 && hour < 12) return 'London Session';
  if (hour >= 12 && hour < 16) return 'London/NY Overlap';
  if (hour >= 16 && hour < 21) return 'New York Session';
  return 'After Hours';
}
