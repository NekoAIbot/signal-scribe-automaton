import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { toast } from "sonner";
import { useWebSocketMarketData, ALL_SYMBOLS, ASSET_CATEGORIES } from "./websocketService";
import { 
  generateTradingSignals, 
  updateHistoricalPrices, 
  TradeSignal, 
  getHistoricalPrices 
} from "./signalGenerationService";

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
  const { marketData: wsMarketData, isConnected } = useWebSocketMarketData();
  const queryClient = useQueryClient();
  
  const generateSignals = useCallback(() => {
    const historicalPrices = getHistoricalPrices();
    
    if (isConnected && Object.keys(wsMarketData).length > 0 && Object.values(historicalPrices).some(prices => prices.length > 30)) {
      const signals = generateTradingSignals(wsMarketData, historicalPrices);
      
      if (signals.length > 0) {
        const existingSignals = queryClient.getQueryData<TradeSignal[]>(['tradingSignals']) || [];
        const mergedSignals = [...existingSignals];
        
        signals.forEach(signal => {
          const existingIndex = mergedSignals.findIndex(
            s => s.symbol === signal.symbol && 
                 s.strategy === signal.strategy && 
                 s.status === 'new' && 
                 new Date(s.time).getTime() > Date.now() - 3600000
          );
          
          if (existingIndex === -1) {
            mergedSignals.push(signal);
          }
        });
        
        const trimmedSignals = mergedSignals.sort((a, b) => 
          new Date(b.time).getTime() - new Date(a.time).getTime()
        ).slice(0, 20);
        
        queryClient.setQueryData(['tradingSignals'], trimmedSignals);
      }
    }
  }, [wsMarketData, isConnected, queryClient]);
  
  useEffect(() => {
    const interval = setInterval(generateSignals, 60000);
    generateSignals();
    return () => clearInterval(interval);
  }, [generateSignals]);
  
  return useQuery({
    queryKey: ['tradingSignals'],
    queryFn: async () => {
      const historicalPrices = getHistoricalPrices();
      return generateTradingSignals(wsMarketData, historicalPrices);
    },
    refetchInterval: 60000,
    staleTime: 30000
  });
};
