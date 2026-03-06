
import { EnhancedSignal, MonitoredTrade } from "./types";
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';

// Function to get enhanced trading signals from database
export const getEnhancedSignals = async (limit: number = 10): Promise<EnhancedSignal[]> => {
  try {
    const { data: signals, error } = await supabase
      .from('trading_signals')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    if (signals && signals.length > 0) {
      return signals.map(s => ({
        id: s.id,
        symbol: s.symbol,
        type: (s.signal_type === 'buy' ? 'BUY' : 'SELL') as 'BUY' | 'SELL',
        price: s.entry_price || 0,
        time: s.created_at || new Date().toISOString(),
        status: 'new' as any,
        strategy_name: 'AI Multi-Model',
        confidence_score: s.confidence || 0,
        stop_loss: s.stop_loss,
        take_profit_levels: s.target_price ? [s.target_price] : [],
      }));
    }

    return [];
  } catch (error) {
    console.error("Error fetching enhanced signals:", error);
    return [];
  }
};

// Function to get trading signals
export const getTradingSignals = async (limit: number = 10): Promise<EnhancedSignal[]> => {
  return getEnhancedSignals(limit);
};

// Function to create a new trading signal
export const createTradingSignal = async (signal: EnhancedSignal): Promise<EnhancedSignal> => {
  try {
    if (!signal.symbol || !signal.type || !signal.price) {
      throw new Error("Signal missing required properties");
    }
    
    const enhancedSignal: EnhancedSignal = {
      ...signal,
      id: signal.id || `sig-${Date.now()}`,
      time: signal.time || new Date().toISOString(),
      status: signal.status || 'new',
    };
    
    return enhancedSignal;
  } catch (error) {
    console.error("Error creating trading signal:", error);
    toast.error("Failed to create signal");
    throw error;
  }
};

// Execute signal on real broker accounts via edge function
export const executeSignal = async (signal: EnhancedSignal, brokerAccountId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('execute-trade', {
      body: {
        symbol: signal.symbol,
        type: signal.type,
        price: signal.price,
        lotSize: 0.01,
        stopLoss: signal.stop_loss,
        takeProfit: signal.take_profit_levels?.[0],
        brokerAccountId,
        strategyId: signal.strategy_id || null,
      }
    });

    if (error) throw error;
    return data?.success || false;
  } catch (error) {
    console.error("Error executing signal:", error);
    toast.error(`Failed to execute ${signal.symbol} signal`);
    return false;
  }
};

// Execute signal across all active broker accounts
export const executeSignalAcrossAccounts = async (signal: EnhancedSignal): Promise<string[]> => {
  try {
    const { data: accounts, error } = await supabase
      .from('broker_credentials')
      .select('id, account_name, is_active')
      .eq('is_active', true);

    if (error) throw error;
    if (!accounts || accounts.length === 0) {
      toast.warning('No active broker accounts found. Add accounts in Settings.');
      return [];
    }

    const executedAccounts: string[] = [];
    for (const account of accounts) {
      const success = await executeSignal(signal, account.id);
      if (success) {
        executedAccounts.push(account.id);
        toast.success(`Executed on ${account.account_name}`);
      }
    }

    return executedAccounts;
  } catch (error) {
    console.error('Error executing across accounts:', error);
    return [];
  }
};

// Get monitored trades from database
export const getMonitoredTrades = async (): Promise<MonitoredTrade[]> => {
  try {
    const { data: trades, error } = await supabase
      .from('trades')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (trades || []).map(t => ({
      id: t.id,
      signal_id: t.strategy_id || '',
      broker_account_id: t.broker_account_id || '',
      ticket_number: t.ticket_number || '',
      entry_price: t.entry_price,
      current_price: t.current_price || t.entry_price,
      type: t.trade_type as 'BUY' | 'SELL',
      volume: t.lot_size,
      stop_loss: t.stop_loss || 0,
      take_profit: t.take_profit || 0,
      profit: t.profit || 0,
      status: t.status,
      open_time: t.open_time,
      symbol: t.symbol,
      pips: 0,
      user_id: t.user_id,
    }));
  } catch (error) {
    console.error("Error fetching monitored trades:", error);
    return [];
  }
};

export const generateMockMonitoredTrades = getMonitoredTrades;
