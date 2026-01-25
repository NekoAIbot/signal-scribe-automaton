import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Trade {
  id: string;
  symbol: string;
  trade_type: 'BUY' | 'SELL';
  status: 'open' | 'closed' | 'partially_closed' | 'pending' | 'cancelled';
  entry_price: number;
  current_price: number | null;
  lot_size: number;
  profit: number;
  stop_loss: number | null;
  take_profit: number | null;
  open_time: string;
}

interface LiveTradeCardProps {
  trade: Trade;
}

const LiveTradeCard: React.FC<LiveTradeCardProps> = ({ trade }) => {
  const isPositive = trade.profit >= 0;
  const priceDiff = trade.current_price 
    ? ((trade.current_price - trade.entry_price) / trade.entry_price * 100)
    : 0;
  
  return (
    <Card className="bg-card border-border hover:border-primary/50 transition-all">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">{trade.symbol}</span>
            <Badge 
              variant={trade.trade_type === 'BUY' ? 'default' : 'destructive'}
              className={cn(
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
            trade.status === 'open' ? 'border-blue-500 text-blue-400' :
            trade.status === 'closed' ? 'border-gray-500 text-gray-400' :
            'border-yellow-500 text-yellow-400'
          )}>
            {trade.status}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <p className="text-xs text-muted-foreground">Entry Price</p>
            <p className="font-mono font-medium">{trade.entry_price.toFixed(5)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Current Price</p>
            <div className="flex items-center gap-1">
              <p className="font-mono font-medium">
                {trade.current_price?.toFixed(5) || 'N/A'}
              </p>
              {trade.current_price && (
                priceDiff >= 0 
                  ? <TrendingUp className="w-3 h-3 text-green-400" />
                  : <TrendingDown className="w-3 h-3 text-red-400" />
              )}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-sm mb-3">
          <div>
            <p className="text-xs text-muted-foreground">Lot Size</p>
            <p className="font-medium">{trade.lot_size}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Stop Loss</p>
            <p className="font-mono text-red-400">{trade.stop_loss?.toFixed(5) || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Take Profit</p>
            <p className="font-mono text-green-400">{trade.take_profit?.toFixed(5) || '-'}</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <span className="text-xs text-muted-foreground">
            {new Date(trade.open_time).toLocaleString()}
          </span>
          <div className={cn(
            "font-bold text-lg",
            isPositive ? "text-green-400" : "text-red-400"
          )}>
            {isPositive ? '+' : ''}{trade.profit.toFixed(2)} USD
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveTradeCard;
