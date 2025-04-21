
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';

interface TradingSignal {
  id: number;
  symbol: string;
  type: 'BUY' | 'SELL';
  price: number;
  time: string;
  status: 'new' | 'executing' | 'executed' | 'failed';
}

const mockSignals: TradingSignal[] = [
  {
    id: 1,
    symbol: 'EUR/USD',
    type: 'BUY',
    price: 1.05423,
    time: '2023-04-21T09:30:00',
    status: 'new',
  },
  {
    id: 2,
    symbol: 'GBP/USD',
    type: 'SELL',
    price: 1.24356,
    time: '2023-04-21T09:15:00',
    status: 'executing',
  },
  {
    id: 3,
    symbol: 'USD/JPY',
    type: 'BUY',
    price: 153.742,
    time: '2023-04-21T09:00:00',
    status: 'executed',
  },
  {
    id: 4,
    symbol: 'AUD/USD',
    type: 'SELL',
    price: 0.65832,
    time: '2023-04-21T08:45:00',
    status: 'failed',
  },
];

const formatTime = (timeString: string) => {
  const date = new Date(timeString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export function TradingSignals() {
  return (
    <Card className="bg-trading-card border-trading-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">Latest Signals</CardTitle>
        <Button variant="outline" size="sm">View All</Button>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-trading-border bg-trading-bg">
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Symbol</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Price</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Time</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {mockSignals.map((signal) => (
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
