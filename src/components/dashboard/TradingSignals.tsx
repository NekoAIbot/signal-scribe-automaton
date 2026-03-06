import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, AlertTriangle, Settings } from "lucide-react";
import { toast } from "sonner";
import { useTradingSignals } from "@/services/marketDataService";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useBrokerAccounts } from "@/hooks/useBrokerAccounts";

export function TradingSignals() {
  const { data: signals = [], refetch } = useTradingSignals();
  const [isExecuting, setIsExecuting] = useState<string | null>(null);
  const { activeAccounts, hasAccounts } = useBrokerAccounts();
  
  const handleExecute = async (signal: any) => {
    if (!hasAccounts || activeAccounts.length === 0) {
      toast.error("No active broker accounts. Add accounts in Settings → Broker Accounts.");
      return;
    }
    
    setIsExecuting(signal.id.toString());
    toast.info(`Executing ${signal.type} signal for ${signal.symbol} on ${activeAccounts.length} account(s)...`);
    
    try {
      for (const account of activeAccounts) {
        await supabase.functions.invoke('execute-trade', {
          body: {
            symbol: signal.symbol,
            type: signal.type,
            price: signal.price,
            lotSize: 0.01,
            stopLoss: signal.stopLoss,
            takeProfit: signal.takeProfit1,
            brokerAccountId: account.id,
            strategyId: signal.strategyId || null,
          }
        });
      }
      
      toast.success(`Signal executed on ${activeAccounts.length} broker account(s)`);
      refetch();
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
                    variant={getBadgeVariant(signal.type as 'BUY' | 'SELL')}
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
                      {signal.time ? new Date(signal.time).toLocaleTimeString() : 'N/A'}
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={isExecuting === signal.id.toString() || signal.status !== 'new'}
                    onClick={() => handleExecute(signal)}
                  >
                    {isExecuting === signal.id.toString() ? 'Processing...' : 
                      signal.status === 'new' ? 'Execute' : 
                      signal.status === 'executing' ? 'Processing...' : 
                      signal.status === 'executed' ? 'Executed' : 
                      signal.status === 'failed' ? 'Failed' : 'Monitoring'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {!hasAccounts && signals.length > 0 && (
          <div className="mt-4 p-3 bg-muted/50 border border-border rounded-md">
            <p className="text-sm text-muted-foreground">
              ℹ️ Connect broker accounts in <strong>Settings → Broker Accounts</strong> to enable auto-execution.
            </p>
          </div>
        )}

        {hasAccounts && activeAccounts.length === 0 && signals.length > 0 && (
          <div className="mt-4 p-3 bg-muted/50 border border-border rounded-md">
            <p className="text-sm text-muted-foreground">
              ⚠️ You have broker accounts but none are active. Activate accounts in Settings.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
