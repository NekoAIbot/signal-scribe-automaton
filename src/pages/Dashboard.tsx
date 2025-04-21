
import React from 'react';
import { MarketCard } from '@/components/dashboard/MarketCard';
import { PriceChart } from '@/components/dashboard/PriceChart';
import { TradingSignals } from '@/components/dashboard/TradingSignals';
import { PerformanceMetrics } from '@/components/dashboard/PerformanceMetrics';
import { TradingStatus } from '@/components/dashboard/TradingStatus';

const marketData = [
  { symbol: 'EUR/USD', price: 1.05432, change: 0.42, volume: 12540 },
  { symbol: 'GBP/USD', price: 1.24356, change: -0.28, volume: 9870 },
  { symbol: 'USD/JPY', price: 153.742, change: 0.65, volume: 15260 },
  { symbol: 'AUD/USD', price: 0.65832, change: -0.18, volume: 7320 },
];

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Trading Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {marketData.map((item) => (
          <MarketCard key={item.symbol} {...item} />
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PriceChart />
        </div>
        <div>
          <TradingStatus />
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TradingSignals />
        <PerformanceMetrics />
      </div>
    </div>
  );
};

export default Dashboard;
