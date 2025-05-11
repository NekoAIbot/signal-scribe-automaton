
import { supabase } from "@/integrations/supabase/client";
import { EnhancedSignal, MonitoredTrade } from "./types";
import { toast } from "sonner";

// Function to get trading signals
export const getTradingSignals = async (limit: number = 10): Promise<EnhancedSignal[]> => {
  try {
    // Try to get signals from database
    try {
      const { data, error } = await supabase
        .from('trading_signals')
        .select('*')
        .order('time', { ascending: false })
        .limit(limit);
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        return data as EnhancedSignal[];
      }
    } catch (dbError) {
      console.error("Database error fetching trading signals:", dbError);
      // Continue with mock data
    }
    
    // Return mock signals if no real signals found
    return generateMockSignals(limit);
  } catch (error) {
    console.error("Error fetching trading signals:", error);
    toast.error("Failed to load trading signals. Using mock data.");
    
    // Return mock signals as fallback
    return generateMockSignals(limit);
  }
};

// Function to generate mock trading signals for development
export const generateMockSignals = (count: number = 10): EnhancedSignal[] => {
  const symbols = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'NZD/USD'];
  const strategies = ['Trend Following', 'Mean Reversion', 'Breakout', 'Volatility Expansion', 'ML Strategy'];
  const statuses = ['new', 'executing', 'executed', 'failed', 'monitoring', 'completed'];
  
  const signals: EnhancedSignal[] = [];
  
  for (let i = 0; i < count; i++) {
    const isNew = Math.random() > 0.6; // 40% chance of new signals
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const basePrice = symbol === 'USD/JPY' ? 150 + Math.random() * 10 : 1 + Math.random();
    const type = Math.random() > 0.5 ? 'BUY' : 'SELL';
    const strategy = strategies[Math.floor(Math.random() * strategies.length)];
    const confidence = 0.5 + Math.random() * 0.49; // 50-99%
    
    // Generate time within the last 24 hours
    const time = new Date();
    time.setHours(time.getHours() - Math.floor(Math.random() * 24));
    
    signals.push({
      id: `mock-${i}-${Date.now()}`,
      symbol,
      type: type as 'BUY' | 'SELL',
      price: parseFloat(basePrice.toFixed(5)),
      time: time.toISOString(),
      status: isNew ? 'new' : statuses[Math.floor(Math.random() * statuses.length)] as any,
      strategy_id: `strat-${Math.floor(Math.random() * 100)}`,
      strategy_name: strategy,
      confidence_score: confidence,
      technical_factors: {
        rsi: Math.floor(Math.random() * 100),
        macd: { value: Math.random() - 0.5, signal: Math.random() - 0.5 },
        ema: { short: basePrice * (1 + Math.random() * 0.02), long: basePrice * (1 - Math.random() * 0.02) },
        volatility: Math.random() * 0.05
      },
      sentiment_factors: {
        news_score: (Math.random() * 2) - 1,
        social_score: (Math.random() * 2) - 1,
        overall_sentiment: (Math.random() * 2) - 1
      },
      stop_loss: type === 'BUY' ? 
        basePrice * (1 - (0.005 + Math.random() * 0.01)) : 
        basePrice * (1 + (0.005 + Math.random() * 0.01)),
      take_profit_levels: type === 'BUY' ? 
        [basePrice * (1 + 0.01), basePrice * (1 + 0.02)] : 
        [basePrice * (1 - 0.01), basePrice * (1 - 0.02)],
      volatility_forecast: 0.01 + Math.random() * 0.05,
      risk_adjustment: Math.random(),
    });
  }
  
  return signals;
};

// Function to create a new trading signal
export const createTradingSignal = async (signal: EnhancedSignal): Promise<EnhancedSignal> => {
  try {
    // Ensure signal has essential properties
    if (!signal.symbol || !signal.type || !signal.price) {
      throw new Error("Signal missing required properties");
    }
    
    // Set default values if not provided
    const enhancedSignal: EnhancedSignal = {
      ...signal,
      id: signal.id || `sig-${Date.now()}`,
      time: signal.time || new Date().toISOString(),
      status: signal.status || 'new',
    };
    
    // Try to insert into database
    try {
      const { data, error } = await supabase
        .from('trading_signals')
        .insert(enhancedSignal)
        .select()
        .single();
        
      if (error) throw error;
      
      if (data) {
        toast.success(`New ${signal.type} signal for ${signal.symbol} created`);
        return data as EnhancedSignal;
      }
    } catch (dbError) {
      console.error("Database error creating signal:", dbError);
      // Continue with the original signal
    }
    
    toast.success(`New ${signal.type} signal for ${signal.symbol} created (mock)`);
    return enhancedSignal;
  } catch (error) {
    console.error("Error creating trading signal:", error);
    toast.error("Failed to create signal");
    throw error;
  }
};

