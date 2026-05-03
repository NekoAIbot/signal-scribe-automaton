
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, StopCircle, Settings } from "lucide-react";
import { toast } from "sonner";
import { useTradingBot } from '@/hooks/useTradingBot';
import { useBrokerAccounts } from '@/hooks/useBrokerAccounts';
import { useNavigate } from 'react-router-dom';

export function TradingBot() {
  const { isRunning, toggle } = useTradingBot();
  const { hasAccounts, mainAccount } = useBrokerAccounts();
  const navigate = useNavigate();

  const handleToggle = () => {
    if (!isRunning && (!hasAccounts || !mainAccount)) {
      toast.error("Please configure and activate your main broker account first");
      navigate('/settings');
      return;
    }

    toggle();

    if (!isRunning) {
      toast.success("Trading bot started — now executing signals automatically");
    } else {
      toast.info("Trading bot stopped — no longer executing signals");
    }
  };

  return (
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
              <p>Bot is actively monitoring and executing trades based on your strategy settings.</p>
            ) : (
              <p>Start the bot to automatically execute trades when new signals are generated.</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={isRunning ? "destructive" : "default"}
              onClick={handleToggle}
              className="flex-1"
            >
              {isRunning ? (
                <><StopCircle className="mr-2 h-4 w-4" /> Stop Bot</>
              ) : (
                <><PlayCircle className="mr-2 h-4 w-4" /> Start Bot</>
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/settings')}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>

          {mainAccount && (
            <div className="text-xs text-muted-foreground">
              Main broker: {mainAccount.account_name} ({mainAccount.account_type})
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
