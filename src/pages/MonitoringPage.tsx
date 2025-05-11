
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Activity, Search, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { getMonitoredTrades } from '@/services/ai/signalService';
import { MonitoredTrade } from '@/services/ai/types';
import { cn } from "@/lib/utils";

const MonitoringPage = () => {
  const [trades, setTrades] = useState<MonitoredTrade[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Fetch monitored trades
    const fetchTrades = async () => {
      try {
        setIsLoading(true);
        const tradesData = await getMonitoredTrades();
        
        // Convert any string types to proper enum values
        const typedTrades = tradesData.map(trade => ({
          ...trade,
          type: trade.type as 'BUY' | 'SELL',
          status: trade.status as 'open' | 'closed' | 'partially_closed'
        }));
        
        setTrades(typedTrades);
      } catch (error) {
        toast.error("Failed to load monitored trades");
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTrades();
  }, []);
  
  // Filter trades based on search term and active tab
  const filteredTrades = trades.filter(trade => {
    const matchesSearch = searchTerm === '' || 
      trade.symbol.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesTab = activeTab === 'all' || 
                      (activeTab === 'open' && trade.status === 'open') ||
                      (activeTab === 'closed' && trade.status === 'closed');
                       
    return matchesSearch && matchesTab;
  });
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Calculate total profit/loss
  const totalPnL = filteredTrades
    .filter(trade => trade.profit !== undefined && trade.profit !== null)
    .reduce((acc, trade) => acc + (trade.profit || 0), 0);
    
  // Calculate win rate
  const closedTrades = filteredTrades.filter(trade => trade.status === 'closed');
  const winningTrades = closedTrades.filter(trade => (trade.profit || 0) > 0);
  const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Trade Monitoring</h1>
        <Button 
          variant="outline" 
          onClick={() => {
            toast.info("Refreshing trade data...");
            // Refetch trades
            getMonitoredTrades().then(data => {
              // Convert any string types to proper enum values
              const typedTrades = data.map(trade => ({
                ...trade,
                type: trade.type as 'BUY' | 'SELL',
                status: trade.status as 'open' | 'closed' | 'partially_closed'
              }));
              
              setTrades(typedTrades);
              toast.success("Trade data refreshed");
            }).catch(() => {
              toast.error("Failed to refresh trade data");
            });
          }}
        >
          Refresh Data
        </Button>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Trades</p>
                <h3 className="text-2xl font-bold mt-1">{trades.filter(t => t.status === 'open').length}</h3>
              </div>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Activity className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total P&L</p>
                <h3 className={cn("text-2xl font-bold mt-1", totalPnL >= 0 ? "text-success-DEFAULT" : "text-danger-DEFAULT")}>
                  {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)} USD
                </h3>
              </div>
              <div className={cn("h-8 w-8 rounded-full flex items-center justify-center", 
                totalPnL >= 0 ? "bg-success-DEFAULT/10" : "bg-danger-DEFAULT/10")}>
                {totalPnL >= 0 ? (
                  <ArrowUp className={cn("h-5 w-5", totalPnL >= 0 ? "text-success-DEFAULT" : "text-danger-DEFAULT")} />
                ) : (
                  <ArrowDown className={cn("h-5 w-5", totalPnL >= 0 ? "text-success-DEFAULT" : "text-danger-DEFAULT")} />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Win Rate</p>
                <h3 className="text-2xl font-bold mt-1">{winRate.toFixed(1)}%</h3>
              </div>
              <div className="h-8 w-8 rounded-full bg-info/10 flex items-center justify-center">
                <div className="text-xs font-bold text-info">{closedTrades.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Trades Table */}
      <Card className="bg-trading-card border-trading-border">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
            <CardTitle className="text-base font-medium">Trade History</CardTitle>
            
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
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <Tabs 
            defaultValue="all" 
            className="p-4" 
            value={activeTab} 
            onValueChange={setActiveTab}
          >
            <TabsList className="bg-trading-bg border border-trading-border">
              <TabsTrigger value="all">All Trades</TabsTrigger>
              <TabsTrigger value="open">Open</TabsTrigger>
              <TabsTrigger value="closed">Closed</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="mt-4">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading trade data...</div>
              ) : filteredTrades.length > 0 ? (
                <div className="overflow-auto rounded-md border border-trading-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-trading-border bg-trading-bg">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Symbol</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Entry Price</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">Current Price</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">P&L</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden lg:table-cell">Open Time</th>
                        <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTrades.map((trade) => (
                        <tr 
                          key={trade.id} 
                          className="border-b border-trading-border hover:bg-trading-bg/50"
                        >
                          <td className="px-4 py-3 font-medium">{trade.symbol}</td>
                          <td className="px-4 py-3">
                            <Badge variant={trade.type === 'BUY' ? 'success' : 'destructive'}>
                              {trade.type}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">{trade.entry_price.toFixed(5)}</td>
                          <td className="px-4 py-3 text-right hidden md:table-cell">
                            {trade.current_price ? trade.current_price.toFixed(5) : "N/A"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={cn(
                              "font-medium",
                              (trade.profit || 0) > 0 
                                ? "text-success-DEFAULT" 
                                : (trade.profit || 0) < 0 
                                ? "text-danger-DEFAULT" 
                                : ""
                            )}>
                              {(trade.profit || 0) > 0 ? '+' : ''}{(trade.profit || 0).toFixed(2)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground hidden lg:table-cell">
                            {formatDate(trade.open_time)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge 
                              variant="outline" 
                              className={cn(
                                trade.status === 'open' 
                                  ? "border-info-DEFAULT text-info-DEFAULT" 
                                  : trade.status === 'partially_closed' 
                                  ? "border-warning-DEFAULT text-warning-DEFAULT" 
                                  : "border-success-DEFAULT text-success-DEFAULT"
                              )}
                            >
                              {trade.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No matching trades found
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
