
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { API_KEYS, CONFIG_FLAGS } from "@/config/apiConfig";

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

const fetchMarketData = async (): Promise<MarketData[]> => {
  try {
    // Use mock data if enabled in config or for development
    if (CONFIG_FLAGS.USE_MOCK_MT5) {
      console.log("Using mock market data");
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
  return useQuery({
    queryKey: ['marketData'],
    queryFn: fetchMarketData,
    refetchInterval: 5000, // Refetch every 5 seconds
    retry: 1,
    staleTime: 4000,
  });
};
