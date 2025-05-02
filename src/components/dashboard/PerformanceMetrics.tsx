
import React, { useState, useEffect } from 'react';
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
import { useTradingSignals } from '@/services/marketDataService';

// Generate realistic performance data based on our signals
const generatePerformanceData = (signals: any[]) => {
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const today = new Date().getDay(); // 0 is Sunday, 1 is Monday, etc.
  
  return daysOfWeek.map((day, index) => {
    // Generate more realistic profits based on signals
    const dayIndex = (today - 5 + index) % 7 + 1; // Map to 1-5 (Mon-Fri)
    const relevantSignals = signals.filter(s => new Date(s.time).getDay() === dayIndex);
    
    // Base profits and losses
    const baseProfit = 80 + Math.floor(Math.random() * 150);
    const baseLoss = -(30 + Math.floor(Math.random() * 100));
    
    // Adjust based on signals
    const signalFactor = relevantSignals.length * 20;
    const executedFactor = relevantSignals.filter(s => s.status === 'executed').length * 30;
    
    let profit = baseProfit;
    let loss = baseLoss;
    
    // Modify profit/loss based on signals
    if (relevantSignals.length > 0) {
      const buySignals = relevantSignals.filter(s => s.type === 'BUY').length;
      const sellSignals = relevantSignals.filter(s => s.type === 'SELL').length;
      
      if (buySignals > sellSignals) {
        profit += signalFactor + executedFactor;
        loss = Math.max(-150, loss - 10);
      } else {
        profit += Math.floor(signalFactor / 2);
        loss -= Math.floor(executedFactor / 2);
      }
    }
    
    return {
      name: day,
      profit: profit,
      loss: loss
    };
  });
};

// Generate realistic statistics based on signals
const generateStats = (signals: any[]) => {
  if (!signals || signals.length === 0) {
    return [
      { name: 'Win Rate', value: '0%' },
      { name: 'Profit Factor', value: '0.00' },
      { name: 'Total Trades', value: '0' },
      { name: 'Avg. Return', value: '0.00%' },
    ];
  }
  
  const executedSignals = signals.filter(s => s.status === 'executed');
  const failedSignals = signals.filter(s => s.status === 'failed');
  
  const totalExecuted = executedSignals.length;
  const totalSignals = totalExecuted + failedSignals.length;
  
  // Win rate is random but biased towards 60-75%
  const winRate = totalSignals > 0 
    ? Math.round(((totalExecuted / totalSignals) * 100) * (0.8 + Math.random() * 0.4))
    : 0;
    
  // Profit factor between 1.2 and 2.5
  const profitFactor = 1.2 + Math.random() * 1.3;
  
  // Average return between 0.3% and 1.2%
  const avgReturn = 0.3 + Math.random() * 0.9;
  
  return [
    { name: 'Win Rate', value: `${winRate}%` },
    { name: 'Profit Factor', value: profitFactor.toFixed(2) },
    { name: 'Total Trades', value: totalSignals.toString() },
    { name: 'Avg. Return', value: `${avgReturn.toFixed(2)}%` },
  ];
};

export function PerformanceMetrics() {
  const { data: tradingSignals = [] } = useTradingSignals();
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  
  // Update performance data when signals change
  useEffect(() => {
    setPerformanceData(generatePerformanceData(tradingSignals));
    setStats(generateStats(tradingSignals));
  }, [tradingSignals]);
  
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
          {stats.map((stat) => (
            <div key={stat.name} className="bg-trading-bg p-3 rounded-md">
              <p className="text-sm text-muted-foreground">{stat.name}</p>
              <p className="text-xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>
        
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={performanceData}
              margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#94A3B8' }} />
              <YAxis tick={{ fill: '#94A3B8' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              <Bar dataKey="profit" name="Profit" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="loss" name="Loss" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
