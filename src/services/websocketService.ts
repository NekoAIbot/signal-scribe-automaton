
import { useState, useEffect } from 'react';
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
  
  useEffect(() => {
    // This is a simulation of WebSocket connection since we don't have a real WebSocket endpoint
    // In a real app, you would connect to your WebSocket server here
    
    console.log('Connecting to WebSocket for market data...');
    const simulatedConnect = setTimeout(() => {
      setIsConnected(true);
      toast.success('WebSocket connected');
      console.log('WebSocket connected');
    }, 1000);
    
    // Simulate incoming messages
    const interval = setInterval(() => {
      if (!isConnected) return;
      
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
    
    // Cleanup function
    return () => {
      clearTimeout(simulatedConnect);
      clearInterval(interval);
      
      if (isConnected) {
        console.log('Disconnecting WebSocket...');
        toast.info('WebSocket disconnected');
      }
    };
  }, [isConnected, symbols]);
  
  // Provide methods to work with WebSocket
  const reconnect = () => {
    if (isConnected) {
      setIsConnected(false);
    }
    
    setTimeout(() => {
      setIsConnected(true);
      toast.success('WebSocket reconnected');
    }, 1000);
  };
  
  return {
    isConnected,
    lastMessage,
    error,
    reconnect
  };
};
