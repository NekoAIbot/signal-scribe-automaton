
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useQueryClient } from '@tanstack/react-query';

interface MarketCardProps {
  symbol: string;
  price?: number;
  change?: number;
  volume?: number;
  timestamp?: string;
  onRefresh?: () => void;
}

export function MarketCard({ symbol, price = 0, change = 0, volume = 0, timestamp, onRefresh }: MarketCardProps) {
  const isPositive = change >= 0;
  const queryClient = useQueryClient();
  
  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      toast.info(`Refreshing data for ${symbol}...`);
      // Invalidate query to trigger a refetch
      queryClient.invalidateQueries({ queryKey: ['marketData'] });
      setTimeout(() => toast.success(`${symbol} data refreshed`), 500);
    }
  };
  
  return (
    <Card className="bg-trading-card border-trading-border hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg">{symbol}</h3>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6" 
                onClick={handleRefresh}
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">Vol: {volume?.toLocaleString() || '0'}</p>
          </div>
          
          <div className={cn(
            "flex items-center",
            isPositive ? "text-success-DEFAULT" : "text-danger-DEFAULT"
          )}>
            {isPositive ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
            <span className="text-sm font-medium">{change?.toFixed(2) || '0.00'}%</span>
          </div>
        </div>
        
        <div className="mt-2">
          <p className="text-2xl font-bold">{price?.toFixed(5) || '0.00000'}</p>
          {timestamp && (
            <p className="text-xs text-muted-foreground mt-1">
              Updated: {new Date(timestamp).toLocaleTimeString()}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
