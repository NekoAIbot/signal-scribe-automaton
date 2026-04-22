import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface TimelineEvent {
  stage: string;
  status: 'started' | 'success' | 'failed';
  at: string;
  message?: string;
  meta?: Record<string, unknown>;
}

export interface Trade {
  id: string;
  user_id: string;
  symbol: string;
  trade_type: 'BUY' | 'SELL';
  status: 'open' | 'closed' | 'partially_closed' | 'pending' | 'cancelled';
  entry_price: number;
  current_price: number | null;
  close_price: number | null;
  lot_size: number;
  stop_loss: number | null;
  take_profit: number | null;
  profit: number;
  commission: number;
  swap: number;
  ticket_number: string | null;
  open_time: string;
  close_time: string | null;
  strategy_id: string | null;
  model_id: string | null;
  broker_account_id: string | null;
  execution_timeline: TimelineEvent[];
  last_execution_status: string | null;
}

export type RealtimeStatus = 'connecting' | 'connected' | 'reconnecting' | 'error';

const normalize = (row: any): Trade => ({
  ...row,
  trade_type: row.trade_type as 'BUY' | 'SELL',
  status: row.status as Trade['status'],
  execution_timeline: Array.isArray(row.execution_timeline) ? row.execution_timeline : [],
  last_execution_status: row.last_execution_status ?? null,
});

export const useLiveTrades = () => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('connecting');
  const { user } = useAuth();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchTrades = async () => {
    if (!user) { setIsLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .order('open_time', { ascending: false })
        .limit(100);
      if (error) throw error;
      setTrades((data || []).map(normalize));
    } catch (err) {
      console.error('Error fetching trades:', err);
      toast.error('Failed to load trades');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchTrades(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user]);

  useEffect(() => {
    if (!user) return;
    setRealtimeStatus('connecting');

    const channel = supabase
      .channel(`trades-realtime-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trades', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const t = normalize(payload.new);
            setTrades(prev => prev.some(x => x.id === t.id) ? prev : [t, ...prev]);
            toast.success(`New trade opened: ${t.symbol} ${t.trade_type}`);
          } else if (payload.eventType === 'UPDATE') {
            const t = normalize(payload.new);
            setTrades(prev => prev.map(x => x.id === t.id ? t : x));
            if (t.status === 'closed') {
              const profitText = t.profit >= 0 ? `+$${t.profit.toFixed(2)}` : `-$${Math.abs(t.profit).toFixed(2)}`;
              toast.info(`Trade closed: ${t.symbol} ${profitText}`);
            }
          } else if (payload.eventType === 'DELETE') {
            setTrades(prev => prev.filter(t => t.id !== (payload.old as any).id));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setRealtimeStatus('connected');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setRealtimeStatus('reconnecting');
        else if (status === 'CLOSED') setRealtimeStatus('error');
      });

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); channelRef.current = null; };
  }, [user]);

  const openTrades = trades.filter(t => t.status === 'open');
  const closedTrades = trades.filter(t => t.status === 'closed');
  const winningTrades = closedTrades.filter(t => t.profit > 0);
  const losingTrades = closedTrades.filter(t => t.profit < 0);

  const totalPnL = trades.reduce((sum, t) => sum + t.profit, 0);
  const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;
  const avgWin = winningTrades.length > 0 ? winningTrades.reduce((s, t) => s + t.profit, 0) / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? losingTrades.reduce((s, t) => s + t.profit, 0) / losingTrades.length : 0;
  const largestWin = Math.max(0, ...closedTrades.map(t => t.profit));
  const largestLoss = Math.min(0, ...closedTrades.map(t => t.profit));
  const totalWins = winningTrades.reduce((s, t) => s + t.profit, 0);
  const totalLosses = Math.abs(losingTrades.reduce((s, t) => s + t.profit, 0));
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

  return {
    trades,
    openTrades,
    closedTrades,
    isLoading,
    realtimeStatus,
    stats: {
      totalPnL,
      openTradesCount: openTrades.length,
      closedTradesCount: closedTrades.length,
      winRate, avgWin, avgLoss, largestWin, largestLoss, profitFactor,
    },
    refresh: async () => {
      setIsLoading(true);
      await fetchTrades();
      toast.success('Trades refreshed');
    },
  };
};
