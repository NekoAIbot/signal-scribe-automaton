
import React, { useState } from 'react';
import { TradingViewChart } from "@/components/dashboard/TradingViewChart";
import { TradingBot } from "@/components/dashboard/TradingBot";
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
  const { user } = useAuth();
  const navigate = useNavigate();
  
  useScrollToTop();
  
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

      <TradingViewChart />
    </div>
  );
};

export default Dashboard;
