import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowUp, ArrowDown, TrendingUp, TrendingDown, ChevronDown, ChevronUp, History, RotateCw, Crosshair } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import TradeTimeline from "./TradeTimeline";
import BrokerBadge from "@/components/common/BrokerBadge";
import { useBrokerAccounts } from "@/hooks/useBrokerAccounts";
import type { Trade } from "@/hooks/useLiveTrades";

interface LiveTradeCardProps { trade: Trade }

const isFailed = (t: Trade) =>
  t.status === 'cancelled' ||
  (t.last_execution_status?.includes('failed') ?? false) ||
  (t.execution_timeline?.some(e => e.status === 'failed') ?? false);

const LiveTradeCard: React.FC<LiveTradeCardProps> = ({ trade }) => {
  const [open, setOpen] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const { accounts, mainAccount } = useBrokerAccounts();
  const tradeBroker = accounts.find(a => a.id === trade.broker_account_id) || null;

  const doRetry = async (forceMain: boolean) => {
    setRetrying(true);
    try {
      const target = forceMain ? mainAccount : tradeBroker;
      if (forceMain && !mainAccount) {
        toast.error('No active main broker account');
        setRetrying(false);
        return;
      }
      const { data, error } = await supabase.functions.invoke('execute-trade', {
        body: {
          symbol: trade.symbol,
          type: trade.trade_type,
          price: trade.entry_price,
          lotSize: trade.lot_size,
          stopLoss: trade.stop_loss,
          takeProfit: trade.take_profit,
          brokerAccountId: forceMain ? mainAccount?.id : trade.broker_account_id,
          forceMainBroker: forceMain,
          strategyId: trade.strategy_id,
          modelId: trade.model_id,
          retryOf: trade.id,
        },
      });
      if (error || !data?.success) {
        toast.error(`Retry failed: ${data?.error || error?.message || 'unknown error'}`);
      } else {
        toast.success(`Retry submitted for ${trade.symbol}${target ? ` on ${target.account_name}` : ''}`);
      }
    } catch (e: any) {
      toast.error(`Retry failed: ${e?.message || e}`);
    } finally {
      setRetrying(false);
    }
  };

  const handleRetry = () => doRetry(false);
  const handleRetryMain = () => doRetry(true);

  const isPositive = trade.profit >= 0;
  const priceDiff = trade.current_price
    ? ((trade.current_price - trade.entry_price) / trade.entry_price * 100)
    : 0;
  const lastStage = trade.execution_timeline?.[trade.execution_timeline.length - 1];

  return (
    <Card className="bg-card border-border hover:border-primary/50 transition-all" data-testid={`trade-card-${trade.id}`}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-base sm:text-lg truncate">{trade.symbol}</span>
            <Badge
              variant={trade.trade_type === 'BUY' ? 'default' : 'destructive'}
              className={cn(
                'shrink-0',
                trade.trade_type === 'BUY'
                  ? 'bg-green-500/20 text-green-400 border-green-500/50'
                  : 'bg-red-500/20 text-red-400 border-red-500/50'
              )}
            >
              {trade.trade_type === 'BUY' ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
              {trade.trade_type}
            </Badge>
          </div>
          <Badge variant="outline" className={cn(
            'shrink-0 text-[10px] sm:text-xs',
            trade.status === 'open' ? 'border-blue-500 text-blue-400' :
            trade.status === 'closed' ? 'border-gray-500 text-gray-400' :
            trade.status === 'cancelled' ? 'border-red-500 text-red-400' :
            'border-yellow-500 text-yellow-400'
          )}>
            {trade.status}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-3">
          <div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Entry</p>
            <p className="font-mono text-sm font-medium">{trade.entry_price.toFixed(5)}</p>
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Current</p>
            <div className="flex items-center gap-1">
              <p className="font-mono text-sm font-medium">{trade.current_price?.toFixed(5) || 'N/A'}</p>
              {trade.current_price && (priceDiff >= 0
                ? <TrendingUp className="w-3 h-3 text-green-400" />
                : <TrendingDown className="w-3 h-3 text-red-400" />)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs sm:text-sm mb-3">
          <div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Lot</p>
            <p className="font-medium">{trade.lot_size}</p>
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">SL</p>
            <p className="font-mono text-red-400">{trade.stop_loss?.toFixed(5) || '-'}</p>
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">TP</p>
            <p className="font-mono text-green-400">{trade.take_profit?.toFixed(5) || '-'}</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border gap-2">
          <span className="text-[10px] sm:text-xs text-muted-foreground truncate">
            {new Date(trade.open_time).toLocaleString()}
          </span>
          <div className={cn(
            "font-bold text-sm sm:text-lg shrink-0",
            isPositive ? "text-green-400" : "text-red-400"
          )}>
            {isPositive ? '+' : ''}{trade.profit.toFixed(2)} USD
          </div>
        </div>

        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger
            className="mt-2 inline-flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground hover:text-foreground"
            data-testid={`timeline-toggle-${trade.id}`}
          >
            <History className="h-3 w-3" />
            Execution timeline ({trade.execution_timeline?.length || 0})
            {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {lastStage && (
              <span className={cn(
                'ml-1 rounded px-1 py-0.5 text-[10px]',
                lastStage.status === 'success' && 'bg-green-500/20 text-green-400',
                lastStage.status === 'failed' && 'bg-red-500/20 text-red-400',
                lastStage.status === 'started' && 'bg-blue-500/20 text-blue-400',
              )}>
                {lastStage.stage}
              </span>
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 rounded-md border border-border bg-muted/30 p-2 sm:p-3">
            <TradeTimeline events={trade.execution_timeline} />
            {isFailed(trade) && (
              <Button
                size="sm"
                variant="outline"
                className="mt-2 h-7 text-[10px] sm:text-xs"
                onClick={handleRetry}
                disabled={retrying}
                data-testid={`retry-${trade.id}`}
              >
                <RotateCw className={cn('h-3 w-3 mr-1', retrying && 'animate-spin')} />
                {retrying ? 'Retrying…' : 'Retry failed execution'}
              </Button>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};

export default LiveTradeCard;
