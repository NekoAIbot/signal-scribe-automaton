
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, StopCircle, Settings } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from '@/contexts/AuthContext';
import { BrokerSettings } from '@/services/types/broker';
import { BrokerSettingsModal } from "@/components/settings/BrokerSettingsModal";

export function TradingBot() {
  const [isRunning, setIsRunning] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [brokerSettings, setBrokerSettings] = useState<BrokerSettings | null>(() => {
    const settings = localStorage.getItem('brokerSettings');
    return settings ? JSON.parse(settings) : null;
  });
  
  const { user } = useAuth();
  const hasActiveSubscription = user?.subscriptionTier && user.subscriptionTier !== 'free';

  const toggleBot = () => {
    // Check if broker is configured before starting
    if (!isRunning && !brokerSettings) {
      toast.error("Please configure your broker settings first");
      setSettingsOpen(true);
      return;
    }
    
    setIsRunning(!isRunning);
    
    if (!isRunning) {
      toast.success("Trading bot started - now executing signals automatically");
    } else {
      toast.info("Trading bot stopped - no longer executing signals");
    }
  };
  
  const saveBrokerSettings = (settings: BrokerSettings) => {
    setBrokerSettings(settings);
    localStorage.setItem('brokerSettings', JSON.stringify(settings));
    toast.success("Broker settings saved successfully");
  };
  
  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">Trading Bot</CardTitle>
            <Badge variant={isRunning ? "success" : "secondary"}>
              {isRunning ? "Running" : "Stopped"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="space-y-4">
            <div className="text-sm">
              {isRunning ? (
                <p>Bot is actively monitoring the market and executing trades based on your strategy settings.</p>
              ) : (
                <p>Start the bot to automatically execute trades when new signals are generated.</p>
              )}
            </div>
            
            {!hasActiveSubscription && (
              <div className="p-2 bg-warning-DEFAULT/10 border border-warning-DEFAULT/20 rounded-md text-xs text-warning-DEFAULT">
                Upgrade your subscription to enable automatic trading with the bot.
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Button
                variant={isRunning ? "destructive" : "default"}
                onClick={toggleBot}
                disabled={!hasActiveSubscription}
                className="flex-1"
              >
                {isRunning ? (
                  <>
                    <StopCircle className="mr-2 h-4 w-4" /> Stop Bot
                  </>
                ) : (
                  <>
                    <PlayCircle className="mr-2 h-4 w-4" /> Start Bot
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
            
            {brokerSettings && (
              <div className="text-xs text-muted-foreground">
                Connected to: {brokerSettings.brokerName} ({brokerSettings.accountType})
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <BrokerSettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        initialSettings={brokerSettings || undefined}
        onSave={saveBrokerSettings}
      />
    </>
  );
}
