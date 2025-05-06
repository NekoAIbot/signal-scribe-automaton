
import React from 'react';
import { PriceChart } from "@/components/dashboard/PriceChart";
import { TradingStatus } from "@/components/dashboard/TradingStatus";
import { MarketCard } from "@/components/dashboard/MarketCard";
import { PerformanceMetrics } from "@/components/dashboard/PerformanceMetrics";
import { TradingSignals } from "@/components/dashboard/TradingSignals";
import { AIAssistant } from "@/components/dashboard/AIAssistant";
import { RiskEngine } from "@/components/dashboard/RiskEngine";
import { MarketSentiment } from "@/components/dashboard/MarketSentiment";

const Dashboard = () => {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">AI Enhanced Trading Platform</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <MarketCard />
        <MarketCard symbol="GBP/USD" />
        <MarketCard symbol="USD/JPY" />
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
