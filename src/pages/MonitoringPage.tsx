
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { TrendingUp, TrendingDown, Search, Download, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { toast } from "sonner";
import { getMonitoredTrades } from '@/services/ai/signalService';
import { MonitoredTrade } from '@/services/ai/types';

const MonitoringPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [trades, setTrades] = useState<MonitoredTrade[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('open');
  
  // Fetch monitored trades
  useEffect(() => {
    const fetchTrades = async () => {
      setIsLoading(true);
      try {
        const status = activeTab === 'all' ? undefined : 
                      activeTab === 'open' ? 'open' : 
                      'closed' as 'open' | 'closed' | 'partially_closed' | undefined;
                      
        const data = await getMonitoredTrades(undefined, status);
        setTrades(data);
      } catch (error) {
        console.error("Error fetching trades:", error);
        toast.error("Failed to load monitored trades");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTrades();
  }, [activeTab]);
  
  // Filter trades based on search term
  const filteredTrades = trades.filter(trade => 
    searchTerm === '' || 
    trade.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trade.ticket_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Calculate total profit for displayed trades
  const totalProfit = filteredTrades.reduce((sum, trade) => {
    return sum + (trade.profit || 0);
  }, 0);
  
  // Export trades to CSV
  const exportTrades = () => {
    try {
      const headers = [
        "Ticket", "Symbol", "Type", "Entry Price", "Current Price", 
        "Volume", "Profit", "Status", "Open Time", "Close Time", "Broker Account"
      ];
      
      const csvContent = [
        headers.join(','),
        ...trades.map(trade => [
          trade.ticket_number || "-",
          trade.symbol,
          trade.type,
          trade.entry_price.toFixed(5),
          (trade.current_price || trade.entry_price).toFixed(5),
          trade.volume.toFixed(2),
          (trade.profit || 0).toFixed(2),
          trade.status,
          new Date(trade.open_time).toLocaleString(),
          trade.close_time ? new Date(trade.close_time).toLocaleString() : "-",
          trade.broker_account_id
        ].join(','))
      ].join('\n');
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `monitored_trades_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Trades exported to CSV successfully');
    } catch (error) {
      console.error('Error exporting trades:', error);
      toast.error('Failed to export trades');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Trade Monitoring</h1>
      
      <Card className="bg-trading-card border-trading-border">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
            <div>
              <CardTitle className="text-base font-medium">Active Trades</CardTitle>
              <CardDescription>Monitor and track your executed trades</CardDescription>
            </div>
            
            <div className="flex space-x-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search trades..."
                  className="pl-8 bg-trading-bg border-trading-border w-[180px] md:w-[220px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="sm" onClick={exportTrades}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <Tabs 
            defaultValue="open" 
            className="p-4" 
            value={activeTab} 
            onValueChange={setActiveTab}
          >
            <TabsList className="bg-trading-bg border border-trading-border">
              <TabsTrigger value="open">Open Trades</TabsTrigger>
              <TabsTrigger value="closed">Closed Trades</TabsTrigger>
              <TabsTrigger value="all">All Trades</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="mt-4">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Loading trades...</p>
                </div>
              ) : filteredTrades.length > 0 ? (
                <>
                  <div className="overflow-auto rounded-md border border-trading-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-trading-border bg-trading-bg">
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Symbol</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                          <th className="px-4 py-3 text-right font-medium text-muted-foreground">Entry Price</th>
                          <th className="px-4 py-3 text-right font-medium text-muted-foreground">Current Price</th>
                          <th className="px-4 py-3 text-right font-medium text-muted-foreground">Volume</th>
                          <th className="px-4 py-3 text-right font-medium text-muted-foreground">P/L</th>
                          <th className="px-4 py-3 text-right font-medium text-muted-foreground">Status</th>
                          <th className="px-4 py-3 text-right font-medium text-muted-foreground">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTrades.map((trade) => {
                          const isProfit = (trade.profit || 0) > 0;
                          
                          return (
                            <tr 
                              key={trade.id} 
                              className="border-b border-trading-border hover:bg-trading-bg/50"
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center">
                                  <span className="font-medium">{trade.symbol}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant={trade.type === 'BUY' ? 'success' : 'destructive'}>
                                  {trade.type}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-right font-mono">
                                {trade.entry_price.toFixed(5)}
                              </td>
                              <td className="px-4 py-3 text-right font-mono">
                                {(trade.current_price || trade.entry_price).toFixed(5)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {trade.volume.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className={cn(
                                  "flex items-center justify-end font-medium",
                                  isProfit ? "text-success-DEFAULT" : "text-danger-DEFAULT"
                                )}>
                                  {isProfit ? 
                                    <ArrowUpRight className="h-4 w-4 mr-1" /> : 
                                    <ArrowDownRight className="h-4 w-4 mr-1" />
                                  }
                                  {(trade.profit || 0).toFixed(2)} USD
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {trade.pips || 0} pips
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Badge 
                                  variant={trade.status === 'open' ? "outline" : 
                                          trade.status === 'partially_closed' ? "secondary" : "default"}
                                >
                                  {trade.status}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-right text-muted-foreground">
                                <div>{new Date(trade.open_time).toLocaleDateString()}</div>
                                <div className="text-xs">{new Date(trade.open_time).toLocaleTimeString()}</div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="mt-4 flex justify-between items-center p-3 bg-card border rounded-md">
                    <div>
                      <span className="text-sm text-muted-foreground">Total trades: </span>
                      <span className="font-medium">{filteredTrades.length}</span>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Total profit/loss: </span>
                      <span className={cn(
                        "font-medium",
                        totalProfit > 0 ? "text-success-DEFAULT" : 
                        totalProfit < 0 ? "text-danger-DEFAULT" : ""
                      )}>
                        {totalProfit.toFixed(2)} USD
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No matching trades found.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default MonitoringPage;
