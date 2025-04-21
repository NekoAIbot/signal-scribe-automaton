
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Settings } from 'lucide-react';
import { Button } from "@/components/ui/button";

export function TradingStatus() {
  return (
    <Card className="bg-trading-card border-trading-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">Trading Bot Status</CardTitle>
        <Button variant="ghost" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </CardHeader>
      
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Badge variant="outline" className="border-success-DEFAULT text-success-DEFAULT bg-success-DEFAULT/10">
              Active
            </Badge>
            <p className="mt-1 text-sm text-muted-foreground">Running for 13 hours</p>
          </div>
          
          <Button variant="destructive" size="sm">
            Stop Bot
          </Button>
        </div>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm">CPU Usage</span>
              <span className="text-sm font-medium">32%</span>
            </div>
            <Progress value={32} className="h-2" indicatorClassName="bg-info-DEFAULT" />
          </div>
          
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm">Memory Usage</span>
              <span className="text-sm font-medium">45%</span>
            </div>
            <Progress value={45} className="h-2" indicatorClassName="bg-warning-DEFAULT" />
          </div>
          
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm">API Requests (24h)</span>
              <span className="text-sm font-medium">1,458</span>
            </div>
            <Progress value={48} className="h-2" indicatorClassName="bg-primary" />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-trading-bg p-3 rounded-md">
            <p className="text-sm text-muted-foreground">Active Trades</p>
            <p className="text-xl font-bold">3</p>
          </div>
          <div className="bg-trading-bg p-3 rounded-md">
            <p className="text-sm text-muted-foreground">Pending Signals</p>
            <p className="text-xl font-bold">2</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
