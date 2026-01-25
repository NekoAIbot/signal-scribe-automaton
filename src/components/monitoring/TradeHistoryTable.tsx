import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Trade {
  id: string;
  symbol: string;
  trade_type: 'BUY' | 'SELL';
  status: 'open' | 'closed' | 'partially_closed' | 'pending' | 'cancelled';
  entry_price: number;
  close_price: number | null;
  lot_size: number;
  profit: number;
  commission: number;
  swap: number;
  open_time: string;
  close_time: string | null;
}

interface TradeHistoryTableProps {
  trades: Trade[];
}

const TradeHistoryTable: React.FC<TradeHistoryTableProps> = ({ trades }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const calculateNetProfit = (trade: Trade) => {
    return trade.profit - trade.commission - trade.swap;
  };

  return (
    <div className="rounded-md border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Symbol</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Entry</TableHead>
            <TableHead className="text-right">Close</TableHead>
            <TableHead className="text-right">Lots</TableHead>
            <TableHead className="text-right">Gross P&L</TableHead>
            <TableHead className="text-right">Fees</TableHead>
            <TableHead className="text-right">Net P&L</TableHead>
            <TableHead>Open Time</TableHead>
            <TableHead>Close Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trades.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                No trade history available
              </TableCell>
            </TableRow>
          ) : (
            trades.map((trade) => {
              const netProfit = calculateNetProfit(trade);
              return (
                <TableRow key={trade.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{trade.symbol}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={trade.trade_type === 'BUY' ? 'default' : 'destructive'}
                      className={cn(
                        trade.trade_type === 'BUY' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      )}
                    >
                      {trade.trade_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">{trade.entry_price.toFixed(5)}</TableCell>
                  <TableCell className="text-right font-mono">
                    {trade.close_price?.toFixed(5) || '-'}
                  </TableCell>
                  <TableCell className="text-right">{trade.lot_size}</TableCell>
                  <TableCell className={cn(
                    "text-right font-medium",
                    trade.profit >= 0 ? "text-green-400" : "text-red-400"
                  )}>
                    {trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    -{(trade.commission + trade.swap).toFixed(2)}
                  </TableCell>
                  <TableCell className={cn(
                    "text-right font-bold",
                    netProfit >= 0 ? "text-green-400" : "text-red-400"
                  )}>
                    {netProfit >= 0 ? '+' : ''}{netProfit.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(trade.open_time)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {trade.close_time ? formatDate(trade.close_time) : '-'}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default TradeHistoryTable;
