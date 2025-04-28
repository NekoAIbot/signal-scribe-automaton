
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search, Download } from "lucide-react";
import { toast } from "sonner";
import { broadcastSignal } from '@/services/notificationService';

interface TradingSignal {
  id: number;
  symbol: string;
  type: 'BUY' | 'SELL';
  price: number;
  time: string;
  status: 'new' | 'executing' | 'executed' | 'failed';
  strategy: string;
  stopLoss?: number;
  takeProfit?: number;
}

const initialMockSignals: TradingSignal[] = [
  {
    id: 1,
    symbol: 'EUR/USD',
    type: 'BUY',
    price: 1.05423,
    time: '2023-04-21T09:30:00',
    status: 'new',
    strategy: 'SMA Crossover',
    stopLoss: 1.05200,
    takeProfit: 1.05700,
  },
  {
    id: 2,
    symbol: 'GBP/USD',
    type: 'SELL',
    price: 1.24356,
    time: '2023-04-21T09:15:00',
    status: 'executing',
    strategy: 'RSI Divergence',
    stopLoss: 1.24600,
    takeProfit: 1.24000,
  },
  {
    id: 3,
    symbol: 'USD/JPY',
    type: 'BUY',
    price: 153.742,
    time: '2023-04-21T09:00:00',
    status: 'executed',
    strategy: 'Bollinger Breakout',
    stopLoss: 153.500,
    takeProfit: 154.200,
  },
  {
    id: 4,
    symbol: 'AUD/USD',
    type: 'SELL',
    price: 0.65832,
    time: '2023-04-21T08:45:00',
    status: 'failed',
    strategy: 'MACD Signal',
    stopLoss: 0.66000,
    takeProfit: 0.65500,
  },
  {
    id: 5,
    symbol: 'USD/CAD',
    type: 'BUY',
    price: 1.36520,
    time: '2023-04-21T08:30:00',
    status: 'executed',
    strategy: 'Price Action',
    stopLoss: 1.36300,
    takeProfit: 1.36800,
  },
  {
    id: 6,
    symbol: 'NZD/USD',
    type: 'SELL',
    price: 0.59123,
    time: '2023-04-21T08:15:00',
    status: 'new',
    strategy: 'SMA Crossover',
    stopLoss: 0.59300,
    takeProfit: 0.58800,
  },
];

const formatDate = (timeString: string) => {
  const date = new Date(timeString);
  return date.toLocaleString();
};

const SignalsPage = () => {
  const [signals, setSignals] = useState<TradingSignal[]>(initialMockSignals);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  
  // Filter signals based on search term and active tab
  const filteredSignals = signals.filter(signal => {
    const matchesSearch = searchTerm === '' || 
      signal.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || 
      signal.strategy.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesTab = activeTab === 'all' || 
                      (activeTab === 'buy' && signal.type === 'BUY') ||
                      (activeTab === 'sell' && signal.type === 'SELL') ||
                      (activeTab === 'executed' && signal.status === 'executed');
                       
    return matchesSearch && matchesTab;
  });
  
  // Execute a signal
  const executeSignal = async (id: number) => {
    // Find the signal to execute
    const signalToExecute = signals.find(signal => signal.id === id);
    if (!signalToExecute) return;

    // Update the status to executing
    setSignals(signals.map(signal => 
      signal.id === id ? { ...signal, status: 'executing' as const } : signal
    ));

    toast.info(`Executing ${signalToExecute.type} signal for ${signalToExecute.symbol}`);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Update to executed (80% success rate)
    const success = Math.random() > 0.2;
    
    setSignals(signals.map(signal => 
      signal.id === id ? { ...signal, status: success ? 'executed' as const : 'failed' as const } : signal
    ));

    // Send notification
    if (success) {
      await broadcastSignal({
        symbol: signalToExecute.symbol,
        type: signalToExecute.type,
        price: signalToExecute.price,
        strategy: signalToExecute.strategy
      });
      
      toast.success(`Signal for ${signalToExecute.symbol} executed successfully`);
    } else {
      toast.error(`Failed to execute signal for ${signalToExecute.symbol}`);
    }
  };
  
  // Export signals to CSV
  const exportSignals = () => {
    try {
      // Create CSV content
      const headers = ["Symbol", "Type", "Price", "Stop Loss", "Take Profit", "Time", "Status", "Strategy"];
      
      const csvContent = [
        headers.join(','),
        ...signals.map(signal => [
          signal.symbol,
          signal.type,
          signal.price.toFixed(5),
          signal.stopLoss?.toFixed(5) || "-",
          signal.takeProfit?.toFixed(5) || "-",
          formatDate(signal.time),
          signal.status,
          signal.strategy
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
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">Take Profit</th>
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
                          <td className="px-4 py-3 text-right text-success-DEFAULT hidden md:table-cell">
                            {signal.takeProfit?.toFixed(5)}
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
                              disabled={signal.status !== 'new'}
                              onClick={() => executeSignal(signal.id)}
                            >
                              {signal.status === 'new' ? 'Execute' : 
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
