
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, AlertTriangle, Settings } from "lucide-react";
import { toast } from "sonner";
import { useTradingSignals } from "@/services/marketDataService";
import { executeSignalAcrossAccounts } from "@/services/ai/signalService";
import { EnhancedSignal } from "@/services/ai/types";
import { cn } from "@/lib/utils";
import { BrokerSettings, BrokerSettingsModal } from "@/components/settings/BrokerSettingsModal";

export function TradingSignals() {
  const { data: signals = [], refetch } = useTradingSignals();
  const [isExecuting, setIsExecuting] = useState<string | null>(null);
  const [brokerSettings, setBrokerSettings] = useState<BrokerSettings | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Load broker settings from local storage
  useEffect(() => {
    const savedSettings = localStorage.getItem('brokerSettings');
    if (savedSettings) {
      try {
        setBrokerSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error("Failed to parse broker settings:", e);
      }
    }
  }, []);
  
  const handleExecute = async (signal: any) => {
    // Check if broker settings are available
    if (!brokerSettings) {
      toast.error("Please configure your broker settings first");
      setSettingsOpen(true);
      return;
    }
    
    setIsExecuting(signal.id.toString());
    toast.info(`Processing ${signal.type} signal for ${signal.symbol}...`);
    
    try {
      // Convert TradeSignal to EnhancedSignal format
      const enhancedSignal: EnhancedSignal = {
        id: signal.id.toString(),
        symbol: signal.symbol,
        type: signal.type as 'BUY' | 'SELL',
        price: signal.price,
        time: signal.time,
        status: 'new',
        strategy_name: signal.strategy || 'Auto Strategy',
        stop_loss: signal.stopLoss,
        take_profit_levels: [
          signal.takeProfit1,
          signal.takeProfit2,
          signal.takeProfit3,
          signal.takeProfit4
        ].filter(Boolean)
      };
      
      // Execute across all user's broker accounts
      const results = await executeSignalAcrossAccounts(enhancedSignal);
      
      if (results.length > 0) {
        toast.success(`Signal for ${signal.symbol} is now executing on ${results.length} broker accounts`);
        
        // Refetch signals to update status
        refetch();
      } else {
        toast.warning(`No broker accounts executed the signal for ${signal.symbol}`);
      }
    } catch (error) {
      toast.error(`Failed to execute signal: ${(error as Error).message}`);
    } finally {
      setIsExecuting(null);
    }
  };
  
  // Save broker settings
  const saveBrokerSettings = (settings: BrokerSettings) => {
    setBrokerSettings(settings);
    localStorage.setItem('brokerSettings', JSON.stringify(settings));
    toast.success("Broker settings saved successfully");
  };
  
  const getBadgeVariant = (type: 'BUY' | 'SELL'): "success" | "destructive" => {
    return type === 'BUY' ? 'success' : 'destructive';
  };
  
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Trading Signals</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{signals.length} Signals</Badge>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSettingsOpen(true)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
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
          
          {!brokerSettings && signals.length > 0 && (
            <div className="mt-4 p-3 bg-warning-DEFAULT/10 border border-warning-DEFAULT/20 rounded-md">
              <p className="text-sm text-warning-DEFAULT">
                Broker connection not configured. Click the settings icon to connect your trading account.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Broker Settings Modal */}
      <BrokerSettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        initialSettings={brokerSettings || undefined}
        onSave={saveBrokerSettings}
      />
    </>
  );
}
