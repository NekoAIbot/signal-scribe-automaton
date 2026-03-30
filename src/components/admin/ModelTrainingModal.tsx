import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from 'sonner';
import { Loader2, Brain, Zap, BarChart3 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface TrainingParams {
  name: string;
  modelType: 'LSTM' | 'Transformer' | 'DQN' | 'PPO' | 'GRU' | 'RandomForest' | 'XGBoost';
  epochs: number;
  learningRate: number;
  batchSize: number;
  dataWindow: number;
  indicators: string[];
  symbols: string[];
}

interface ModelTrainingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTrainingComplete: (model: any) => void;
}

const MODEL_DESCRIPTIONS: Record<string, { description: string; icon: React.ReactNode; bestFor: string }> = {
  'LSTM': { description: 'Long Short-Term Memory - Great for sequence prediction', icon: <Brain className="h-4 w-4" />, bestFor: 'Time series patterns' },
  'Transformer': { description: 'Attention-based model - Handles complex patterns', icon: <Zap className="h-4 w-4" />, bestFor: 'Multi-factor analysis' },
  'DQN': { description: 'Deep Q-Network - Reinforcement learning for trading', icon: <BarChart3 className="h-4 w-4" />, bestFor: 'Adaptive strategies' },
  'PPO': { description: 'Proximal Policy Optimization - Stable RL algorithm', icon: <BarChart3 className="h-4 w-4" />, bestFor: 'Complex decisions' },
  'GRU': { description: 'Gated Recurrent Unit - Efficient sequence model', icon: <Brain className="h-4 w-4" />, bestFor: 'Fast predictions' },
  'RandomForest': { description: 'Ensemble decision trees - Robust classification', icon: <BarChart3 className="h-4 w-4" />, bestFor: 'Signal classification' },
  'XGBoost': { description: 'Gradient boosting - High accuracy predictions', icon: <Zap className="h-4 w-4" />, bestFor: 'Feature-rich data' },
};

const AVAILABLE_INDICATORS = ['RSI', 'MACD', 'EMA', 'SMA', 'Bollinger Bands', 'ATR', 'Stochastic', 'ADX', 'CCI', 'Williams %R'];
const SYMBOL_CATEGORIES: Record<string, string[]> = {
  'Forex': ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'NZD/USD', 'USD/CHF', 'EUR/GBP',
    'EUR/JPY', 'GBP/JPY', 'AUD/JPY', 'EUR/AUD', 'GBP/AUD', 'EUR/CAD', 'GBP/CAD'],
  'Crypto': ['BTC/USD', 'ETH/USD', 'BNB/USD', 'SOL/USD', 'XRP/USD', 'ADA/USD'],
  'Indices': ['US500', 'US30', 'NAS100', 'UK100', 'GER40', 'JPN225'],
  'Commodities': ['XAU/USD', 'XAG/USD', 'USOIL', 'UKOIL', 'NATGAS'],
};
const AVAILABLE_SYMBOLS = Object.values(SYMBOL_CATEGORIES).flat();

