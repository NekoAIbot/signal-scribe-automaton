
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MarketCardProps {
  symbol: string;
  price: number;
  change: number;
  volume: number;
}

export function MarketCard({ symbol, price, change, volume }: MarketCardProps) {
  const isPositive = change >= 0;
  
  return (
    <Card className="bg-trading-card border-trading-border">
      <CardContent className="p-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-bold text-lg">{symbol}</h3>
            <p className="text-sm text-muted-foreground">Vol: {volume.toLocaleString()}</p>
          </div>
          
          <div className={cn(
            "flex items-center",
            isPositive ? "text-success-DEFAULT" : "text-danger-DEFAULT"
          )}>
            {isPositive ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
            <span className="text-sm font-medium">{change.toFixed(2)}%</span>
          </div>
        </div>
        
        <div className="mt-2">
          <p className="text-2xl font-bold">{price.toFixed(5)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
