
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

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

const mockSignals: TradingSignal[] = [
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
                />
              </div>
              <Button variant="outline" size="sm">Export</Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <Tabs defaultValue="all" className="p-4">
            <TabsList className="bg-trading-bg border border-trading-border">
              <TabsTrigger value="all">All Signals</TabsTrigger>
              <TabsTrigger value="buy">Buy</TabsTrigger>
              <TabsTrigger value="sell">Sell</TabsTrigger>
              <TabsTrigger value="executed">Executed</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-4">
              <div className="overflow-auto rounded-md border border-trading-border">
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
                    {mockSignals.map((signal) => (
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
                          >
                            Execute
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
            
            <TabsContent value="buy">
              <div className="p-8 text-center text-muted-foreground">
                Filtered buy signals would appear here
              </div>
            </TabsContent>
            
            <TabsContent value="sell">
              <div className="p-8 text-center text-muted-foreground">
                Filtered sell signals would appear here
              </div>
            </TabsContent>
            
            <TabsContent value="executed">
              <div className="p-8 text-center text-muted-foreground">
                Executed signals would appear here
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignalsPage;
