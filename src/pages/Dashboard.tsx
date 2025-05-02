
import React, { useEffect } from 'react';
import { MarketCard } from '@/components/dashboard/MarketCard';
import { PriceChart } from '@/components/dashboard/PriceChart';
import { TradingSignals } from '@/components/dashboard/TradingSignals';
import { PerformanceMetrics } from '@/components/dashboard/PerformanceMetrics';
import { TradingStatus } from '@/components/dashboard/TradingStatus';
import { useMarketData } from '@/services/marketDataService';
import { toast } from 'sonner';
import { useWebSocketMarketData } from '@/services/websocketService';

const Dashboard = () => {
  const { data: marketData, isLoading, isError } = useMarketData();
  const { isConnected, usingMockData } = useWebSocketMarketData();
  
  // Notify the user on connection status
  useEffect(() => {
    if (isError) {
      toast.error("Failed to fetch market data. Please check your connection.");
    }
  }, [isError]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Loading market data...</h2>
          <p className="text-muted-foreground">Please wait while we fetch the latest information.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Trading Dashboard</h1>
        
        <div className="flex items-center space-x-2">
          <div className="text-sm flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-muted-foreground">
              {isConnected 
                ? usingMockData 
                  ? "Connected (Mock Data)" 
                  : "Connected (Live Data)" 
                : "Disconnected"
              }
            </span>
          </div>
        </div>
      </div>
      
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
