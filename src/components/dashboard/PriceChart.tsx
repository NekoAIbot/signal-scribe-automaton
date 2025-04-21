
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

// Mock data
const generateChartData = (days = 30) => {
  const data = [];
  const now = new Date();
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    const baseValue = 1.05;
    const volatility = 0.02;
    const trend = i > days / 2 ? 0.0002 : -0.0003; // Up then down trend
    
    const randomWalk = (Math.random() - 0.5) * volatility;
    const value = baseValue + (trend * (days - i)) + randomWalk;
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: parseFloat(value.toFixed(5)),
    });
  }
  
  return data;
};

const timeframes = [
  { value: '1h', label: '1H' },
  { value: '4h', label: '4H' },
  { value: '1d', label: '1D' },
  { value: '1w', label: '1W' },
  { value: '1m', label: '1M' },
];

export function PriceChart() {
  const [timeframe, setTimeframe] = React.useState('1d');
  const data = generateChartData();
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-trading-card p-2 border border-trading-border rounded shadow-md">
          <p className="text-sm text-muted-foreground">{`Date: ${label}`}</p>
          <p className="text-sm font-medium">{`Price: ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };
  
  return (
    <Card className="bg-trading-card border-trading-border h-[400px]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">EUR/USD Price</CardTitle>
        <Tabs defaultValue="1d" value={timeframe} onValueChange={setTimeframe}>
          <TabsList className="bg-trading-bg border border-trading-border">
            {timeframes.map((tf) => (
              <TabsTrigger key={tf.value} value={tf.value}>
                {tf.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="p-0 h-[330px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" vertical={false} />
            <XAxis 
              dataKey="date" 
              tick={{ fill: '#94A3B8' }}
              tickLine={{ stroke: '#2D3748' }}
              axisLine={{ stroke: '#2D3748' }}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.getDate().toString();
              }}
            />
            <YAxis 
              domain={['dataMin - 0.005', 'dataMax + 0.005']}
              tick={{ fill: '#94A3B8' }}
              tickLine={{ stroke: '#2D3748' }}
              axisLine={{ stroke: '#2D3748' }}
              tickFormatter={(value) => value.toFixed(3)}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={data[0].value} stroke="#2D3748" strokeDasharray="3 3" />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#3B82F6" 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, fill: '#3B82F6' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
