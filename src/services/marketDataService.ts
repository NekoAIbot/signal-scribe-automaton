import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useWebSocketMarketData, ASSET_CATEGORIES } from "./websocketService";
import { updateHistoricalPrices, TradeSignal } from "./signalGenerationService";
import { supabase } from "@/integrations/supabase/client";

export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  volume: number;
  timestamp?: string;
  category?: string;
}

export { ASSET_CATEGORIES };

// Determine category for a symbol
const getCategory = (symbol: string): string => {
  const clean = symbol.replace('/', '');
  for (const [cat, syms] of Object.entries(ASSET_CATEGORIES)) {
    if (syms.some(s => s.replace('/', '') === clean)) return cat;
  }
  return 'forex';
};

// Convert WebSocket data to MarketData format
const convertToMarketData = (wsMarketData: Record<string, { bid: number; ask: number; timestamp?: number }>): MarketData[] => {
  return Object.entries(wsMarketData).map(([key, data]) => {
    // Add slash to forex pair symbol if needed
    let symbol = key;
    if (key.length === 6 && !key.includes('/') && !['USOIL'].includes(key)) {
      symbol = key.slice(0, 3) + '/' + key.slice(3);
    }
    
    const price = (data.bid + data.ask) / 2;
    const change = (Math.random() * 2 - 1) * 0.8;
    const volume = Math.floor(5000 + Math.random() * 15000);
    
    return {
      symbol,
      price,
      change,
      volume,
      timestamp: data.timestamp ? new Date(data.timestamp).toISOString() : undefined,
      category: getCategory(key)
    };
  });
};

export const useMarketData = (category?: string) => {
  const { marketData: wsMarketData, isConnected } = useWebSocketMarketData();
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (isConnected && Object.keys(wsMarketData).length > 0) {
      updateHistoricalPrices(wsMarketData);
      const formattedData = convertToMarketData(wsMarketData);
      queryClient.setQueryData(['marketData'], formattedData);
    }
  }, [wsMarketData, isConnected, queryClient]);
  
  return useQuery({
    queryKey: ['marketData'],
    queryFn: async () => convertToMarketData(wsMarketData),
    refetchInterval: 5000,
    staleTime: 3000,
    select: (data) => category ? data.filter(d => d.category === category) : data
  });
};

// Hook for trading signals
export const useTradingSignals = () => {
  return useQuery({
    queryKey: ['tradingSignals'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('trading_signals')
          .select('id, symbol, signal_type, entry_price, target_price, stop_loss, created_at, confidence, strategy_id, model_id, expires_at, is_active, status')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;

        return (data || [])
          .filter(signal => signal.signal_type !== 'hold')
          .filter(signal => !signal.expires_at || new Date(signal.expires_at).getTime() > Date.now())
          .map((signal): TradeSignal => ({
            id: signal.id,
            symbol: signal.symbol,
            type: signal.signal_type === 'sell' ? 'SELL' : 'BUY',
            price: Number(signal.entry_price || 0),
            time: signal.created_at || new Date().toISOString(),
            status: (signal.status as 'new' | 'executing' | 'executed' | 'failed') || 'new',
            strategy: signal.strategy_id ? 'Selected Strategy' : 'AI Market Scan',
            strategyId: signal.strategy_id,
            modelId: signal.model_id,
            confidence: Number(signal.confidence || 0),
            stopLoss: signal.stop_loss ? Number(signal.stop_loss) : undefined,
            takeProfit1: signal.target_price ? Number(signal.target_price) : undefined,
            lotSize: 0.01,
          }));
      } catch (error) {
        console.error('Error loading trading signals:', error);
        return [];
      }
    },
    refetchInterval: 15000,
    staleTime: 10000
  });
};
