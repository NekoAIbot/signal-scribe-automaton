
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PerformanceMetrics } from '@/components/dashboard/PerformanceMetrics';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

// Mock data for trade distribution
const tradePieData = [
  { name: 'EUR/USD', value: 42 },
  { name: 'GBP/USD', value: 28 },
  { name: 'USD/JPY', value: 21 },
  { name: 'AUD/USD', value: 15 },
  { name: 'Others', value: 19 },
];

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6366F1'];

// Mock equity curve data
const equityData = [
  { date: '04/01', balance: 10000 },
  { date: '04/05', balance: 10240 },
  { date: '04/10', balance: 10180 },
  { date: '04/15', balance: 10450 },
  { date: '04/20', balance: 10380 },
  { date: '04/25', balance: 10620 },
  { date: '04/30', balance: 10750 },
  { date: '05/05', balance: 10930 },
  { date: '05/10', balance: 11050 },
  { date: '05/15', balance: 10980 },
  { date: '05/20', balance: 11250 },
];

const AnalyticsPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Trading Analytics</h1>
      
      <div className="flex flex-col md:flex-row items-center justify-between space-y-2 md:space-y-0">
        <div className="text-sm text-muted-foreground">
          Monitor your trading performance and results
        </div>
        
        <div className="flex space-x-3">
          <Select defaultValue="30days">
            <SelectTrigger className="w-[180px] bg-trading-card border-trading-border">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
              <SelectItem value="year">This year</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-trading-card border-trading-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Balance & Equity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={equityData}
                  margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: '#94A3B8' }}
                    tickLine={{ stroke: '#2D3748' }}
                    axisLine={{ stroke: '#2D3748' }}
                  />
                  <YAxis 
                    tick={{ fill: '#94A3B8' }}
                    tickLine={{ stroke: '#2D3748' }}
                    axisLine={{ stroke: '#2D3748' }}
                    tickFormatter={(value) => `$${value}`}
                    width={70}
                  />
                  <Tooltip 
                    formatter={(value) => [`$${value}`, 'Balance']}
                    contentStyle={{ backgroundColor: '#1E293B', borderColor: '#2D3748' }}
                    labelStyle={{ color: '#E2E8F0' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  <Line 
                    type="monotone" 
                    dataKey="balance" 
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-trading-card border-trading-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Trade Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tradePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {tradePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${value} trades`, 'Quantity']}
                    contentStyle={{ backgroundColor: '#1E293B', borderColor: '#2D3748' }}
                    labelStyle={{ color: '#E2E8F0' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <PerformanceMetrics />
      
      <Card className="bg-trading-card border-trading-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Machine Learning Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-trading-bg p-4 rounded-md">
              <h3 className="text-sm font-medium mb-2">Model Accuracy</h3>
              <div className="flex items-end space-x-2">
                <span className="text-2xl font-bold">76.4%</span>
                <span className="text-xs text-success-DEFAULT">+2.1%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Last trained: 3 hours ago</p>
            </div>
            
            <div className="bg-trading-bg p-4 rounded-md">
              <h3 className="text-sm font-medium mb-2">Prediction Confidence</h3>
              <div className="flex items-end space-x-2">
                <span className="text-2xl font-bold">83.2%</span>
                <span className="text-xs text-success-DEFAULT">+0.8%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Based on 124 predictions</p>
            </div>
            
            <div className="bg-trading-bg p-4 rounded-md">
              <h3 className="text-sm font-medium mb-2">Feature Importance</h3>
              <p className="text-sm">Top features:</p>
              <ol className="text-xs text-muted-foreground mt-1 space-y-1">
                <li>1. RSI (14) - 24.3%</li>
                <li>2. SMA Crossover - 18.7%</li>
                <li>3. Volume Change - 15.2%</li>
              </ol>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-trading-bg rounded-md">
            <h3 className="text-sm font-medium mb-2">ML Model Recommendations</h3>
            <ul className="space-y-2">
              <li className="flex items-start">
                <span className="bg-success-DEFAULT/20 text-success-DEFAULT p-1 rounded mr-2 mt-0.5">•</span>
                <span>Increase position size for EUR/USD buy signals based on recent performance</span>
              </li>
              <li className="flex items-start">
                <span className="bg-warning-DEFAULT/20 text-warning-DEFAULT p-1 rounded mr-2 mt-0.5">•</span>
                <span>Consider adjusting stop loss levels for GBP/USD trades (currently too tight)</span>
              </li>
              <li className="flex items-start">
                <span className="bg-danger-DEFAULT/20 text-danger-DEFAULT p-1 rounded mr-2 mt-0.5">•</span>
                <span>Avoid USD/JPY trades during Asian session (poor performance detected)</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsPage;
