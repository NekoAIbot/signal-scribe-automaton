
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';

export interface MLModel {
  id: string;
  name: string;
  type: 'DQN' | 'PPO' | 'LSTM' | 'Transformer' | 'GRU' | 'RandomForest' | 'XGBoost';
  accuracy: number;
  lastTrained: string;
  status: string;
}

interface ModelFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialModel?: MLModel;
  onSave: (model: MLModel) => void;
  isTraining?: boolean;
}

export function ModelFormModal({
  open,
  onOpenChange,
  initialModel,
  onSave,
  isTraining = false
}: ModelFormModalProps) {
  const [model, setModel] = useState<MLModel>(initialModel || {
    id: `model-${Date.now()}`,
    name: '',
    type: 'LSTM',
    accuracy: 0,
    lastTrained: new Date().toISOString().split('T')[0],
    status: 'inactive'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setModel({
      ...model,
      [name]: name === 'accuracy' ? parseFloat(value) : value
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setModel({
      ...model,
      [name]: value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!model.name || !model.type) {
      toast.error("Please fill all required fields");
      return;
    }
    
    // For training, update the lastTrained date to today
    if (isTraining) {
      model.lastTrained = new Date().toISOString().split('T')[0];
    }
    
    onSave(model);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-trading-card border-trading-border sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isTraining ? (initialModel ? 'Retrain Model' : 'Train New Model') : (initialModel ? 'Edit Model' : 'Add New Model')}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="name">Model Name</Label>
            <Input 
              id="name"
              name="name"
              value={model.name}
              onChange={handleChange}
              placeholder="Enter model name"
              className="bg-trading-bg border-trading-border"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="type">Model Type</Label>
            <Select 
              value={model.type} 
              onValueChange={(value) => handleSelectChange('type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select model type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LSTM">LSTM</SelectItem>
                <SelectItem value="Transformer">Transformer</SelectItem>
                <SelectItem value="DQN">DQN</SelectItem>
                <SelectItem value="PPO">PPO</SelectItem>
                <SelectItem value="GRU">GRU</SelectItem>
                <SelectItem value="RandomForest">RandomForest</SelectItem>
                <SelectItem value="XGBoost">XGBoost</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {!isTraining && (
            <div className="space-y-2">
              <Label htmlFor="accuracy">Accuracy (%)</Label>
              <Input 
                id="accuracy"
                name="accuracy"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={model.accuracy}
                onChange={handleChange}
                placeholder="Enter model accuracy"
                className="bg-trading-bg border-trading-border"
              />
            </div>
          )}
          
          {isTraining && (
            <div className="space-y-2">
              <Label htmlFor="parameters">Training Parameters</Label>
              <div className="bg-black/20 p-4 rounded-md border border-gray-700 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>Epochs: 500</div>
                  <div>Batch Size: 64</div>
                  <div>Learning Rate: 0.001</div>
                  <div>Dropout: 0.2</div>
                  <div>Optimizer: Adam</div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button type="submit">
              {isTraining ? 'Start Training' : 'Save Model'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
