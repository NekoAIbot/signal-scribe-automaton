
import React from 'react';
import { MarketCard } from '@/components/dashboard/MarketCard';
import { PriceChart } from '@/components/dashboard/PriceChart';
import { TradingSignals } from '@/components/dashboard/TradingSignals';
import { PerformanceMetrics } from '@/components/dashboard/PerformanceMetrics';
import { TradingStatus } from '@/components/dashboard/TradingStatus';
import { useMarketData } from '@/services/marketDataService';

const Dashboard = () => {
  const { data: marketData, isLoading } = useMarketData();
  
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Trading Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {marketData?.map((item) => (
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
