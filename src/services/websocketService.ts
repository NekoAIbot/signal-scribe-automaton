
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { API_KEYS } from '@/config/apiConfig';

interface WebSocketMessage {
  type: string;
  data: any;
}

export const useWebSocketMarketData = (symbols: string[] = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD']) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // This is a simulation of WebSocket connection since we don't have a real WebSocket endpoint
    console.log('Connecting to WebSocket for market data...');
    
    if (!isConnected && reconnectAttempts.current < maxReconnectAttempts) {
      const simulatedConnect = setTimeout(() => {
        setIsConnected(true);
        reconnectAttempts.current = 0;
      }, 1000);
      
      return () => clearTimeout(simulatedConnect);
    }
    
    // Only set up the message interval if connected
    if (isConnected) {
      // Simulate incoming messages
      intervalRef.current = setInterval(() => {
        const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
        const currentPrice = randomSymbol === 'EUR/USD' ? 1.05432 : 
                            randomSymbol === 'GBP/USD' ? 1.24356 : 
                            randomSymbol === 'USD/JPY' ? 153.742 : 0.65832;
        
        const randomChange = (Math.random() * 0.002) - 0.001;
        const newPrice = currentPrice + randomChange;
        
        const message: WebSocketMessage = {
          type: 'price_update',
          data: {
            symbol: randomSymbol,
            price: newPrice,
            change: randomChange > 0 ? 0.01 : -0.01,
            volume: Math.floor(Math.random() * 1000) + 500,
            timestamp: new Date().toISOString()
          }
        };
        
        setLastMessage(message);
      }, 3000);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [isConnected, symbols]);
  
  // Provide methods to work with WebSocket
  const reconnect = () => {
    if (isConnected) {
      setIsConnected(false);
    }
    
    reconnectAttempts.current += 1;
    if (reconnectAttempts.current <= maxReconnectAttempts) {
      setTimeout(() => {
        setIsConnected(true);
        reconnectAttempts.current = 0;
        toast.success('WebSocket reconnected');
      }, 1000);
    } else {
      toast.error('Failed to reconnect after multiple attempts');
    }
  };
  
  return {
    isConnected,
    lastMessage,
    error,
    reconnect
  };
};
