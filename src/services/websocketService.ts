
import { useState, useEffect, useRef, useCallback } from 'react';
import { API_KEYS, CONFIG_FLAGS } from '@/config/apiConfig';

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
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const connectAttemptRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const [shouldConnect, setShouldConnect] = useState(true);
  const [usingMockData, setUsingMockData] = useState(CONFIG_FLAGS.USE_MOCK_MT5);
  const prevConnectedRef = useRef(isConnected);
  const connectionNotifiedRef = useRef(false);
  const messageRateRef = useRef(0);
  const lastNotificationTime = useRef(Date.now());
  
  const connect = useCallback(() => {
    if (!shouldConnect || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }
    
    // For demo, prefer mock data to avoid hitting API limits
    if (CONFIG_FLAGS.USE_MOCK_MT5) {
      setUsingMockData(true);
      setIsConnected(true);
      return;
    }
    
    try {
      // Replace with your actual WebSocket endpoint
      const wsEndpoint = `wss://ws.twelvedata.com/v1/quotes/price?apikey=${API_KEYS.TWELVEDATA_API_KEY}`;
      
      if (connectAttemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
        console.log('Maximum reconnection attempts reached, using mock data');
        setUsingMockData(true);
        setIsConnected(true);
        return;
      }
      
      // Only log connection attempts with appropriate spacing
      if (Date.now() - lastNotificationTime.current > 60000) {
        console.log('Connecting to WebSocket for market data...');
        lastNotificationTime.current = Date.now();
      }
      
      wsRef.current = new WebSocket(wsEndpoint);
      
      wsRef.current.onopen = () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          connectAttemptRef.current = 0;
          setIsConnected(true);
          setUsingMockData(false);
          
          // Subscribe to forex symbols
          const symbols = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD'];
          wsRef.current.send(JSON.stringify({
            action: 'subscribe',
            params: {
              symbols: symbols.join(',')
            }
          }));
        }
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.symbol) {
            // Rate limiting logs 
            messageRateRef.current++;
            if (messageRateRef.current % 100 === 0) {
              console.log(`Received ${messageRateRef.current} market data updates`);
            }
            
            const normalizedSymbol = data.symbol.replace('/', '');
            setMarketData(prev => ({
              ...prev,
              [normalizedSymbol]: {
                bid: parseFloat(data.price) - 0.0002,
                ask: parseFloat(data.price) + 0.0002,
                timestamp: Date.now()
              }
            }));
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };
      
      wsRef.current.onclose = () => {
        if (prevConnectedRef.current !== false) {
          setIsConnected(false);
        }
      };
      
      wsRef.current.onerror = (error) => {
        connectAttemptRef.current++;
        setIsConnected(false);
      };
    } catch (error) {
      setIsConnected(false);
    }
  }, [shouldConnect]);
  
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    // Only update state if connected (prevents redundant renders)
    if (isConnected) {
      setIsConnected(false);
    }
    
    setShouldConnect(false);
  }, [isConnected]);
  
  const reconnect = useCallback(() => {
    setShouldConnect(true);
    
    if (reconnectTimeoutRef.current) {
      window.clearTimeout(reconnectTimeoutRef.current);
    }
    
    reconnectTimeoutRef.current = window.setTimeout(() => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      connect();
    }, 1000);
  }, [connect]);
  
  useEffect(() => {
    // Update previous connection state ref
    if (prevConnectedRef.current !== isConnected) {
      prevConnectedRef.current = isConnected;
      
      // Only log significant connection state changes
      if (isConnected && !connectionNotifiedRef.current) {
        console.log(usingMockData ? 'Using mock market data' : 'WebSocket connected to live data');
        connectionNotifiedRef.current = true;
      } else if (!isConnected && connectionNotifiedRef.current) {
        console.log('WebSocket disconnected');
        connectionNotifiedRef.current = false;
      }
    }
  }, [isConnected, usingMockData]);
  
  useEffect(() => {
    if (shouldConnect) {
      connect();
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect, shouldConnect]);
  
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
