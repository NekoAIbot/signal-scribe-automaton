import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
}

export const useLiveTrades = () => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  // Fetch initial trades
  useEffect(() => {
    const fetchTrades = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('trades')
          .select('*')
          .order('open_time', { ascending: false })
          .limit(100);

        if (error) throw error;

        // Type cast the data properly
        const typedTrades: Trade[] = (data || []).map(trade => ({
          ...trade,
          trade_type: trade.trade_type as 'BUY' | 'SELL',
          status: trade.status as 'open' | 'closed' | 'partially_closed' | 'pending' | 'cancelled'
        }));

        setTrades(typedTrades);
      } catch (error) {
        console.error('Error fetching trades:', error);
        toast.error('Failed to load trades');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrades();
  }, [user]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('trades-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trades',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newTrade = {
              ...payload.new,
              trade_type: payload.new.trade_type as 'BUY' | 'SELL',
              status: payload.new.status as 'open' | 'closed' | 'partially_closed' | 'pending' | 'cancelled'
            } as Trade;
            setTrades(prev => [newTrade, ...prev]);
            toast.success(`New trade opened: ${newTrade.symbol} ${newTrade.trade_type}`);
          } else if (payload.eventType === 'UPDATE') {
            const updatedTrade = {
              ...payload.new,
              trade_type: payload.new.trade_type as 'BUY' | 'SELL',
              status: payload.new.status as 'open' | 'closed' | 'partially_closed' | 'pending' | 'cancelled'
            } as Trade;
            setTrades(prev => 
              prev.map(t => t.id === updatedTrade.id ? updatedTrade : t)
            );
            if (updatedTrade.status === 'closed') {
              const profitText = updatedTrade.profit >= 0 
                ? `+$${updatedTrade.profit.toFixed(2)}` 
                : `-$${Math.abs(updatedTrade.profit).toFixed(2)}`;
              toast.info(`Trade closed: ${updatedTrade.symbol} ${profitText}`);
            }
          } else if (payload.eventType === 'DELETE') {
            setTrades(prev => prev.filter(t => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Calculate statistics
  const openTrades = trades.filter(t => t.status === 'open');
  const closedTrades = trades.filter(t => t.status === 'closed');
  const winningTrades = closedTrades.filter(t => t.profit > 0);
  const losingTrades = closedTrades.filter(t => t.profit < 0);

  const totalPnL = trades.reduce((sum, t) => sum + t.profit, 0);
  const winRate = closedTrades.length > 0 
    ? (winningTrades.length / closedTrades.length) * 100 
    : 0;
  
  const avgWin = winningTrades.length > 0
    ? winningTrades.reduce((sum, t) => sum + t.profit, 0) / winningTrades.length
    : 0;
  
  const avgLoss = losingTrades.length > 0
    ? losingTrades.reduce((sum, t) => sum + t.profit, 0) / losingTrades.length
    : 0;

  const largestWin = Math.max(0, ...closedTrades.map(t => t.profit));
  const largestLoss = Math.min(0, ...closedTrades.map(t => t.profit));

  const totalWins = winningTrades.reduce((sum, t) => sum + t.profit, 0);
  const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.profit, 0));
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

  return {
    trades,
    openTrades,
    closedTrades,
    isLoading,
    stats: {
      totalPnL,
      openTradesCount: openTrades.length,
      closedTradesCount: closedTrades.length,
      winRate,
      avgWin,
      avgLoss,
      largestWin,
      largestLoss,
      profitFactor
    },
    refresh: async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('trades')
          .select('*')
          .order('open_time', { ascending: false })
          .limit(100);

        if (error) throw error;

        const typedTrades: Trade[] = (data || []).map(trade => ({
          ...trade,
          trade_type: trade.trade_type as 'BUY' | 'SELL',
          status: trade.status as 'open' | 'closed' | 'partially_closed' | 'pending' | 'cancelled'
        }));

        setTrades(typedTrades);
        toast.success('Trades refreshed');
      } catch (error) {
        console.error('Error refreshing trades:', error);
        toast.error('Failed to refresh trades');
      } finally {
        setIsLoading(false);
      }
    }
  };
};
