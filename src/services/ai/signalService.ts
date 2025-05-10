
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EnhancedSignal, BrokerAccount, MonitoredTrade } from "./types";
import { getMarketSentiment } from "./sentimentService";
import { getActiveStrategies } from "./modelService";
import { broadcastSignal } from '../notificationService';
import { API_KEYS } from '@/config/apiConfig';

// Function to get enhanced signals with AI processing
export const getEnhancedSignals = async () => {
  try {
    const { data, error } = await supabase
      .from('enhanced_signals')
      .select('*')
      .order('time', { ascending: false })
      .limit(10);
      
    if (error) throw error;
    
    if (data) {
      return data as EnhancedSignal[];
    }
    
    return [];
  } catch (error) {
    console.error("Error fetching enhanced signals:", error);
    toast.error("Failed to load AI trading signals");
    
    // Return sample data for development
    return [
      {
        id: '1',
        symbol: 'EURUSD',
        type: 'BUY',
        price: 1.0923,
        time: new Date().toISOString(),
        status: 'new',
        strategy_name: 'Trend Following',
        confidence_score: 0.82,
        technical_factors: {
          rsi: 32,
          macd: { value: 0.0012, signal: 0.0008 },
          ema: { short: 1.0920, long: 1.0910 }
        }
      },
      {
        id: '2',
        symbol: 'GBPUSD',
        type: 'SELL',
        price: 1.2651,
        time: new Date().toISOString(),
        status: 'new',
        strategy_name: 'RSI Reversal',
        confidence_score: 0.75,
        technical_factors: {
          rsi: 72,
          macd: { value: -0.0009, signal: -0.0005 },
          ema: { short: 1.2655, long: 1.2660 }
        }
      }
    ] as EnhancedSignal[];
  }
};

// Generate AI-enhanced signal
export const generateEnhancedSignal = async (symbol: string, price: number, baseType: 'BUY' | 'SELL') => {
  try {
    // Get current market sentiment
    const sentiment = await getMarketSentiment(symbol);
    
    // Get active strategy
    const strategies = await getActiveStrategies();
    const activeStrategy = strategies.length > 0 ? strategies[0] : null;
    
    // Calculate confidence score based on technical and sentiment factors
    // This is a simplified version - in production, this would use ML model predictions
    const technicalScore = Math.random() * 0.6 + 0.4; // 0.4 to 1.0
    const sentimentScore = sentiment ? 
      (sentiment.sentiment_score + 1) / 2 : // Convert -1 to 1 range to 0 to 1
      0.5; // Neutral if no sentiment data
    
    const confidenceScore = (technicalScore * 0.7) + (sentimentScore * 0.3);
    
    // Calculate dynamic stop loss and take profit based on volatility
    const volatility = Math.random() * 0.05 + 0.01; // 1% to 6% volatility example
    const stopLossPercent = baseType === 'BUY' ? volatility * 1.5 : -volatility * 1.5;
    const stopLoss = baseType === 'BUY' ? 
      price * (1 - stopLossPercent) : 
      price * (1 + stopLossPercent);
    
    // Multiple take profit levels
    const takeProfitLevels = baseType === 'BUY' ?
      [price * 1.02, price * 1.05, price * 1.08] :
      [price * 0.98, price * 0.95, price * 0.92];
    
    // Create technical and sentiment factors objects
    const technicalFactors = {
      rsi: Math.random() * 100,
      macd: { value: Math.random() * 0.01 - 0.005, signal: Math.random() * 0.01 - 0.005 },
      ema: { short: price * (1 + (Math.random() * 0.02 - 0.01)), long: price * (1 + (Math.random() * 0.02 - 0.01)) },
      volatility: volatility
    };
    
    const sentimentFactors = sentiment ? {
      news_score: sentiment.news_sentiment,
      social_score: sentiment.social_sentiment,
      overall_sentiment: sentiment.sentiment_score
    } : { overall_sentiment: 0 };
    
    // Create the enhanced signal
    const newSignal = {
      symbol,
      type: baseType,
      price,
      time: new Date().toISOString(),
      status: 'new' as const,
      strategy_id: activeStrategy?.id,
      strategy_name: activeStrategy?.name,
      confidence_score: confidenceScore,
      technical_factors: technicalFactors,
      sentiment_factors: sentimentFactors,
      stop_loss: stopLoss,
      take_profit_levels: takeProfitLevels,
      volatility_forecast: volatility,
      risk_adjustment: confidenceScore * 0.8 // Risk scales with confidence
    };
    
    // Insert the signal into the database
    const { data, error } = await supabase
      .from('enhanced_signals')
      .insert(newSignal)
      .select();
      
    if (error) throw error;
    
    // For development, send the signal to Telegram
    if (data && data.length > 0) {
      const signalData = data[0] as EnhancedSignal;
      await broadcastSignal({
        symbol: signalData.symbol,
        type: signalData.type,
        price: signalData.price,
        strategy: signalData.strategy_name || 'AI Strategy'
      });
    }
    
    return data?.[0] as EnhancedSignal;
  } catch (error) {
    console.error("Error generating enhanced signal:", error);
    toast.error("Failed to generate AI trading signal");
    throw error;
  }
};

