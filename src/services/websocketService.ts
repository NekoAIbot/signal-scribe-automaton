import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Multi-asset market symbols by category
const ASSET_SYMBOLS: Record<string, string[]> = {
  forex: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'NZD/USD', 'USD/CHF'],
  crypto: ['BTC/USD', 'ETH/USD', 'XRP/USD', 'SOL/USD'],
  indices: ['SPX', 'NDX', 'DJI'],
  commodities: ['XAU/USD', 'XAG/USD', 'USOIL'],
};

export const ALL_SYMBOLS = Object.values(ASSET_SYMBOLS).flat();
export const ASSET_CATEGORIES = ASSET_SYMBOLS;

interface MarketData {
  [symbol: string]: {
    bid: number;
    ask: number;
    timestamp?: number;
  };
}

export const useWebSocketMarketData = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [marketData, setMarketData] = useState<MarketData>({});
  const [usingMockData, setUsingMockData] = useState(true);
  const pollIntervalRef = useRef<number | null>(null);
  const connectionNotifiedRef = useRef(false);

  const fetchMarketData = useCallback(async () => {
    try {
      const symbols = ALL_SYMBOLS.join(',');
      const { data, error } = await supabase.functions.invoke('fetch-market-quotes', {
        body: { symbols }
      });

      if (error) {
        console.error('Error fetching market data:', error);
        return;
      }

      if (data?.quotes) {
        setMarketData(prev => ({ ...prev, ...data.quotes }));
        setUsingMockData(data.source === 'mock');
        setIsConnected(true);
      }
    } catch (error) {
      console.error('Error fetching market data:', error);
    }
  }, []);

  const connect = useCallback(() => {
    fetchMarketData();
    
    if (pollIntervalRef.current) {
      window.clearInterval(pollIntervalRef.current);
    }
    // Poll every 5 seconds for near real-time updates
    pollIntervalRef.current = window.setInterval(fetchMarketData, 5000);
  }, [fetchMarketData]);

  const disconnect = useCallback(() => {
    if (pollIntervalRef.current) {
      window.clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(connect, 1000);
  }, [connect, disconnect]);

  useEffect(() => {
    if (isConnected && !connectionNotifiedRef.current) {
      console.log(usingMockData ? 'Using mock market data' : 'Connected to live market data');
      connectionNotifiedRef.current = true;
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

  return {
    isConnected,
    marketData,
    connect,
    disconnect,
    reconnect,
    usingMockData
  };
};
