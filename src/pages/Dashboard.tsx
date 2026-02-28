
import React from 'react';
import { PriceChart } from "@/components/dashboard/PriceChart";
import { TradingStatus } from "@/components/dashboard/TradingStatus";
import { MarketCard } from "@/components/dashboard/MarketCard";
import { PerformanceMetrics } from "@/components/dashboard/PerformanceMetrics";
import { TradingSignals } from "@/components/dashboard/TradingSignals";

import { RiskEngine } from "@/components/dashboard/RiskEngine";
import { MarketSentiment } from "@/components/dashboard/MarketSentiment";
import { TradingBot } from "@/components/dashboard/TradingBot";
import { useMarketData } from "@/services/marketDataService";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useScrollToTop } from "@/hooks/useScrollToTop";

const Dashboard = () => {
  const { data: marketData, isLoading } = useMarketData();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  useScrollToTop();
  
  const getMarketDataForSymbol = (symbol: string) => {
    if (!marketData) return { symbol, price: 0, change: 0, volume: 0 };
    const symbolData = marketData.find(item => item.symbol === symbol);
    return symbolData || { symbol, price: 0, change: 0, volume: 0 };
  };
  
  const eurusdData = getMarketDataForSymbol('EUR/USD');
  const gbpusdData = getMarketDataForSymbol('GBP/USD');
  const usdjpyData = getMarketDataForSymbol('USD/JPY');
  
  const showSubscriptionCard = user?.subscriptionTier === 'free';
  
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">AI Enhanced Trading Platform</h1>
      </div>
      
      {/* Trading Bot moved to top */}
      <TradingBot />

      {showSubscriptionCard && (
        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between">
            <div className="mb-2 md:mb-0">
              <h3 className="font-medium">Upgrade to Premium</h3>
              <p className="text-sm text-muted-foreground">Get access to all features including automated trading</p>
            </div>
            <Button onClick={() => navigate("/settings")}>
              View Plans <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MarketCard symbol={eurusdData.symbol} price={eurusdData.price} change={eurusdData.change} volume={eurusdData.volume} />
        <MarketCard symbol={gbpusdData.symbol} price={gbpusdData.price} change={gbpusdData.change} volume={gbpusdData.volume} />
        <MarketCard symbol={usdjpyData.symbol} price={usdjpyData.price} change={usdjpyData.change} volume={usdjpyData.volume} />
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
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
