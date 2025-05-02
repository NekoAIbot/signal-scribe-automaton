
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { broadcastSignal } from '@/services/notificationService';
import { useTradingSignals } from '@/services/marketDataService';
import { executeMT5Trade, TradeSignal } from '@/services/signalGenerationService';
import { API_KEYS } from '@/config/apiConfig';

const formatTime = (timeString: string) => {
  const date = new Date(timeString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export function TradingSignals() {
  const { data: signals = [], isLoading, refetch } = useTradingSignals();
  const [executingSignals, setExecutingSignals] = useState<Record<number, boolean>>({});

  const handleViewAll = () => {
    toast.info("Navigating to signals page");
    // In a real app, we would navigate to the signals page using router
    window.location.href = "/signals";
  };

  const executeSignal = async (signal: TradeSignal) => {
    if (executingSignals[signal.id]) return;

    try {
      // Mark signal as executing
      setExecutingSignals(prev => ({ ...prev, [signal.id]: true }));
      
      // Display risk warning
      toast.warning("Trading involves significant risk of loss. Only trade with risk capital.", {
        duration: 6000,
      });

      // Update the signal status
      const updatedSignal = { ...signal, status: 'executing' as const };
      
      // Execute on MT5 (using default credentials from config)
      const mt5Account = {
        login: API_KEYS.MT5_LOGIN,
        password: API_KEYS.MT5_PASSWORD,
        server: API_KEYS.MT5_SERVER
      };
      
      const success = await executeMT5Trade(updatedSignal, mt5Account);
      
      // Broadcast signal to notification channels
      if (success) {
        await broadcastSignal({
          symbol: signal.symbol,
          type: signal.type,
          price: signal.price,
          strategy: signal.strategy || 'Technical Analysis'
        });
        
        toast.success(`Signal for ${signal.symbol} executed successfully`);
        
        // Update signal in state
        refetch();
      } else {
        toast.error(`Failed to execute signal for ${signal.symbol}`);
      }
    } catch (error) {
      console.error(`Error executing signal:`, error);
      toast.error(`Error executing trade: ${(error as Error).message}`);
    } finally {
      // Clear executing state
      setExecutingSignals(prev => ({ ...prev, [signal.id]: false }));
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-trading-card border-trading-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium">Latest Signals</CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center">
          Loading trading signals...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-trading-card border-trading-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">Latest Signals</CardTitle>
        <Button variant="outline" size="sm" onClick={handleViewAll}>View All</Button>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-hidden">
          {signals.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-trading-border bg-trading-bg">
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Symbol</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">Price</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">Time</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {signals.slice(0, 5).map((signal) => (
                  <tr 
                    key={signal.id} 
                    className="border-b border-trading-border hover:bg-trading-bg/50"
                  >
                    <td className="px-4 py-3 font-medium">{signal.symbol}</td>
                    <td className="px-4 py-3">
                      <Badge variant={signal.type === 'BUY' ? 'success' : 'destructive'}>
                        {signal.type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">{signal.price.toFixed(5)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{formatTime(signal.time)}</td>
                    <td className="px-4 py-3 text-right">
                      <Badge 
                        variant="outline" 
                        className={cn(
                          signal.status === 'new' && "border-info-DEFAULT text-info-DEFAULT",
                          signal.status === 'executing' && "border-warning-DEFAULT text-warning-DEFAULT",
                          signal.status === 'executed' && "border-success-DEFAULT text-success-DEFAULT",
                          signal.status === 'failed' && "border-danger-DEFAULT text-danger-DEFAULT"
                        )}
                      >
                        {signal.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={signal.status !== 'new' || executingSignals[signal.id]}
                        onClick={() => executeSignal(signal)}
                      >
                        {signal.status === 'new' ? (executingSignals[signal.id] ? 'Processing...' : 'Execute') : 
                         signal.status === 'executing' ? 'Processing...' : 
                         signal.status === 'executed' ? 'Done' : 'Failed'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-6 text-center text-muted-foreground">
              No trading signals available at the moment. 
              <br />
              Signals will appear as market conditions change.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
