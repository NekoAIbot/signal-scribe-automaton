
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';

export interface TradingStrategy {
  id: string;
  name: string;
  description: string;
  model_id: string;
  risk_profile: 'Low' | 'Medium' | 'High';
  is_active: boolean;
  indicators: string[];
}

interface StrategyFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialStrategy?: TradingStrategy;
  onSave: (strategy: TradingStrategy) => void;
  models: Array<{id: string, name: string}>;
}

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
    risk_profile: 'Medium',
    is_active: true,
    indicators: []
  });

  const [indicatorInput, setIndicatorInput] = useState('');

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

  const addIndicator = () => {
    if (!indicatorInput.trim()) return;
    if (strategy.indicators.includes(indicatorInput.trim())) {
      toast.error("Indicator already added");
      return;
    }
    
    setStrategy({
      ...strategy,
      indicators: [...strategy.indicators, indicatorInput.trim()]
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
    
    if (!strategy.name || !strategy.model_id) {
      toast.error("Please fill all required fields");
      return;
    }
    
    onSave(strategy);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-trading-card border-trading-border sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{initialStrategy ? 'Edit Strategy' : 'Add New Strategy'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="name">Strategy Name</Label>
            <Input 
              id="name"
              name="name"
              value={strategy.name}
              onChange={handleChange}
              placeholder="Enter strategy name"
              className="bg-trading-bg border-trading-border"
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
              className="bg-trading-bg border-trading-border"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="model_id">ML Model</Label>
            <Select 
              value={strategy.model_id} 
              onValueChange={(value) => handleSelectChange('model_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select ML model" />
              </SelectTrigger>
              <SelectContent>
                {models.map(model => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
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
                <SelectItem value="Low">Low Risk</SelectItem>
                <SelectItem value="Medium">Medium Risk</SelectItem>
                <SelectItem value="High">High Risk</SelectItem>
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
              >
                Active
              </Button>
              <Button 
                type="button"
                variant={!strategy.is_active ? "default" : "outline"}
                onClick={handleToggleActive}
              >
                Inactive
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Technical Indicators</Label>
            <div className="flex space-x-2">
              <Input 
                value={indicatorInput}
                onChange={(e) => setIndicatorInput(e.target.value)}
                placeholder="Add indicator (e.g., RSI, MACD)"
                className="bg-trading-bg border-trading-border"
              />
              <Button type="button" onClick={addIndicator}>Add</Button>
            </div>
            
            {strategy.indicators.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {strategy.indicators.map(indicator => (
                  <div 
                    key={indicator} 
                    className="bg-secondary/30 px-2 py-1 rounded flex items-center gap-1"
                  >
                    {indicator}
                    <button 
                      type="button" 
                      onClick={() => removeIndicator(indicator)}
                      className="text-red-500 hover:text-red-700 font-bold"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button type="submit">Save Strategy</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