export function ModelTrainingModal({
  open,
  onOpenChange,
  onTrainingComplete
}: ModelTrainingModalProps) {
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [params, setParams] = useState<TrainingParams>({
    name: '',
    modelType: 'LSTM',
    epochs: 100,
    learningRate: 0.001,
    batchSize: 32,
    dataWindow: 60,
    indicators: ['RSI', 'MACD', 'EMA'],
    symbols: ['EUR/USD', 'GBP/USD']
  });

  const handleTrain = async () => {
    if (!params.name.trim()) {
      toast.error("Please enter a model name");
      return;
    }

    if (params.indicators.length === 0) {
      toast.error("Please select at least one indicator");
      return;
    }

    setIsTraining(true);
    setTrainingProgress(0);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setTrainingProgress(prev => Math.min(prev + Math.random() * 15, 95));
      }, 500);

      // Call the edge function to train model
      const { data, error } = await supabase.functions.invoke('train-ml-model', {
        body: {
          modelType: params.modelType,
          epochs: params.epochs,
          learningRate: params.learningRate,
          batchSize: params.batchSize,
          dataWindow: params.dataWindow,
          indicators: params.indicators,
          symbols: params.symbols,
          name: params.name
        }
      });

      clearInterval(progressInterval);

      if (error) throw error;

      setTrainingProgress(100);

      if (data?.success && data?.model) {
        toast.success(`Model "${params.name}" trained successfully!`);
        onTrainingComplete({
          ...data.model,
          lastTrained: new Date().toLocaleDateString(),
          status: 'active'
        });
        onOpenChange(false);
      } else {
        throw new Error(data?.error || 'Training failed');
      }
    } catch (error) {
      console.error('Training error:', error);
      toast.error(`Training failed: ${(error as Error).message}`);
    } finally {
      setIsTraining(false);
      setTrainingProgress(0);
    }
  };

  const toggleIndicator = (indicator: string) => {
    setParams(prev => ({
      ...prev,
      indicators: prev.indicators.includes(indicator)
        ? prev.indicators.filter(i => i !== indicator)
        : [...prev.indicators, indicator]
    }));
  };

  const toggleSymbol = (symbol: string) => {
    setParams(prev => ({
      ...prev,
      symbols: prev.symbols.includes(symbol)
        ? prev.symbols.filter(s => s !== symbol)
        : [...prev.symbols, symbol]
    }));
  };

  const currentModelInfo = MODEL_DESCRIPTIONS[params.modelType];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Train New ML Model
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Model Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Model Name *</Label>
            <Input
              id="name"
              value={params.name}
              onChange={(e) => setParams({ ...params, name: e.target.value })}
              placeholder="Enter model name (e.g., LSTM Momentum v1)"
              disabled={isTraining}
            />
          </div>

          {/* Model Type Selection */}
          <div className="space-y-2">
            <Label>Model Type</Label>
            <Select
              value={params.modelType}
              onValueChange={(value) => setParams({ ...params, modelType: value as TrainingParams['modelType'] })}
              disabled={isTraining}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select model type" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(MODEL_DESCRIPTIONS).map(type => (
                  <SelectItem key={type} value={type}>
                    <div className="flex items-center gap-2">
                      {MODEL_DESCRIPTIONS[type].icon}
                      {type}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {currentModelInfo && (
              <div className="p-3 bg-muted rounded-md text-sm">
                <p className="text-muted-foreground">{currentModelInfo.description}</p>
                <p className="text-primary mt-1">Best for: {currentModelInfo.bestFor}</p>
              </div>
            )}
          </div>

          {/* Training Parameters */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Epochs: {params.epochs}</Label>
              <Slider
                value={[params.epochs]}
                onValueChange={([value]) => setParams({ ...params, epochs: value })}
                min={10}
                max={500}
                step={10}
                disabled={isTraining}
              />
            </div>
            <div className="space-y-2">
              <Label>Batch Size: {params.batchSize}</Label>
              <Slider
                value={[params.batchSize]}
                onValueChange={([value]) => setParams({ ...params, batchSize: value })}
                min={8}
                max={128}
                step={8}
                disabled={isTraining}
              />
            </div>
            <div className="space-y-2">
              <Label>Learning Rate: {params.learningRate}</Label>
              <Slider
                value={[params.learningRate * 1000]}
                onValueChange={([value]) => setParams({ ...params, learningRate: value / 1000 })}
                min={0.1}
                max={10}
                step={0.1}
                disabled={isTraining}
              />
            </div>
            <div className="space-y-2">
              <Label>Data Window: {params.dataWindow} bars</Label>
              <Slider
                value={[params.dataWindow]}
                onValueChange={([value]) => setParams({ ...params, dataWindow: value })}
                min={10}
                max={200}
                step={10}
                disabled={isTraining}
              />
            </div>
          </div>

          {/* Indicators Selection */}
          <div className="space-y-2">
            <Label>Technical Indicators</Label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_INDICATORS.map(indicator => (
                <Badge
                  key={indicator}
                  variant={params.indicators.includes(indicator) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => !isTraining && toggleIndicator(indicator)}
                >
                  {indicator}
                </Badge>
              ))}
            </div>
          </div>

          {/* Symbols Selection */}
          <div className="space-y-2">
            <Label>Training Symbols</Label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_SYMBOLS.map(symbol => (
                <Badge
                  key={symbol}
                  variant={params.symbols.includes(symbol) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => !isTraining && toggleSymbol(symbol)}
                >
                  {symbol}
                </Badge>
              ))}
            </div>
          </div>

          {/* Training Progress */}
          {isTraining && (
            <div className="space-y-2">
              <Label>Training Progress</Label>
              <div className="w-full bg-muted rounded-full h-2.5">
                <div
                  className="bg-primary h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${trainingProgress}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {trainingProgress < 100 ? 'Training in progress...' : 'Training complete!'}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isTraining}>
            Cancel
          </Button>
          <Button onClick={handleTrain} disabled={isTraining}>
            {isTraining ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Training...
              </>
            ) : (
              <>
                <Brain className="mr-2 h-4 w-4" />
                Start Training
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
