import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Search, Radio, Inbox, Download } from "lucide-react";
import LiveTradeCard from '@/components/monitoring/LiveTradeCard';
import TradeHistoryTable from '@/components/monitoring/TradeHistoryTable';
import PerformanceStats from '@/components/monitoring/PerformanceStats';
import RealtimeStatusBadge from '@/components/monitoring/RealtimeStatusBadge';
import { useLiveTrades } from '@/hooks/useLiveTrades';
import { downloadTradesCsv } from '@/lib/exportTradesCsv';
import { toast } from 'sonner';

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
    <Inbox className="h-8 w-8 text-muted-foreground mb-2" />
    <p className="text-sm text-muted-foreground">{message}</p>
  </div>
);

const MonitoringPage = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const { openTrades, closedTrades, isLoading, stats, refresh, realtimeStatus, trades } = useLiveTrades();

  const handleExport = () => {
    if (!trades.length) { toast.info('No trades to export yet'); return; }
    downloadTradesCsv(trades);
    toast.success(`Exported ${trades.length} trades to CSV`);
  };

  const filteredOpenTrades = openTrades.filter(t => t.symbol.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredClosedTrades = closedTrades.filter(t => t.symbol.toLowerCase().includes(searchTerm.toLowerCase()));

  const reconnecting = realtimeStatus === 'reconnecting' || realtimeStatus === 'connecting';

  const renderEmpty = (label: string) => (
    <EmptyState
      message={
        isLoading
          ? 'Loading trades…'
          : reconnecting
            ? `Reconnecting to live updates… ${label.toLowerCase()} will appear here once the stream is back.`
            : `No ${label.toLowerCase()} yet. Execute a signal from the Signals page to see it here in real time.`
      }
    />
  );

  return (
    <div className="space-y-4 sm:space-y-6" data-testid="monitoring-page">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-base sm:text-2xl font-bold flex items-center gap-2 flex-wrap">
              <Radio className="h-4 w-4 sm:h-6 sm:w-6 text-green-400 animate-pulse shrink-0" />
              <span>Live Trade Monitoring</span>
              <RealtimeStatusBadge status={realtimeStatus} />
            </h1>
            <p className="text-[11px] sm:text-sm text-muted-foreground">Real-time tracking of your trading positions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search trades..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full"
              data-testid="trade-search"
            />
          </div>
          <Button variant="outline" onClick={refresh} disabled={isLoading} size="sm">
            <RefreshCw className={`h-4 w-4 sm:mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button variant="outline" onClick={handleExport} size="sm" data-testid="export-csv">
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
        </div>
      </div>

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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-3 sm:inline-flex sm:w-auto">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="open" className="text-xs sm:text-sm" data-testid="tab-open">
            Open ({filteredOpenTrades.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs sm:text-sm">
            History ({filteredClosedTrades.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 sm:mt-6">
          <div className="grid gap-4 sm:gap-6">
            <Card>
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                  Open Positions
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                {filteredOpenTrades.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4" data-testid="open-trades-grid">
                    {filteredOpenTrades.map((trade) => <LiveTradeCard key={trade.id} trade={trade} />)}
                  </div>
                ) : renderEmpty('Open positions')}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="text-sm sm:text-lg">Recent Trade History</CardTitle>
              </CardHeader>
              <CardContent className="p-0 sm:p-6 sm:pt-0">
                {filteredClosedTrades.length > 0 ? (
                  <div className="overflow-x-auto">
                    <TradeHistoryTable trades={filteredClosedTrades.slice(0, 10)} />
                  </div>
                ) : renderEmpty('Closed trades')}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="open" className="mt-4 sm:mt-6">
          {filteredOpenTrades.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredOpenTrades.map((trade) => <LiveTradeCard key={trade.id} trade={trade} />)}
            </div>
          ) : (
            <Card><CardContent>{renderEmpty('Open positions')}</CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4 sm:mt-6">
          <Card>
            <CardContent className="p-0">
              {filteredClosedTrades.length > 0 ? (
                <div className="overflow-x-auto">
                  <TradeHistoryTable trades={filteredClosedTrades} />
                </div>
              ) : renderEmpty('Closed trades')}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MonitoringPage;
