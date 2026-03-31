
import React, { useState } from 'react';
import { TradingViewChart } from "@/components/dashboard/TradingViewChart";
import { TradingStatus } from "@/components/dashboard/TradingStatus";
import { MarketCard } from "@/components/dashboard/MarketCard";
import { PerformanceMetrics } from "@/components/dashboard/PerformanceMetrics";
import { TradingSignals } from "@/components/dashboard/TradingSignals";

import { RiskEngine } from "@/components/dashboard/RiskEngine";
import { PropRiskWidget } from "@/components/dashboard/PropRiskWidget";
import { MarketSentiment } from "@/components/dashboard/MarketSentiment";
import { TradingBot } from "@/components/dashboard/TradingBot";
import { useMarketData, ASSET_CATEGORIES } from "@/services/marketDataService";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useScrollToTop } from "@/hooks/useScrollToTop";
import { usePreferences } from "@/hooks/usePreferences";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Dashboard = () => {
  const { preferences } = usePreferences();
  const [assetCategory, setAssetCategory] = useState(preferences.display?.defaultAssetClass || 'forex');
  const { data: marketData, isLoading } = useMarketData();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  useScrollToTop();
  
  // Get top 3 assets for current category
  const categorySymbols = ASSET_CATEGORIES[assetCategory] || ASSET_CATEGORIES.forex;
  const displayedAssets = categorySymbols.slice(0, 3).map(sym => {
    const clean = sym.replace('/', '');
    const display = sym.includes('/') ? sym : (clean.length === 6 ? clean.slice(0, 3) + '/' + clean.slice(3) : clean);
    const found = marketData?.find(item => 
      item.symbol === display || item.symbol === clean || item.symbol.replace('/', '') === clean
    );
    return found || { symbol: display, price: 0, change: 0, volume: 0 };
  });
  
  const showSubscriptionCard = user?.subscriptionTier === 'free';
  
  return (
    <div className="p-3 md:p-4 space-y-3 md:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg md:text-2xl font-bold truncate">AI Trading Platform</h1>
        <Select value={assetCategory} onValueChange={setAssetCategory}>
          <SelectTrigger className="w-[130px] md:w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="forex">Forex</SelectItem>
            <SelectItem value="crypto">Cryptocurrency</SelectItem>
            <SelectItem value="indices">Indices</SelectItem>
            <SelectItem value="commodities">Commodities</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Bot Control + Upgrade CTA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <TradingBot />
        {showSubscriptionCard && (
          <Card className="bg-primary/10 border-primary/20">
            <CardContent className="p-4 flex flex-col justify-center h-full">
              <h3 className="font-medium">Upgrade to Premium</h3>
              <p className="text-sm text-muted-foreground mb-2">Get access to all features including automated trading</p>
              <Button onClick={() => navigate("/settings")} size="sm" className="w-fit">
                View Plans <ArrowUpRight className="ml-1 h-3 w-3" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Market Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {displayedAssets.map((asset) => (
          <MarketCard 
            key={asset.symbol}
            symbol={asset.symbol} 
            price={asset.price} 
            change={asset.change} 
            volume={asset.volume} 
            timestamp={asset.timestamp}
          />
        ))}
      </div>
      
      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
        {/* Left Column - Chart + Analysis */}
        <div className="lg:col-span-2 space-y-3 md:space-y-4">
          <TradingViewChart />
          <TradingSignals />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <MarketSentiment />
            <RiskEngine />
          </div>
          <PerformanceMetrics />
        </div>
        
        {/* Right Sidebar */}
        <div className="space-y-3 md:space-y-4">
          <TradingStatus />
          <PropRiskWidget />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
