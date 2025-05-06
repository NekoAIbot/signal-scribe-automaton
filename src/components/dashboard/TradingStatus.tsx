
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Settings, Brain } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';
import { useWebSocketMarketData } from '@/services/websocketService';
import { useQuery } from '@tanstack/react-query';
import { getEnhancedSignals, getAIInsights, getActiveModels } from '@/services/aiSignalService';
import { API_LIMITS } from '@/config/apiConfig';

export function TradingStatus() {
  const [isActive, setIsActive] = useState(true);
  const [runningTime, setRunningTime] = useState("00:00:00");
  const [cpuUsage, setCpuUsage] = useState(32);
  const [memoryUsage, setMemoryUsage] = useState(45);
  const [apiRequests, setApiRequests] = useState(0);
  const [activeTrades, setActiveTrades] = useState(0);
  const [pendingSignals, setPendingSignals] = useState(0);
  const [activeModel, setActiveModel] = useState<string>('Transformer');
  
  const { isConnected, usingMockData } = useWebSocketMarketData();
  const { data: tradingSignals = [] } = useQuery({
    queryKey: ['enhancedSignals'],
    queryFn: getEnhancedSignals,
    refetchInterval: 10000,
  });

  const { data: mlModels = [] } = useQuery({
    queryKey: ['mlModels'],
    queryFn: getActiveModels,
  });

  const { data: aiInsights, refetch: refetchInsights } = useQuery({
    queryKey: ['aiInsights'],
    queryFn: getAIInsights,
    refetchInterval: 30000,
  });
  
  const startTime = React.useRef(new Date().getTime());
  
  // Toggle bot active status
  const toggleBotStatus = () => {
    setIsActive(!isActive);
    toast.success(isActive ? "Bot stopped successfully" : "Bot started successfully");
    
    if (!isActive) {
      // Reset start time when reactivating
      startTime.current = new Date().getTime();
      refetchInsights();
    }
  };

  // Open settings modal
  const openSettings = () => {
    toast.info("Settings panel would open here");
  };
  
  // Update running time
  useEffect(() => {
    if (!isActive) return;
    
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const timeDiff = now - startTime.current;
      
      // Format as HH:MM:SS
      const hours = Math.floor(timeDiff / 3600000);
      const minutes = Math.floor((timeDiff % 3600000) / 60000);
      const seconds = Math.floor((timeDiff % 60000) / 1000);
      
      setRunningTime(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isActive]);
  
  // Simulate system metrics
  useEffect(() => {
    if (!isActive) return;
    
    const interval = setInterval(() => {
      setCpuUsage(20 + Math.floor(Math.random() * 30)); // 20-50% CPU
      setMemoryUsage(30 + Math.floor(Math.random() * 30)); // 30-60% Memory
      setApiRequests(prev => Math.min(prev + Math.floor(Math.random() * 10), API_LIMITS.TWELVEDATA_DAILY_LIMIT));
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isActive]);
  
  // Update statistics based on signals
  useEffect(() => {
    // Count pending signals (new or executing)
    const pending = tradingSignals.filter(signal => 
      signal.status === 'new' || signal.status === 'executing'
    ).length;
    
    // Count active trades (executed)
    const active = tradingSignals.filter(signal => 
      signal.status === 'executed'
    ).length;
    
    setPendingSignals(pending);
    setActiveTrades(active);
  }, [tradingSignals]);
  
  // Set active model from the database
  useEffect(() => {
    if (mlModels.length > 0) {
      setActiveModel(mlModels[0].type);
    }
  }, [mlModels]);
  
  return (
    <Card className="bg-trading-card border-trading-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">AI Trading System Status</CardTitle>
        <Button variant="ghost" size="icon" onClick={openSettings}>
          <Settings className="h-4 w-4" />
        </Button>
      </CardHeader>
      
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Badge 
              variant="outline" 
              className={isActive && isConnected
                ? "border-success-DEFAULT text-success-DEFAULT bg-success-DEFAULT/10" 
                : "border-danger-DEFAULT text-danger-DEFAULT bg-danger-DEFAULT/10"}>
              {isActive && isConnected ? "Active" : "Inactive"}
            </Badge>
            <p className="mt-1 text-sm text-muted-foreground">
              {isActive 
                ? `Running for ${runningTime}` 
                : "Bot is currently stopped"}
            </p>
          </div>
          
          <Button 
            variant={isActive ? "destructive" : "default"} 
            size="sm"
            onClick={toggleBotStatus}>
            {isActive ? "Stop Bot" : "Start Bot"}
          </Button>
        </div>
        
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium flex items-center gap-1">
            <Brain className="h-4 w-4" /> AI Model:
          </span>
          <Badge variant="default" className="bg-primary">
            {activeModel}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Market Prediction:</span>
          <Badge variant={aiInsights?.marketPrediction === "Bullish" ? "success" : "destructive"}>
            {aiInsights?.marketPrediction || "Analyzing"}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Risk Level:</span>
          <Badge variant="outline" className={
            aiInsights?.riskAssessment === "High" 
              ? "border-danger-DEFAULT text-danger-DEFAULT" 
              : aiInsights?.riskAssessment === "Medium"
              ? "border-warning-DEFAULT text-warning-DEFAULT"
              : "border-success-DEFAULT text-success-DEFAULT"
          }>
            {aiInsights?.riskAssessment || "Low"}
          </Badge>
        </div>
        
        <div className="space-y-4 mt-4">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm">AI Confidence</span>
              <span className="text-sm font-medium">{aiInsights?.confidenceLevel || 0}%</span>
            </div>
            <Progress value={aiInsights?.confidenceLevel || 0} className="h-2" />
          </div>
          
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm">CPU Usage</span>
              <span className="text-sm font-medium">{cpuUsage}%</span>
            </div>
            <Progress value={cpuUsage} className="h-2" />
          </div>
          
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm">Memory Usage</span>
              <span className="text-sm font-medium">{memoryUsage}%</span>
            </div>
            <Progress value={memoryUsage} className="h-2" />
          </div>
          
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm">API Requests (24h)</span>
              <span className="text-sm font-medium">{apiRequests.toLocaleString()} / {API_LIMITS.TWELVEDATA_DAILY_LIMIT}</span>
            </div>
            <Progress 
              value={(apiRequests / API_LIMITS.TWELVEDATA_DAILY_LIMIT) * 100} 
              className="h-2" 
            />
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
