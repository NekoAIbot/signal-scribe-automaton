
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useTradingSignals } from "@/services/marketDataService";
import { TradeSignal, executeMT5Trade } from "@/services/signalGenerationService";
import { cn } from "@/lib/utils";

export function TradingSignals() {
  const { data: signals = [] } = useTradingSignals();
  const [isExecuting, setIsExecuting] = useState<string | null>(null);
  
  const handleExecute = async (signal: TradeSignal) => {
    setIsExecuting(signal.id.toString());
    toast.info(`Processing ${signal.type} signal for ${signal.symbol}...`);
    
    try {
      // Demo account details - in production this would come from user settings
      const accountDetails = {
        login: "demo123456",
        password: "demopass",
        server: "MetaQuotes-Demo"
      };
      
      const success = await executeMT5Trade(signal, accountDetails);
      
      if (success) {
        const updatedSignal = {
          ...signal,
          status: 'executing' as const
        };
        
        // Here you would update the signal in your store/database
        toast.success(`Signal for ${signal.symbol} is now executing on MT5`);
      }
    } catch (error) {
      toast.error(`Failed to execute signal: ${(error as Error).message}`);
    } finally {
      setIsExecuting(null);
    }
  };
  
  const getBadgeVariant = (type: 'BUY' | 'SELL'): "success" | "destructive" => {
    return type === 'BUY' ? 'success' : 'destructive';
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Trading Signals</span>
          <Badge variant="outline">{signals.length} Signals</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {signals.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <AlertTriangle className="mx-auto h-6 w-6 mb-2 opacity-50" />
            <p>No active trading signals at the moment.</p>
            <p className="text-sm">Signals update automatically as market conditions change.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {signals.slice(0, 5).map((signal) => (
              <div 
                key={signal.id} 
                className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0"
              >
                <div className="flex items-center">
                  <Badge 
                    variant={getBadgeVariant(signal.type)}
                    className="mr-2"
                  >
                    {signal.type}
                  </Badge>
                  <div>
                    <div className="font-medium">{signal.symbol}</div>
                    <div className="text-xs text-muted-foreground">{signal.strategy}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="font-medium">{signal.price.toFixed(5)}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(signal.time).toLocaleTimeString()}
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={isExecuting === signal.id.toString()}
                    onClick={() => handleExecute(signal)}
                  >
                    {isExecuting === signal.id.toString() ? 'Processing...' : 'Execute'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
