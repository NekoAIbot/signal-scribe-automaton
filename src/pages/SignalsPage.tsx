import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search, Download } from "lucide-react";
import { toast } from "sonner";
import { broadcastSignal } from '@/services/notificationService';
import { useTradingSignals } from '@/services/marketDataService';
import { executeMT5Trade, TradeSignal } from '@/services/signalGenerationService';
import { CONFIG_FLAGS } from '@/config/apiConfig';
import { MT5AccountDetails } from '@/services/types/broker';

const formatDate = (timeString: string) => {
  const date = new Date(timeString);
  return date.toLocaleString();
};

const SignalsPage = () => {
  const { data: initialSignals = [], isLoading, refetch } = useTradingSignals();
  const [signals, setSignals] = useState<TradeSignal[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [executingSignals, setExecutingSignals] = useState<Record<number, boolean>>({});
  
  // Update local signals when data changes
  useEffect(() => {
    setSignals(initialSignals);
  }, [initialSignals]);
  
  // Filter signals based on search term and active tab
  const filteredSignals = signals.filter(signal => {
    const matchesSearch = searchTerm === '' || 
      signal.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (signal.strategy && signal.strategy.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesTab = activeTab === 'all' || 
                      (activeTab === 'buy' && signal.type === 'BUY') ||
                      (activeTab === 'sell' && signal.type === 'SELL') ||
                      (activeTab === 'executed' && signal.status === 'executed');
                       
    return matchesSearch && matchesTab;
  });
  
  // Execute a signal
  const executeSignal = async (signal: TradeSignal) => {
    // Prevent duplicate execution
    if (executingSignals[signal.id]) return;
    
    try {
      // Mark as executing in UI
      setExecutingSignals(prev => ({ ...prev, [signal.id]: true }));
      
      // Display risk warning
      toast.warning(`Risk Warning: Trading involves risk of loss. Only trade with capital you can afford to lose.`, {
        duration: 5000
      });

      // Update the status to executing
      setSignals(signals.map(s => 
        s.id === signal.id ? { ...s, status: 'executing' as const } : s
      ));

      // Execute on MT5 (using default credentials from config)
      const mt5Account: MT5AccountDetails = {
        id: 'default-mt5',
        name: 'Default MT5 Account',
        login: API_KEYS.MT5_LOGIN,
        password: API_KEYS.MT5_PASSWORD,
        server: API_KEYS.MT5_SERVER,
        type: 'demo',
        connected: true
      };
      
      const success = await executeMT5Trade(signal, mt5Account);

      // Update to executed or failed based on result
      setSignals(signals.map(s => 
        s.id === signal.id ? { ...s, status: success ? 'executed' as const : 'failed' as const } : s
      ));

      // Send notification if successful
      if (success) {
        await broadcastSignal({
          symbol: signal.symbol,
          type: signal.type,
          price: signal.price,
          strategy: signal.strategy
        });
        
        toast.success(`Signal for ${signal.symbol} executed successfully`);
      } else {
        toast.error(`Failed to execute signal for ${signal.symbol}`);
      }
    } catch (error) {
      console.error("Error executing signal:", error);
      toast.error(`Error: ${(error as Error).message}`);
      
      // Update status to failed
      setSignals(signals.map(s => 
        s.id === signal.id ? { ...s, status: 'failed' as const } : s
      ));
    } finally {
      // Clear executing state
      setExecutingSignals(prev => ({ ...prev, [signal.id]: false }));
    }
  };
  
  // Export signals to CSV
  const exportSignals = () => {
    try {
      // Create CSV content
      const headers = ["Symbol", "Type", "Price", "Stop Loss", "Take Profit 1", "Take Profit 2", "Take Profit 3", "Take Profit 4", "Time", "Status", "Strategy"];
      
      const csvContent = [
        headers.join(','),
        ...signals.map(signal => [
          signal.symbol,
          signal.type,
          signal.price.toFixed(5),
          signal.stopLoss?.toFixed(5) || "-",
          signal.takeProfit1?.toFixed(5) || "-",
          signal.takeProfit2?.toFixed(5) || "-",
          signal.takeProfit3?.toFixed(5) || "-",
          signal.takeProfit4?.toFixed(5) || "-",
          formatDate(signal.time),
          signal.status,
          signal.strategy || "-"
        ].join(','))
      ].join('\n');
      
      // Create a blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `trading_signals_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Signals exported to CSV successfully');
    } catch (error) {
      console.error('Error exporting signals:', error);
      toast.error('Failed to export signals');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Trading Signals</h1>
        <Card className="bg-trading-card border-trading-border">
          <CardContent className="p-6 flex justify-center items-center">
            Loading trading signals...
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Trading Signals</h1>
      
      <Card className="bg-trading-card border-trading-border">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
            <CardTitle className="text-base font-medium">Signal History</CardTitle>
            
            <div className="flex space-x-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search signals..."
                  className="pl-8 bg-trading-bg border-trading-border w-[180px] md:w-[220px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="sm" onClick={exportSignals}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <Tabs 
            defaultValue="all" 
            className="p-4" 
            value={activeTab} 
            onValueChange={setActiveTab}
          >
            <TabsList className="bg-trading-bg border border-trading-border">
              <TabsTrigger value="all">All Signals</TabsTrigger>
              <TabsTrigger value="buy">Buy</TabsTrigger>
              <TabsTrigger value="sell">Sell</TabsTrigger>
              <TabsTrigger value="executed">Executed</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="mt-4">
              <div className="overflow-auto rounded-md border border-trading-border">
                {filteredSignals.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-trading-border bg-trading-bg">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Signal</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Strategy</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Price</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">Stop Loss</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden lg:table-cell">TP1 / TP4</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Time</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Status</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSignals.map((signal) => (
                        <tr 
                          key={signal.id} 
                          className="border-b border-trading-border hover:bg-trading-bg/50"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center space-x-2">
                              <Badge variant={signal.type === 'BUY' ? 'success' : 'destructive'}>
                                {signal.type}
                              </Badge>
                              <span className="font-medium">{signal.symbol}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{signal.strategy}</td>
                          <td className="px-4 py-3 text-right">{signal.price.toFixed(5)}</td>
                          <td className="px-4 py-3 text-right text-danger-DEFAULT hidden md:table-cell">
                            {signal.stopLoss?.toFixed(5)}
                          </td>
                          <td className="px-4 py-3 text-right text-success-DEFAULT hidden lg:table-cell">
                            {signal.takeProfit1?.toFixed(5)} / {signal.takeProfit4?.toFixed(5)}
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{formatDate(signal.time)}</td>
                          <td className="px-4 py-3 text-right">
                            <Badge 
                              variant="outline" 
                              className={
                                signal.status === 'new' 
                                  ? "border-info-DEFAULT text-info-DEFAULT" 
                                  : signal.status === 'executing' 
                                  ? "border-warning-DEFAULT text-warning-DEFAULT" 
                                  : signal.status === 'executed' 
                                  ? "border-success-DEFAULT text-success-DEFAULT" 
                                  : "border-danger-DEFAULT text-danger-DEFAULT"
                              }
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
                              {signal.status === 'new' ? 
                                (executingSignals[signal.id] ? 'Processing...' : 'Execute') : 
                                signal.status === 'executing' ? 'Processing...' : 
                                signal.status === 'executed' ? 'Done' : 'Failed'}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    No matching signals found
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignalsPage;
