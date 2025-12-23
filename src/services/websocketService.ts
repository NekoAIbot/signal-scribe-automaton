import { useState, useEffect, useRef, useCallback } from 'react';
import { CONFIG_FLAGS } from '@/config/apiConfig';
import { supabase } from '@/integrations/supabase/client';

// Mock market data for development
const MOCK_DATA = {
  EURUSD: { bid: 1.0923, ask: 1.0925 },
  GBPUSD: { bid: 1.2651, ask: 1.2654 },
  USDJPY: { bid: 110.87, ask: 110.89 },
  AUDUSD: { bid: 0.7312, ask: 0.7315 },
  USDCAD: { bid: 1.2567, ask: 1.2570 },
};

interface MarketData {
  [symbol: string]: {
    bid: number;
    ask: number;
    timestamp?: number;
  };
}

export const useWebSocketMarketData = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [marketData, setMarketData] = useState<MarketData>(MOCK_DATA);
  const [usingMockData, setUsingMockData] = useState(true);
  const pollIntervalRef = useRef<number | null>(null);
  const prevConnectedRef = useRef(isConnected);
  const connectionNotifiedRef = useRef(false);
  
  // Fetch market data from edge function
  const fetchMarketData = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-market-quotes', {
        body: { symbols: 'EUR/USD,GBP/USD,USD/JPY,AUD/USD,USD/CAD' }
      });
      
      if (error) {
        console.error('Error fetching market data:', error);
        return;
      }
      
      if (data?.quotes) {
        setMarketData(data.quotes);
        setUsingMockData(data.source === 'mock');
        setIsConnected(true);
      }
    } catch (error) {
      console.error('Error fetching market data:', error);
    }
  }, []);
  
  const connect = useCallback(() => {
    // For demo mode, use simulated data updates
    if (CONFIG_FLAGS.USE_MOCK_MT5) {
      setUsingMockData(true);
      setIsConnected(true);
      return;
    }
    
    // Start polling the edge function for market data
    fetchMarketData();
    
    // Poll every 5 seconds
    if (pollIntervalRef.current) {
      window.clearInterval(pollIntervalRef.current);
    }
    pollIntervalRef.current = window.setInterval(fetchMarketData, 5000);
  }, [fetchMarketData]);
  
  const disconnect = useCallback(() => {
    if (pollIntervalRef.current) {
      window.clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    
    if (isConnected) {
      setIsConnected(false);
    }
  }, [isConnected]);
  
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(connect, 1000);
  }, [connect, disconnect]);
  
  useEffect(() => {
    // Update previous connection state ref
    if (prevConnectedRef.current !== isConnected) {
      prevConnectedRef.current = isConnected;
      
      // Only log significant connection state changes
      if (isConnected && !connectionNotifiedRef.current) {
        console.log(usingMockData ? 'Using mock market data' : 'Connected to live market data');
        connectionNotifiedRef.current = true;
      } else if (!isConnected && connectionNotifiedRef.current) {
        console.log('Disconnected from market data');
        connectionNotifiedRef.current = false;
      }
    }
  }, [isConnected, usingMockData]);
  
  useEffect(() => {
    connect();
    
    return () => {
      if (pollIntervalRef.current) {
        window.clearInterval(pollIntervalRef.current);
      }
    };
  }, [connect]);
  
  // Simulate market data updates for mock mode
  useEffect(() => {
    if (usingMockData) {
      const interval = setInterval(() => {
        setMarketData(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(symbol => {
            const change = (Math.random() - 0.5) * 0.001;
            const midPrice = (updated[symbol].bid + updated[symbol].ask) / 2;
            const newMid = midPrice + change;
            updated[symbol] = {
              bid: newMid - 0.0002,
              ask: newMid + 0.0002,
              timestamp: Date.now()
            };
          });
          return updated;
        });
      }, 3000);
      
      return () => clearInterval(interval);
    }
  }, [usingMockData]);
  
  return {
    isConnected,
    marketData,
    connect,
    disconnect,
    reconnect,
    usingMockData
  };
};
