import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PerformanceMetrics } from '@/components/dashboard/PerformanceMetrics';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import {
  PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar
} from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

interface Trade {
  id: string;
  symbol: string;
  trade_type: string;
  status: string;
  entry_price: number;
  close_price: number | null;
  profit: number | null;
  open_time: string;
  close_time: string | null;
  lot_size: number;
  strategy_id: string | null;
  model_id: string | null;
}

const AnalyticsPage = () => {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('30days');

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      const now = new Date();
      let since = new Date();
      if (timeframe === '7days') since.setDate(now.getDate() - 7);
      else if (timeframe === '30days') since.setDate(now.getDate() - 30);
      else if (timeframe === '90days') since.setDate(now.getDate() - 90);
      else if (timeframe === 'year') since.setFullYear(now.getFullYear() - 1);
      else since = new Date(0);

      const [{ data: tradeData }, { data: modelData }] = await Promise.all([
        supabase.from('trades').select('*').gte('open_time', since.toISOString()).order('open_time', { ascending: true }).limit(1000),
        supabase.from('ml_models').select('id, name, type, accuracy, is_active, last_trained_at')
      ]);

      setTrades((tradeData || []) as Trade[]);
      setModels(modelData || []);
      setLoading(false);
    };
    fetchData();
  }, [user, timeframe]);

  const closedTrades = useMemo(() => trades.filter(t => t.status === 'closed'), [trades]);
  const winningTrades = useMemo(() => closedTrades.filter(t => (t.profit || 0) > 0), [closedTrades]);
  const losingTrades = useMemo(() => closedTrades.filter(t => (t.profit || 0) < 0), [closedTrades]);

  // Equity curve from closed trades
  const equityData = useMemo(() => {
    let balance = 10000;
    return closedTrades.map(t => {
      balance += (t.profit || 0);
      return {
        date: new Date(t.close_time || t.open_time).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }),
        balance: Number(balance.toFixed(2))
      };
    });
  }, [closedTrades]);

  // Trade distribution by symbol
  const pieData = useMemo(() => {
    const counts: Record<string, number> = {};
    trades.forEach(t => { counts[t.symbol] = (counts[t.symbol] || 0) + 1; });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  }, [trades]);

  // Win/Loss by day of week
  const dayStats = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const stats = days.map(d => ({ day: d, wins: 0, losses: 0 }));
    closedTrades.forEach(t => {
      const day = new Date(t.close_time || t.open_time).getDay();
      if ((t.profit || 0) > 0) stats[day].wins++;
      else if ((t.profit || 0) < 0) stats[day].losses++;
    });
    return stats;
  }, [closedTrades]);

  const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length * 100) : 0;
  const avgWin = winningTrades.length > 0 ? winningTrades.reduce((s, t) => s + (t.profit || 0), 0) / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? losingTrades.reduce((s, t) => s + (t.profit || 0), 0) / losingTrades.length : 0;
  const totalPnL = trades.reduce((s, t) => s + (t.profit || 0), 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Trading Analytics</h1>
      
      <div className="flex flex-col md:flex-row items-center justify-between space-y-2 md:space-y-0">
        <div className="text-sm text-muted-foreground">
          {loading ? 'Loading...' : `${trades.length} trades | ${closedTrades.length} closed | Win rate: ${winRate.toFixed(1)}%`}
        </div>
        <Select value={timeframe} onValueChange={setTimeframe}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7days">Last 7 days</SelectItem>
            <SelectItem value="30days">Last 30 days</SelectItem>
            <SelectItem value="90days">Last 90 days</SelectItem>
            <SelectItem value="year">This year</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : trades.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No trade data found for this period. Start trading to see analytics.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total P&L</p>
              <p className={`text-xl font-bold ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
              </p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Win Rate</p>
              <p className={`text-xl font-bold ${winRate >= 50 ? 'text-green-500' : 'text-amber-500'}`}>{winRate.toFixed(1)}%</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Avg Win</p>
              <p className="text-xl font-bold text-green-500">+${avgWin.toFixed(2)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Avg Loss</p>
              <p className="text-xl font-bold text-red-500">${avgLoss.toFixed(2)}</p>
            </CardContent></Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Equity Curve */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Equity Curve</CardTitle></CardHeader>
              <CardContent>
                <div className="h-56 sm:h-72">
                  {equityData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={equityData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={v => `$${v}`} width={65} />
                        <Tooltip formatter={(v) => [`$${v}`, 'Balance']} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                        <Line type="monotone" dataKey="balance" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-10">No closed trades yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Trade Distribution */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Trade Distribution</CardTitle></CardHeader>
              <CardContent>
                <div className="h-56 sm:h-72">
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                          {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v) => [`${v} trades`, 'Count']} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-10">No trades yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Win/Loss by Day */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Performance by Day of Week</CardTitle></CardHeader>
            <CardContent>
              <div className="h-48 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dayStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="day" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Legend />
                    <Bar dataKey="wins" fill="hsl(142, 71%, 45%)" name="Wins" />
                    <Bar dataKey="losses" fill="hsl(0, 84%, 60%)" name="Losses" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <PerformanceMetrics />

          {/* ML Model Stats */}
          {models.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">ML Model Performance</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {models.map(m => (
                    <div key={m.id} className="bg-muted p-4 rounded-md">
                      <h3 className="text-sm font-medium mb-1">{m.name}</h3>
                      <div className="flex items-end space-x-2">
                        <span className="text-2xl font-bold">{(Number(m.accuracy) * 100).toFixed(1)}%</span>
                        <span className="text-xs text-muted-foreground">{m.type}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {m.is_active ? '🟢 Active' : '⚪ Inactive'} · Last trained: {m.last_trained_at ? new Date(m.last_trained_at).toLocaleDateString() : 'Never'}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default AnalyticsPage;