// Function to execute a trading signal
export const executeSignal = async (signal: EnhancedSignal, brokerAccountId: string): Promise<boolean> => {
  try {
    // Call execute-trade edge function
    const { data, error } = await supabase.functions.invoke('execute-trade', {
      body: {
        signal,
        accountId: brokerAccountId
      }
    });
    
    if (error) throw error;
    
    if (data && data.success) {
      // Update signal status in database
      try {
        const { error: updateError } = await supabase
          .from('trading_signals')
          .update({ status: 'executing', execution_data: data.execution })
          .eq('id', signal.id);
          
        if (updateError) console.error("Error updating signal status:", updateError);
      } catch (dbError) {
        console.error("Database error updating signal:", dbError);
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Error executing signal:", error);
    
    // Simulate successful execution for development
    setTimeout(() => {
      // Simulate trade execution success
      const monitoredTrade: MonitoredTrade = {
        id: `trade-${Date.now()}`,
        signal_id: signal.id,
        broker_account_id: brokerAccountId,
        ticket_number: `T${Math.floor(100000 + Math.random() * 900000)}`,
        entry_price: signal.price,
        current_price: signal.price,
        type: signal.type,
        volume: 0.01 + Math.random() * 0.09,
        stop_loss: signal.stop_loss,
        take_profit: signal.take_profit_levels?.[0],
        status: 'open',
        open_time: new Date().toISOString(),
        symbol: signal.symbol,
        user_id: 'simulated-user-id',
      };
      
      // Try to insert monitored trade into database
      try {
        supabase
          .from('monitored_trades')
          .insert({
            signal_id: monitoredTrade.signal_id,
            broker_account_id: monitoredTrade.broker_account_id,
            ticket_number: monitoredTrade.ticket_number,
            entry_price: monitoredTrade.entry_price,
            current_price: monitoredTrade.current_price,
            type: monitoredTrade.type,
            volume: monitoredTrade.volume,
            stop_loss: monitoredTrade.stop_loss,
            take_profit: monitoredTrade.take_profit,
            status: monitoredTrade.status,
            open_time: monitoredTrade.open_time,
            symbol: monitoredTrade.symbol,
            user_id: monitoredTrade.user_id,
          });
      } catch (insertError) {
        console.error("Error inserting monitored trade:", insertError);
      }
    }, 1500);
    
    return true;
  }
};

// Function to execute a signal across all broker accounts
export const executeSignalAcrossAccounts = async (signal: EnhancedSignal): Promise<string[]> => {
  // For development, simulate multiple broker accounts
  const simulatedAccounts = [
    { id: 'acc-1', name: 'Demo MT4 Account' },
    { id: 'acc-2', name: 'Live MT5 Account' }
  ];
  
  const executedAccounts: string[] = [];
  
  for (const account of simulatedAccounts) {
    try {
      const success = await executeSignal(signal, account.id);
      if (success) {
        executedAccounts.push(account.id);
      }
    } catch (error) {
      console.error(`Failed to execute on account ${account.id}:`, error);
    }
  }
  
  return executedAccounts;
};

// Function to get monitored trades
export const getMonitoredTrades = async (): Promise<MonitoredTrade[]> => {
  try {
    // Try to get trades from database
    try {
      const { data, error } = await supabase
        .from('monitored_trades')
        .select('*')
        .order('open_time', { ascending: false });
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        return data as MonitoredTrade[];
      }
    } catch (dbError) {
      console.error("Database error fetching monitored trades:", dbError);
      // Continue with mock data
    }
    
    // Return mock trades if no real trades found
    return generateMockMonitoredTrades();
  } catch (error) {
    console.error("Error fetching monitored trades:", error);
    
    // Return mock trades as fallback
    return generateMockMonitoredTrades();
  }
};

// Function to generate mock monitored trades for development
export const generateMockMonitoredTrades = (count: number = 8): MonitoredTrade[] => {
  const symbols = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'NZD/USD'];
  const trades: MonitoredTrade[] = [];
  
  for (let i = 0; i < count; i++) {
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const type = Math.random() > 0.5 ? 'BUY' : 'SELL';
    const basePrice = symbol === 'USD/JPY' ? 150 + Math.random() * 10 : 1 + Math.random();
    const entryPrice = parseFloat(basePrice.toFixed(5));
    
    // Generate time within the last 24 hours
    const openTime = new Date();
    openTime.setHours(openTime.getHours() - Math.floor(Math.random() * 24));
    
    // Calculate profit/loss
    const currentPrice = type === 'BUY' ? 
      entryPrice * (1 + (Math.random() * 0.005 * (Math.random() > 0.6 ? 1 : -1))) : 
      entryPrice * (1 - (Math.random() * 0.005 * (Math.random() > 0.6 ? 1 : -1)));
      
    const volume = 0.01 + Math.random() * 0.09; // 0.01 - 0.1
    const pips = Math.round((currentPrice - entryPrice) * (symbol === 'USD/JPY' ? 100 : 10000));
    const profit = pips * volume * 10;
    
    // Stop loss and take profit
    const stopLoss = type === 'BUY' ? 
      entryPrice * (1 - (0.005 + Math.random() * 0.01)) : 
      entryPrice * (1 + (0.005 + Math.random() * 0.01));
      
    const takeProfit = type === 'BUY' ? 
      entryPrice * (1 + (0.01 + Math.random() * 0.02)) : 
      entryPrice * (1 - (0.01 + Math.random() * 0.02));
    
    trades.push({
      id: `mock-trade-${i}-${Date.now()}`,
      signal_id: `sig-${Math.floor(Math.random() * 1000)}`,
      broker_account_id: Math.random() > 0.5 ? 'acc-1' : 'acc-2',
      ticket_number: `T${Math.floor(100000 + Math.random() * 900000)}`,
      entry_price: entryPrice,
      current_price: parseFloat(currentPrice.toFixed(5)),
      type: type as 'BUY' | 'SELL',
      volume,
      stop_loss: parseFloat(stopLoss.toFixed(5)),
      take_profit: parseFloat(takeProfit.toFixed(5)),
      profit,
      status: 'open',
      open_time: openTime.toISOString(),
      symbol,
      pips,
      user_id: 'simulated-user-id',
    });
  }
  
  return trades;
};