// Get all user broker accounts
export const getUserBrokerAccounts = async (userId?: string) => {
  try {
    let query = supabase.from('broker_accounts').select('*');
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data as BrokerAccount[];
  } catch (error) {
    console.error("Error fetching broker accounts:", error);
    toast.error("Failed to load broker accounts");
    return [];
  }
};

// Execute signal across all broker accounts
export const executeSignalAcrossAccounts = async (signal: EnhancedSignal) => {
  try {
    // Get all active broker accounts
    const brokerAccounts = await getUserBrokerAccounts();
    
    if (brokerAccounts.length === 0) {
      toast.warning("No broker accounts configured");
      return [];
    }
    
    const results = [];
    
    // Execute on each account
    for (const account of brokerAccounts.filter(acc => acc.is_active)) {
      try {
        // Prepare execution parameters
        const executionParams = {
          symbol: signal.symbol,
          type: signal.type,
          price: signal.price,
          stopLoss: signal.stop_loss,
          takeProfits: signal.take_profit_levels,
          lotSize: 0.01, // Default lot size
          broker: {
            platform: account.platform,
            server: account.server,
            login: account.login,
            password: account.password || '',
            accountType: account.account_type
          }
        };
        
        // Call edge function to execute the trade
        const { data, error } = await supabase.functions.invoke('execute-trade', {
          body: JSON.stringify(executionParams)
        });
        
        if (error) throw error;
        
        // Create monitoring record
        if (data && data.success) {
          const monitoredTrade = {
            signal_id: signal.id,
            broker_account_id: account.id,
            ticket_number: data.ticketNumber,
            entry_price: signal.price,
            current_price: signal.price,
            type: signal.type,
            volume: data.volume || 0.01,
            stop_loss: signal.stop_loss,
            take_profit: signal.take_profit_levels?.[0],
            status: 'open',
            open_time: new Date().toISOString(),
            symbol: signal.symbol,
            user_id: account.user_id
          };
          
          const { data: tradeData, error: tradeError } = await supabase
            .from('monitored_trades')
            .insert(monitoredTrade)
            .select();
            
          if (tradeError) {
            console.error("Error creating monitored trade:", tradeError);
          } else {
            results.push(tradeData[0]);
          }
          
          // Update signal status
          await supabase
            .from('enhanced_signals')
            .update({ status: 'monitoring' })
            .eq('id', signal.id);
            
          // Send to Telegram
          await broadcastSignal({
            symbol: signal.symbol,
            type: signal.type,
            price: signal.price,
            strategy: signal.strategy_name || 'AI Strategy'
          });
        }
      } catch (accountError) {
        console.error(`Error executing on account ${account.login}:`, accountError);
      }
    }
    
    return results;
  } catch (error) {
    console.error("Error executing signal across accounts:", error);
    toast.error("Failed to execute signal across accounts");
    return [];
  }
};

// Get monitored trades
export const getMonitoredTrades = async (userId?: string, status?: 'open' | 'closed' | 'partially_closed') => {
  try {
    let query = supabase.from('monitored_trades').select('*');
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    // Order by open time descending
    query = query.order('open_time', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data as MonitoredTrade[];
  } catch (error) {
    console.error("Error fetching monitored trades:", error);
    toast.error("Failed to load monitored trades");
    
    // Return sample data for development
    return [
      {
        id: '1',
        signal_id: '1',
        broker_account_id: '1',
        ticket_number: '12345678',
        entry_price: 1.0923,
        current_price: 1.0935,
        type: 'BUY',
        volume: 0.01,
        stop_loss: 1.0900,
        take_profit: 1.0950,
        profit: 1.20,
        status: 'open',
        open_time: new Date(Date.now() - 3600000).toISOString(),
        symbol: 'EURUSD',
        pips: 12,
        user_id: '1'
      },
      {
        id: '2',
        signal_id: '2',
        broker_account_id: '1',
        ticket_number: '12345679',
        entry_price: 1.2651,
        current_price: 1.2630,
        type: 'SELL',
        volume: 0.01,
        stop_loss: 1.2680,
        take_profit: 1.2620,
        profit: 2.10,
        status: 'open',
        open_time: new Date(Date.now() - 7200000).toISOString(),
        symbol: 'GBPUSD',
        pips: 21,
        user_id: '1'
      }
    ];
  }
};
