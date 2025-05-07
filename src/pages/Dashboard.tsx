
import React from 'react';
import { PriceChart } from "@/components/dashboard/PriceChart";
import { TradingStatus } from "@/components/dashboard/TradingStatus";
import { MarketCard } from "@/components/dashboard/MarketCard";
import { PerformanceMetrics } from "@/components/dashboard/PerformanceMetrics";
import { TradingSignals } from "@/components/dashboard/TradingSignals";
import { AIAssistant } from "@/components/dashboard/AIAssistant";
import { RiskEngine } from "@/components/dashboard/RiskEngine";
import { MarketSentiment } from "@/components/dashboard/MarketSentiment";
import { useMarketData } from "@/services/marketDataService";

const Dashboard = () => {
  const { data: marketData, isLoading } = useMarketData();
  
  // Find market data for specific symbols or use defaults
  const getMarketDataForSymbol = (symbol: string) => {
    if (!marketData) return { symbol, price: 0, change: 0, volume: 0 };
    
    const symbolData = marketData.find(item => item.symbol === symbol);
    return symbolData || { symbol, price: 0, change: 0, volume: 0 };
  };
  
  const eurusdData = getMarketDataForSymbol('EUR/USD');
  const gbpusdData = getMarketDataForSymbol('GBP/USD');
  const usdjpyData = getMarketDataForSymbol('USD/JPY');
  
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">AI Enhanced Trading Platform</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <MarketCard 
          symbol={eurusdData.symbol} 
          price={eurusdData.price} 
          change={eurusdData.change} 
          volume={eurusdData.volume} 
        />
        <MarketCard 
          symbol={gbpusdData.symbol} 
          price={gbpusdData.price} 
          change={gbpusdData.change} 
          volume={gbpusdData.volume}
        />
        <MarketCard 
          symbol={usdjpyData.symbol} 
          price={usdjpyData.price} 
          change={usdjpyData.change} 
          volume={usdjpyData.volume}
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="space-y-4">
            <PriceChart />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MarketSentiment />
              <RiskEngine />
            </div>
            <TradingSignals />
          </div>
        </div>
        
        <div className="space-y-4">
          <TradingStatus />
          <PerformanceMetrics />
          <div className="h-[400px]">
            <AIAssistant />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
