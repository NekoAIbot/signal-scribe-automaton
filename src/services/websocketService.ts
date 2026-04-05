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
  const isMountedRef = useRef(true);

  const fetchMarketData = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      const symbols = ALL_SYMBOLS.join(',');
      const { data, error } = await supabase.functions.invoke('fetch-market-quotes', {
        body: { symbols }
      });

      if (!isMountedRef.current) return;

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
  }, []); // No deps - stable reference

  useEffect(() => {
    isMountedRef.current = true;

    // Initial fetch
    fetchMarketData();

    // Poll every 10 seconds (reduced from 5s to avoid hammering)
    pollIntervalRef.current = window.setInterval(fetchMarketData, 10000);

    if (!connectionNotifiedRef.current) {
      connectionNotifiedRef.current = true;
    }

    return () => {
      isMountedRef.current = false;
      if (pollIntervalRef.current) {
        window.clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [fetchMarketData]);

  const reconnect = useCallback(() => {
    if (pollIntervalRef.current) {
      window.clearInterval(pollIntervalRef.current);
    }
    fetchMarketData();
    pollIntervalRef.current = window.setInterval(fetchMarketData, 10000);
    setIsConnected(true);
  }, [fetchMarketData]);

  const disconnect = useCallback(() => {
    if (pollIntervalRef.current) {
      window.clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setIsConnected(false);
  }, []);

  return {
    isConnected,
    marketData,
    connect: reconnect,
    disconnect,
    reconnect,
    usingMockData
  };
};
