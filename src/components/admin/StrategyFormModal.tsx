import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from 'sonner';
import { Badge } from "@/components/ui/badge";
import { Brain, Sparkles, X } from 'lucide-react';

export interface TradingStrategy {
  id: string;
  name: string;
  description: string;
  model_id: string;
  model_ids?: string[];
  risk_profile: 'Low' | 'Medium' | 'High';
  is_active: boolean;
  indicators: string[];
  ai_auto_select?: boolean;
}

interface StrategyFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialStrategy?: TradingStrategy;
  onSave: (strategy: TradingStrategy) => void;
  models: Array<{id: string, name: string, type?: string}>;
}

const COMMON_INDICATORS = ['RSI', 'MACD', 'EMA', 'SMA', 'Bollinger Bands', 'ATR', 'Stochastic', 'ADX', 'CCI', 'Williams %R', 'Fibonacci'];

export function StrategyFormModal({
  open,
  onOpenChange,
  initialStrategy,
  onSave,
  models
}: StrategyFormModalProps) {
  const [strategy, setStrategy] = useState<TradingStrategy>(initialStrategy || {
    id: `strategy-${Date.now()}`,
    name: '',
    description: '',
    model_id: models[0]?.id || '',
    model_ids: [],
    risk_profile: 'Medium',
    is_active: true,
    indicators: [],
    ai_auto_select: false
  });

  const [indicatorInput, setIndicatorInput] = useState('');
  const [useMultipleModels, setUseMultipleModels] = useState(false);

  // Reset form when modal opens with new data
  useEffect(() => {
    if (open) {
      if (initialStrategy) {
        setStrategy({
          ...initialStrategy,
          model_id: initialStrategy.model_id || initialStrategy.model_ids?.[0] || models[0]?.id || '',
          model_ids: initialStrategy.model_ids || [],
          indicators: initialStrategy.indicators || [],
          ai_auto_select: initialStrategy.ai_auto_select ?? false,
        });
        setUseMultipleModels((initialStrategy.model_ids?.length || 0) > 1);
      } else {
        setStrategy({
          id: `strategy-${Date.now()}`,
          name: '',
          description: '',
          model_id: models[0]?.id || '',
          model_ids: [],
          risk_profile: 'Medium',
          is_active: true,
          indicators: [],
          ai_auto_select: false
        });
        setUseMultipleModels(false);
      }
    }
  }, [open, initialStrategy, models]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setStrategy({
      ...strategy,
      [name]: value
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setStrategy({
      ...strategy,
      [name]: value
    });
  };

  const handleToggleActive = () => {
    setStrategy({
      ...strategy,
      is_active: !strategy.is_active
    });
  };

  const toggleModel = (modelId: string) => {
    const currentModelIds = strategy.model_ids || [];
    const newModelIds = currentModelIds.includes(modelId)
      ? currentModelIds.filter(id => id !== modelId)
      : [...currentModelIds, modelId];
    
    setStrategy({
      ...strategy,
      model_ids: newModelIds
    });
  };

  const toggleAllModels = () => {
    const nextSelection = (strategy.model_ids || []).length === models.length
      ? []
      : models.map(model => model.id);

    setStrategy({
      ...strategy,
      model_ids: nextSelection,
    });
  };

  const addIndicator = (indicator?: string) => {
    const toAdd = indicator || indicatorInput.trim();
    if (!toAdd) return;
    if (strategy.indicators.includes(toAdd)) {
      toast.error("Indicator already added");
      return;
    }
    
    setStrategy({
      ...strategy,
      indicators: [...strategy.indicators, toAdd]
    });
    setIndicatorInput('');
  };

  const removeIndicator = (indicator: string) => {
    setStrategy({
      ...strategy,
      indicators: strategy.indicators.filter(i => i !== indicator)
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!strategy.name) {
      toast.error("Please enter a strategy name");
      return;
    }

    // Validate model selection
    if (useMultipleModels) {
      if (!strategy.model_ids || strategy.model_ids.length === 0) {
        toast.error("Please select at least one model");
        return;
      }
    } else if (!strategy.model_id && !strategy.ai_auto_select) {
      toast.error("Please select a model or enable AI auto-selection");
      return;
    }
    
    const normalizedStrategy: TradingStrategy = {
      ...strategy,
      model_ids: strategy.ai_auto_select
        ? []
        : useMultipleModels
          ? strategy.model_ids || []
          : strategy.model_id
            ? [strategy.model_id]
            : []
    };

    onSave(normalizedStrategy);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialStrategy ? 'Edit Strategy' : 'Add New Strategy'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="name">Strategy Name *</Label>
            <Input 
              id="name"
              name="name"
              value={strategy.name}
              onChange={handleChange}
              placeholder="Enter strategy name"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input 
              id="description"
              name="description"
              value={strategy.description}
              onChange={handleChange}
              placeholder="Describe the strategy's approach"
            />
          </div>

          {/* AI Auto-Select Toggle */}
          <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">AI Auto-Selection</p>
                <p className="text-sm text-muted-foreground">Let AI choose the best model based on market conditions</p>
              </div>
            </div>
            <Switch
              checked={strategy.ai_auto_select}
              onCheckedChange={(checked) => setStrategy({ ...strategy, ai_auto_select: checked })}
            />
          </div>

          {!strategy.ai_auto_select && (
            <>
              {/* Multiple Models Toggle */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  <span className="text-sm font-medium">Use Multiple Models</span>
                </div>
                <Switch
                  checked={useMultipleModels}
                  onCheckedChange={setUseMultipleModels}
                />
              </div>

              {!useMultipleModels ? (
                <div className="space-y-2">
                  <Label htmlFor="model_id">ML Model</Label>
                  <Select 
                    value={strategy.model_id} 
                    onValueChange={(value) => handleSelectChange('model_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={models.length === 0 ? "No models available - train one first" : "Select ML model"} />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map(model => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex items-center gap-2">
                            <Brain className="h-3 w-3" />
                            {model.name}
                            {model.type && <span className="text-xs text-muted-foreground">({model.type})</span>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {models.length === 0 && (
                    <p className="text-xs text-yellow-500">⚠️ No models available. Train a model first in the ML Models tab.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Select Models (multi-select)</Label>
                  {models.length === 0 ? (
                    <p className="text-sm text-yellow-500 p-3 bg-yellow-500/10 rounded-md">
                      ⚠️ No models available. Train a model first in the ML Models tab.
                    </p>
                  ) : (
                    <div className="space-y-2 rounded-md bg-muted p-3">
                      <div className="flex flex-wrap gap-2">
                        <Badge
                          variant={(strategy.model_ids || []).length === models.length ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={toggleAllModels}
                        >
                          {(strategy.model_ids || []).length === models.length ? 'Clear All Models' : 'Select All Models'}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {models.map(model => (
                          <Badge
                            key={model.id}
                            variant={(strategy.model_ids || []).includes(model.id) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => toggleModel(model.id)}
                          >
                            <Brain className="h-3 w-3 mr-1" />
                            {model.name}
                            {(strategy.model_ids || []).includes(model.id) && (
                              <X className="h-3 w-3 ml-1" />
                            )}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {(strategy.model_ids || []).length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {strategy.model_ids?.length} model(s) selected
                    </p>
                  )}
                </div>
              )}
            </>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="risk_profile">Risk Profile</Label>
            <Select 
              value={strategy.risk_profile} 
              onValueChange={(value) => handleSelectChange('risk_profile', value as 'Low' | 'Medium' | 'High')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select risk profile" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">Low Risk (Conservative)</SelectItem>
                <SelectItem value="Medium">Medium Risk (Balanced)</SelectItem>
                <SelectItem value="High">High Risk (Aggressive)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Status</Label>
            <div className="flex items-center space-x-2">
              <Button 
                type="button"
                variant={strategy.is_active ? "default" : "outline"}
                onClick={handleToggleActive}
                size="sm"
              >
                Active
              </Button>
              <Button 
                type="button"
                variant={!strategy.is_active ? "default" : "outline"}
                onClick={handleToggleActive}
                size="sm"
              >
                Inactive
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Technical Indicators</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {COMMON_INDICATORS.filter(i => !strategy.indicators.includes(i)).slice(0, 6).map(indicator => (
                <Badge
                  key={indicator}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10"
                  onClick={() => addIndicator(indicator)}
                >
                  + {indicator}
                </Badge>
              ))}
            </div>
            <div className="flex space-x-2">
              <Input 
                value={indicatorInput}
                onChange={(e) => setIndicatorInput(e.target.value)}
                placeholder="Add custom indicator"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addIndicator())}
              />
              <Button type="button" onClick={() => addIndicator()} variant="secondary">Add</Button>
            </div>
            
            {strategy.indicators.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {strategy.indicators.map(indicator => (
                  <Badge
                    key={indicator} 
                    variant="default"
                    className="flex items-center gap-1"
                  >
                    {indicator}
                    <button 
                      type="button" 
                      onClick={() => removeIndicator(indicator)}
                      className="ml-1 hover:text-red-300"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Strategy</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}