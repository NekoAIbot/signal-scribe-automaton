
import { useQuery } from "@tanstack/react-query";

interface MarketData {
  symbol: string;
  price: number;
  change: number;
  volume: number;
}

const fetchMarketData = async (): Promise<MarketData[]> => {
  // TODO: Replace with actual API call
  // For now using mock data for quick development
  return [
    { symbol: 'EUR/USD', price: 1.05432, change: 0.42, volume: 12540 },
    { symbol: 'GBP/USD', price: 1.24356, change: -0.28, volume: 9870 },
    { symbol: 'USD/JPY', price: 153.742, change: 0.65, volume: 15260 },
    { symbol: 'AUD/USD', price: 0.65832, change: -0.18, volume: 7320 },
  ];
};

export const useMarketData = () => {
  return useQuery({
    queryKey: ['marketData'],
    queryFn: fetchMarketData,
    refetchInterval: 5000, // Refetch every 5 seconds
  });
};
