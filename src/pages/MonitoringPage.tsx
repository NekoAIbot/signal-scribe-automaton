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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Radio className="h-5 w-5 sm:h-6 sm:w-6 text-green-400 animate-pulse" />
            Live Trade Monitoring
          </h1>
          <p className="text-sm text-muted-foreground">Real-time tracking of your trading positions</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search trades..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-[200px]"
            />
          </div>
          <Button 
            variant="outline" 
            onClick={refresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
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
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="open">
            Open Positions ({filteredOpenTrades.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            Trade History ({filteredClosedTrades.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6">
            {/* Open Positions Grid */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                  Open Positions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading trades...</div>
                ) : filteredOpenTrades.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredOpenTrades.map((trade) => (
                      <LiveTradeCard key={trade.id} trade={trade} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No open positions
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Trade History</CardTitle>
              </CardHeader>
              <CardContent>
                <TradeHistoryTable trades={filteredClosedTrades.slice(0, 10)} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="open" className="mt-6">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading trades...</div>
          ) : filteredOpenTrades.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOpenTrades.map((trade) => (
                <LiveTradeCard key={trade.id} trade={trade} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                No open positions matching your search
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardContent className="p-0">
              <TradeHistoryTable trades={filteredClosedTrades} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MonitoringPage;
