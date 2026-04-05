import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Search, Radio } from "lucide-react";
import LiveTradeCard from '@/components/monitoring/LiveTradeCard';
import TradeHistoryTable from '@/components/monitoring/TradeHistoryTable';
import PerformanceStats from '@/components/monitoring/PerformanceStats';
import { useLiveTrades } from '@/hooks/useLiveTrades';

const MonitoringPage = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const { trades, openTrades, closedTrades, isLoading, stats, refresh } = useLiveTrades();

  const filteredOpenTrades = openTrades.filter(trade =>
    trade.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredClosedTrades = closedTrades.filter(trade =>
    trade.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
            <Radio className="h-5 w-5 sm:h-6 sm:w-6 text-green-400 animate-pulse" />
            Live Trade Monitoring
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Real-time tracking of your trading positions</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search trades..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full sm:w-[200px]"
            />
          </div>
          <Button 
            variant="outline" 
            onClick={refresh}
            disabled={isLoading}
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-1 sm:mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Performance Stats */}
      <PerformanceStats
        totalPnL={stats.totalPnL}
        openTrades={stats.openTradesCount}
        closedTrades={stats.closedTradesCount}
        winRate={stats.winRate}
        avgWin={stats.avgWin}
        avgLoss={stats.avgLoss}
        largestWin={stats.largestWin}
        largestLoss={stats.largestLoss}
        profitFactor={stats.profitFactor}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="open" className="text-xs sm:text-sm">
            Open ({filteredOpenTrades.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs sm:text-sm">
            History ({filteredClosedTrades.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 sm:mt-6">
          <div className="grid gap-4 sm:gap-6">
            {/* Open Positions Grid */}
            <Card>
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                  Open Positions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading trades...</div>
                ) : filteredOpenTrades.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {filteredOpenTrades.map((trade) => (
                      <LiveTradeCard key={trade.id} trade={trade} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No open positions
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent History */}
            <Card>
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="text-sm sm:text-lg">Recent Trade History</CardTitle>
              </CardHeader>
              <CardContent className="p-0 sm:p-6 sm:pt-0">
                <div className="overflow-x-auto">
                  <TradeHistoryTable trades={filteredClosedTrades.slice(0, 10)} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="open" className="mt-4 sm:mt-6">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading trades...</div>
          ) : filteredOpenTrades.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredOpenTrades.map((trade) => (
                <LiveTradeCard key={trade.id} trade={trade} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground text-sm">
                No open positions matching your search
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4 sm:mt-6">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <TradeHistoryTable trades={filteredClosedTrades} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MonitoringPage;
