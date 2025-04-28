
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Settings } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';

export function TradingStatus() {
  const [isActive, setIsActive] = useState(true);
  const [runningTime, setRunningTime] = useState("13 hours");
  const [cpuUsage, setCpuUsage] = useState(32);
  const [memoryUsage, setMemoryUsage] = useState(45);
  const [apiRequests, setApiRequests] = useState(1458);
  const [activeTrades, setActiveTrades] = useState(3);
  const [pendingSignals, setPendingSignals] = useState(2);

  // Toggle bot active status
  const toggleBotStatus = () => {
    setIsActive(!isActive);
    toast.success(isActive ? "Bot stopped successfully" : "Bot started successfully");
  };

  // Open settings modal
  const openSettings = () => {
    toast.info("Settings panel would open here");
  };

  return (
    <Card className="bg-trading-card border-trading-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">Trading Bot Status</CardTitle>
        <Button variant="ghost" size="icon" onClick={openSettings}>
          <Settings className="h-4 w-4" />
        </Button>
      </CardHeader>
      
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Badge 
              variant="outline" 
              className={isActive 
                ? "border-success-DEFAULT text-success-DEFAULT bg-success-DEFAULT/10" 
                : "border-danger-DEFAULT text-danger-DEFAULT bg-danger-DEFAULT/10"}>
              {isActive ? "Active" : "Inactive"}
            </Badge>
            <p className="mt-1 text-sm text-muted-foreground">
              {isActive ? `Running for ${runningTime}` : "Bot is currently stopped"}
            </p>
          </div>
          
          <Button 
            variant={isActive ? "destructive" : "default"} 
            size="sm"
            onClick={toggleBotStatus}>
            {isActive ? "Stop Bot" : "Start Bot"}
          </Button>
        </div>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm">CPU Usage</span>
              <span className="text-sm font-medium">{cpuUsage}%</span>
            </div>
            <Progress value={cpuUsage} className="h-2" indicatorClassName="bg-info-DEFAULT" />
          </div>
          
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm">Memory Usage</span>
              <span className="text-sm font-medium">{memoryUsage}%</span>
            </div>
            <Progress value={memoryUsage} className="h-2" indicatorClassName="bg-warning-DEFAULT" />
          </div>
          
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm">API Requests (24h)</span>
              <span className="text-sm font-medium">{apiRequests.toLocaleString()}</span>
            </div>
            <Progress value={Math.min(apiRequests / 30, 100)} className="h-2" indicatorClassName="bg-primary" />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-trading-bg p-3 rounded-md">
            <p className="text-sm text-muted-foreground">Active Trades</p>
            <p className="text-xl font-bold">{activeTrades}</p>
          </div>
          <div className="bg-trading-bg p-3 rounded-md">
            <p className="text-sm text-muted-foreground">Pending Signals</p>
            <p className="text-xl font-bold">{pendingSignals}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
