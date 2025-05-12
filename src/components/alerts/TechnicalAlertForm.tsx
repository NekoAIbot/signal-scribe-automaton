
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { createTechnicalAlert, TechnicalAlertParams } from "@/services/notificationService";

export function TechnicalAlertForm() {
  const [alertParams, setAlertParams] = useState<TechnicalAlertParams>({
    symbol: 'EUR/USD',
    indicator: 'RSI',
    condition: 'Above',
    value: 70,
    timeframe: 'H1'
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const symbols = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'BTC/USD', 'ETH/USD'];
  const indicators = ['RSI', 'MACD', 'Stochastic', 'Bollinger Bands', 'Moving Average', 'ADX'];
  const conditions = ['Above', 'Below', 'Crosses Up', 'Crosses Down'];
  const timeframes = ['M5', 'M15', 'M30', 'H1', 'H4', 'D1'];
  
  const handleChange = (field: keyof TechnicalAlertParams, value: string | number) => {
    setAlertParams({
      ...alertParams,
      [field]: value
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      const success = await createTechnicalAlert(alertParams);
      
      if (success) {
        toast.success(`${alertParams.indicator} alert for ${alertParams.symbol} created`);
      }
    } catch (error) {
      toast.error("Failed to create alert");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Technical Alert</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="symbol">Symbol</Label>
            <Select
              value={alertParams.symbol}
              onValueChange={(value) => handleChange('symbol', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Symbol" />
              </SelectTrigger>
              <SelectContent>
                {symbols.map((symbol) => (
                  <SelectItem key={symbol} value={symbol}>
                    {symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="indicator">Indicator</Label>
            <Select
              value={alertParams.indicator}
              onValueChange={(value) => handleChange('indicator', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Indicator" />
              </SelectTrigger>
              <SelectContent>
                {indicators.map((indicator) => (
                  <SelectItem key={indicator} value={indicator}>
                    {indicator}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="condition">Condition</Label>
            <Select
              value={alertParams.condition}
              onValueChange={(value) => handleChange('condition', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Condition" />
              </SelectTrigger>
              <SelectContent>
                {conditions.map((condition) => (
                  <SelectItem key={condition} value={condition}>
                    {condition}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="value">Value</Label>
            <Input
              type="number"
              step="0.0001"
              placeholder="e.g. 70"
              value={alertParams.value.toString()}
              onChange={(e) => handleChange('value', parseFloat(e.target.value))}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="timeframe">Timeframe</Label>
            <Select
              value={alertParams.timeframe}
              onValueChange={(value) => handleChange('timeframe', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Timeframe" />
              </SelectTrigger>
              <SelectContent>
                {timeframes.map((timeframe) => (
                  <SelectItem key={timeframe} value={timeframe}>
                    {timeframe}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Creating Alert...' : 'Create Technical Alert'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
