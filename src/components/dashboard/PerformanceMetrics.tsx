
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

// Mock data for performance
const performanceData = [
  { name: 'Mon', profit: 120, loss: -50 },
  { name: 'Tue', profit: 180, loss: -80 },
  { name: 'Wed', profit: 90, loss: -120 },
  { name: 'Thu', profit: 210, loss: -30 },
  { name: 'Fri', profit: 150, loss: -90 },
];

const stats = [
  { name: 'Win Rate', value: '68%' },
  { name: 'Profit Factor', value: '1.87' },
  { name: 'Total Trades', value: '42' },
  { name: 'Avg. Return', value: '0.56%' },
];

export function PerformanceMetrics() {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-trading-card p-2 border border-trading-border rounded shadow-md">
          <p className="text-sm font-medium">{`${label}`}</p>
          {payload.map((entry: any) => (
            <p key={entry.name} className="text-sm" style={{ color: entry.color }}>
              {`${entry.name}: ${Math.abs(entry.value)}$`}
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
