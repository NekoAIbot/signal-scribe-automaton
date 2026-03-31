import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Activity } from "lucide-react";
import { useLiveTrades } from "@/hooks/useLiveTrades";

export function LivePnLTracker() {
  const { openTrades, isLoading, stats } = useLiveTrades();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 flex items-center justify-center h-32">
          <Activity className="h-5 w-5 animate-pulse text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (openTrades.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Live P&L
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">No open positions</p>
        </CardContent>
      </Card>
    );
  }

  const totalPnL = openTrades.reduce((sum, t) => sum + (t.profit || 0), 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            Live P&L
          </CardTitle>
          <Badge variant="outline" className="text-[10px]">
            {openTrades.length} open
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {/* Total P&L */}
        <div className="text-center py-1">
          <p className={`text-xl font-bold font-mono ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
          </p>
          <p className="text-[10px] text-muted-foreground">Unrealized P&L</p>
        </div>

        {/* Individual positions */}
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {openTrades.slice(0, 8).map(trade => (
            <div key={trade.id} className="flex items-center justify-between text-xs bg-muted rounded px-2 py-1.5">
              <div className="flex items-center gap-1.5">
                {trade.trade_type === 'BUY' 
                  ? <ArrowUp className="h-3 w-3 text-green-500" />
                  : <ArrowDown className="h-3 w-3 text-red-500" />
                }
                <span className="font-medium">{trade.symbol}</span>
                <span className="text-muted-foreground">{trade.lot_size}</span>
              </div>
              <span className={`font-mono font-medium ${(trade.profit || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {(trade.profit || 0) >= 0 ? '+' : ''}${(trade.profit || 0).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border">
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">Today's Closed</p>
            <p className="text-xs font-mono font-medium">{stats.closedTradesCount}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">Win Rate</p>
            <p className={`text-xs font-mono font-medium ${stats.winRate >= 50 ? 'text-green-500' : 'text-amber-500'}`}>
              {stats.winRate.toFixed(1)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
