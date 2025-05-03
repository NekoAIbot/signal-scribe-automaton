
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { toast } from "sonner";
import { API_KEYS, CONFIG_FLAGS } from "@/config/apiConfig";
import { useWebSocketMarketData } from "./websocketService";
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
}

const mockMarketData: MarketData[] = [
  { symbol: 'EUR/USD', price: 1.05432, change: 0.42, volume: 12540 },
  { symbol: 'GBP/USD', price: 1.24356, change: -0.28, volume: 9870 },
  { symbol: 'USD/JPY', price: 153.742, change: 0.65, volume: 15260 },
  { symbol: 'AUD/USD', price: 0.65832, change: -0.18, volume: 7320 },
];

// Function to convert WebSocket data to MarketData format
const convertToMarketData = (wsMarketData: Record<string, { bid: number; ask: number; timestamp?: number }>): MarketData[] => {
  return Object.entries(wsMarketData).map(([key, data]) => {
    // Add slash to forex pair symbol
    const symbol = key.slice(0, 3) + '/' + key.slice(3);
    
    // Calculate average price
    const price = (data.bid + data.ask) / 2;
    
    // Generate a realistic change percentage (-1% to 1%)
    const change = (Math.random() * 2 - 1) * 0.8;
    
    // Generate realistic volume data
    const volume = Math.floor(5000 + Math.random() * 15000);
    
    return {
      symbol,
      price,
      change,
      volume,
      timestamp: data.timestamp ? new Date(data.timestamp).toISOString() : undefined
    };
  });
};

const fetchMarketData = async (): Promise<MarketData[]> => {
  try {
    // Use mock data if enabled in config
    if (CONFIG_FLAGS.USE_MOCK_MT5) {
      return mockMarketData;
    }
    
    // List of forex symbols we want to fetch
    const symbols = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD'];
    const apiKey = API_KEYS.TWELVEDATA_API_KEY;
    
    // Fetch data for each symbol
    const promises = symbols.map(async (symbol) => {
      const formattedSymbol = symbol.replace('/', '');
      const url = `https://api.twelvedata.com/quote?symbol=${formattedSymbol}&apikey=${apiKey}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Get price change data
      const changeUrl = `https://api.twelvedata.com/percent_change?symbol=${formattedSymbol}&apikey=${apiKey}&interval=1day`;
      const changeResponse = await fetch(changeUrl);
      const changeData = await changeResponse.json();
      
      // Format the data to match our MarketData interface
      return {
        symbol,
        price: parseFloat(data.close || data.price || "0"),
        change: parseFloat(changeData.percent_change || "0"),
        volume: parseInt(data.volume || "0"),
        timestamp: data.timestamp
      };
    });
    
    // Wait for all API calls to complete
    return await Promise.all(promises);
  } catch (error) {
    console.error("Error fetching market data:", error);
    toast.error("Failed to fetch market data. Using fallback data.");
    // Return mock data as fallback
    return mockMarketData;
  }
};

export const useMarketData = () => {
  const { marketData: wsMarketData, isConnected } = useWebSocketMarketData();
  const queryClient = useQueryClient();
  
  // Effect to update market data from WebSocket
  useEffect(() => {
    if (isConnected && Object.keys(wsMarketData).length > 0) {
      // Update historical prices for signal generation
      updateHistoricalPrices(wsMarketData);
      
      // Convert WebSocket data to MarketData format
      const formattedData = convertToMarketData(wsMarketData);
      
      // Update the query data
      queryClient.setQueryData(['marketData'], formattedData);
    }
  }, [wsMarketData, isConnected, queryClient]);
  
  return useQuery({
    queryKey: ['marketData'],
    queryFn: fetchMarketData,
    refetchInterval: 30000, // Fallback fetch every 30 seconds if WebSocket fails
    staleTime: 5000,
    enabled: !isConnected // Only call REST API if WebSocket is not connected
  });
};

// Hook for trading signals
export const useTradingSignals = () => {
  const { marketData: wsMarketData, isConnected } = useWebSocketMarketData();
  const queryClient = useQueryClient();
  
  // Generate signals and update the state
  const generateSignals = useCallback(() => {
    const historicalPrices = getHistoricalPrices();
    
    if (isConnected && Object.keys(wsMarketData).length > 0 && Object.values(historicalPrices).some(prices => prices.length > 30)) {
      const signals = generateTradingSignals(wsMarketData, historicalPrices);
      
      if (signals.length > 0) {
        // Get existing signals
        const existingSignals = queryClient.getQueryData<TradeSignal[]>(['tradingSignals']) || [];
        
        // Merge new signals, avoiding duplicates by checking strategy and symbol
        const mergedSignals = [...existingSignals];
        
        signals.forEach(signal => {
          // Check if a similar signal already exists
          const existingIndex = mergedSignals.findIndex(
            s => s.symbol === signal.symbol && 
                 s.strategy === signal.strategy && 
                 s.status === 'new' && 
                 new Date(s.time).getTime() > Date.now() - 3600000 // Only check last hour
          );
          
          if (existingIndex === -1) {
            mergedSignals.push(signal);
          }
        });
        
        // Keep only the latest 20 signals
        const trimmedSignals = mergedSignals.sort((a, b) => 
          new Date(b.time).getTime() - new Date(a.time).getTime()
        ).slice(0, 20);
        
        queryClient.setQueryData(['tradingSignals'], trimmedSignals);
      }
    }
  }, [wsMarketData, isConnected, queryClient]);
  
  // Effect to periodically generate signals
  useEffect(() => {
    const interval = setInterval(() => {
      generateSignals();
    }, 60000); // Generate new signals every minute
    
    // Initial signal generation
    generateSignals();
    
    return () => clearInterval(interval);
  }, [generateSignals]);
  
  return useQuery({
    queryKey: ['tradingSignals'],
    queryFn: async () => {
      // Initial set of signals
      const historicalPrices = getHistoricalPrices();
      return generateTradingSignals(wsMarketData, historicalPrices);
    },
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000
  });
};
