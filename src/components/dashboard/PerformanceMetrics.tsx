
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { useLiveTrades } from '@/hooks/useLiveTrades';

export function PerformanceMetrics() {
  const { closedTrades, stats } = useLiveTrades();

  // Build real daily P&L from closed trades
  const dailyPnL: Record<string, { profit: number; loss: number }> = {};
  closedTrades.forEach(trade => {
    const day = new Date(trade.close_time || trade.open_time).toLocaleDateString('en-US', { weekday: 'short' });
    if (!dailyPnL[day]) dailyPnL[day] = { profit: 0, loss: 0 };
    if (trade.profit >= 0) {
      dailyPnL[day].profit += trade.profit;
    } else {
      dailyPnL[day].loss += trade.profit;
    }
  });

  const performanceData = Object.entries(dailyPnL).map(([name, data]) => ({
    name,
    profit: Number(data.profit.toFixed(2)),
    loss: Number(data.loss.toFixed(2)),
  }));

  const realStats = [
    { name: 'Win Rate', value: closedTrades.length > 0 ? `${stats.winRate.toFixed(1)}%` : '0%' },
    { name: 'Profit Factor', value: stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2) },
    { name: 'Total Trades', value: closedTrades.length.toString() },
    { name: 'Total P&L', value: `$${stats.totalPnL.toFixed(2)}` },
  ];
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-trading-card p-2 border border-trading-border rounded shadow-md">
          <p className="text-sm font-medium">{`${label}`}</p>
          {payload.map((entry: any) => (
            <p key={entry.name} className="text-sm" style={{ color: entry.color }}>
              {`${entry.name}: $${Math.abs(entry.value)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
  return (
    <Card className="bg-trading-card border-trading-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Performance Metrics</CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {realStats.map((stat) => (
            <div key={stat.name} className="bg-trading-bg p-3 rounded-md">
              <p className="text-sm text-muted-foreground">{stat.name}</p>
              <p className="text-xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>
        
        <div className="h-64">
          {performanceData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={performanceData}
                margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Bar dataKey="profit" name="Profit" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="loss" name="Loss" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              No closed trades yet — performance data will appear here
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
