import { MarketData } from './marketDataService';
import { CONFIG_FLAGS } from '@/config/apiConfig';
import { toast } from 'sonner';
import { MT5AccountDetails } from './types/broker';

export interface TradeSignal {
  id: number;
  symbol: string;
  type: 'BUY' | 'SELL';
  price: number;
  time: string;
  status: 'new' | 'executing' | 'executed' | 'failed';
  strategy: string;
  stopLoss?: number;
  takeProfit1?: number;
  takeProfit2?: number;
  takeProfit3?: number;
  takeProfit4?: number;
  risk?: number;
  lotSize?: number;
}

// Technical indicators calculation
const calculateRSI = (prices: number[], period = 14): number => {
  if (prices.length < period + 1) {
    return 50; // Default neutral value
  }

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = prices[prices.length - i] - prices[prices.length - i - 1];
    if (diff >= 0) {
      gains += diff;
    } else {
      losses -= diff;
    }
  }

  if (losses === 0) {
    return 100;
  }

  const relativeStrength = gains / losses;
  return 100 - (100 / (1 + relativeStrength));
};

const calculateSMA = (prices: number[], period: number): number => {
  if (prices.length < period) {
    return prices[prices.length - 1]; // Return last price if not enough data
  }

  const relevantPrices = prices.slice(prices.length - period);
  const sum = relevantPrices.reduce((total, price) => total + price, 0);
  return sum / period;
};

const calculateEMA = (prices: number[], period: number): number => {
  if (prices.length < period) {
    return prices[prices.length - 1]; // Return last price if not enough data
  }

  const k = 2 / (period + 1);
  const yesterday = prices.slice(0, prices.length - 1);
  const yesterdayEMA = calculateSMA(yesterday, period); // Use SMA as initial EMA
  return prices[prices.length - 1] * k + yesterdayEMA * (1 - k);
};

// Function to generate signals based on market data
export const generateTradingSignals = (
  marketData: Record<string, { bid: number; ask: number; timestamp?: number }>,
  historicalData: Record<string, number[]>
): TradeSignal[] => {
  const signals: TradeSignal[] = [];
  const now = new Date();
  const timestamp = now.toISOString();
  let idCounter = 1;

  // Process each currency pair
  Object.entries(marketData).forEach(([symbol, data]) => {
    if (!historicalData[symbol] || historicalData[symbol].length < 30) {
      return; // Skip if not enough historical data
    }

    const prices = historicalData[symbol];
    const currentPrice = (data.bid + data.ask) / 2;
    
    // Calculate technical indicators
    const rsi = calculateRSI(prices);
    const sma20 = calculateSMA(prices, 20);
    const sma50 = calculateSMA(prices, 50);
    const ema12 = calculateEMA(prices, 12);
    const ema26 = calculateEMA(prices, 26);

    // Signal generation strategies
    // 1. RSI Extreme strategy
    if (rsi < 30) {
      // Oversold - Potential BUY signal
      const stopLoss = currentPrice * 0.998; // 0.2% below current price
      signals.push({
        id: idCounter++,
        symbol,
        type: 'BUY',
        price: currentPrice,
        time: timestamp,
        status: 'new',
        strategy: 'RSI Oversold',
        stopLoss,
        takeProfit1: currentPrice * 1.003, // 0.3% profit target
        takeProfit2: currentPrice * 1.005, // 0.5% profit target
        takeProfit3: currentPrice * 1.008, // 0.8% profit target
        takeProfit4: currentPrice * 1.01, // 1% profit target
        risk: 1, // 1% account risk
        lotSize: 0.1
      });
    } else if (rsi > 70) {
      // Overbought - Potential SELL signal
      const stopLoss = currentPrice * 1.002; // 0.2% above current price
      signals.push({
        id: idCounter++,
        symbol,
        type: 'SELL',
        price: currentPrice,
        time: timestamp,
        status: 'new',
        strategy: 'RSI Overbought',
        stopLoss,
        takeProfit1: currentPrice * 0.997, // 0.3% profit target
        takeProfit2: currentPrice * 0.995, // 0.5% profit target
        takeProfit3: currentPrice * 0.992, // 0.8% profit target
        takeProfit4: currentPrice * 0.99, // 1% profit target
        risk: 1, // 1% account risk
        lotSize: 0.1
      });
    }

    // 2. Moving Average Crossover strategy
    if (ema12 > ema26 && prices[prices.length - 2] < prices[prices.length - 1]) {
      // Golden Cross - Potential BUY signal
      const stopLoss = currentPrice * 0.997; // 0.3% below current price
      signals.push({
        id: idCounter++,
        symbol,
        type: 'BUY',
        price: currentPrice,
        time: timestamp,
        status: 'new',
        strategy: 'EMA Crossover',
        stopLoss,
        takeProfit1: currentPrice * 1.004, // 0.4% profit target
        takeProfit2: currentPrice * 1.007, // 0.7% profit target
        takeProfit3: currentPrice * 1.01, // 1% profit target
        takeProfit4: currentPrice * 1.015, // 1.5% profit target
        risk: 1, // 1% account risk
        lotSize: 0.1
      });
    } else if (ema12 < ema26 && prices[prices.length - 2] > prices[prices.length - 1]) {
      // Death Cross - Potential SELL signal
      const stopLoss = currentPrice * 1.003; // 0.3% above current price
      signals.push({
        id: idCounter++,
        symbol,
        type: 'SELL',
        price: currentPrice,
        time: timestamp,
        status: 'new',
        strategy: 'EMA Crossover',
        stopLoss,
        takeProfit1: currentPrice * 0.996, // 0.4% profit target
        takeProfit2: currentPrice * 0.993, // 0.7% profit target
        takeProfit3: currentPrice * 0.99, // 1% profit target
        takeProfit4: currentPrice * 0.985, // 1.5% profit target
        risk: 1, // 1% account risk
        lotSize: 0.1
      });
    }

    // 3. SMA Break strategy
    if (currentPrice > sma50 && prices[prices.length - 5] < sma50) {
      // Price breaks above SMA50 - Potential BUY signal
      const stopLoss = Math.min(sma50, currentPrice * 0.997); // SMA as support or 0.3% below
      signals.push({
        id: idCounter++,
        symbol,
        type: 'BUY',
        price: currentPrice,
        time: timestamp,
        status: 'new',
        strategy: 'SMA50 Break',
        stopLoss,
        takeProfit1: currentPrice * 1.003, // 0.3% profit target
        takeProfit2: currentPrice * 1.006, // 0.6% profit target
        takeProfit3: currentPrice * 1.009, // 0.9% profit target
        takeProfit4: currentPrice * 1.012, // 1.2% profit target
        risk: 1, // 1% account risk
        lotSize: 0.1
      });
    } else if (currentPrice < sma50 && prices[prices.length - 5] > sma50) {
      // Price breaks below SMA50 - Potential SELL signal
      const stopLoss = Math.max(sma50, currentPrice * 1.003); // SMA as resistance or 0.3% above
      signals.push({
        id: idCounter++,
        symbol,
        type: 'SELL',
        price: currentPrice,
        time: timestamp,
        status: 'new',
        strategy: 'SMA50 Break',
        stopLoss,
        takeProfit1: currentPrice * 0.997, // 0.3% profit target
        takeProfit2: currentPrice * 0.994, // 0.6% profit target
        takeProfit3: currentPrice * 0.991, // 0.9% profit target
        takeProfit4: currentPrice * 0.988, // 1.2% profit target
        risk: 1, // 1% account risk
        lotSize: 0.1
      });
    }
  });

  return signals;
};

// Store historical price data
const historicalPrices: Record<string, number[]> = {
  EURUSD: [],
  GBPUSD: [],
  USDJPY: [],
  AUDUSD: [],
  USDCAD: []
};

// Maximum number of price points to store
const MAX_HISTORY_POINTS = 200;

// Update historical data with new prices
export const updateHistoricalPrices = (marketData: Record<string, { bid: number; ask: number; timestamp?: number }>) => {
  Object.entries(marketData).forEach(([symbol, data]) => {
    const midPrice = (data.bid + data.ask) / 2;
    
    if (!historicalPrices[symbol]) {
      historicalPrices[symbol] = [];
    }
    
    // Add new price point
    historicalPrices[symbol].push(midPrice);
    
    // Keep only the last MAX_HISTORY_POINTS points
    if (historicalPrices[symbol].length > MAX_HISTORY_POINTS) {
      historicalPrices[symbol] = historicalPrices[symbol].slice(-MAX_HISTORY_POINTS);
    }
  });
};

// Get the historical price data
export const getHistoricalPrices = () => {
  return historicalPrices;
};

// Execute a trade on MT5/MT4/cTrader
export const executeMT5Trade = async (
  signal: TradeSignal, 
  accountDetails: MT5AccountDetails
): Promise<boolean> => {
  // If we're using mock mode, simulate execution
  if (CONFIG_FLAGS.USE_MOCK_MT5) {
    // Simulate trade execution with 80% success rate for mock mode
    await new Promise(resolve => setTimeout(resolve, 1500));
    const isSuccessful = Math.random() > 0.2;
    
    if (isSuccessful) {
      toast.success(`Successfully placed ${signal.type} order on ${signal.symbol} [Mock]`);
    } else {
      toast.error(`Failed to place ${signal.type} order on ${signal.symbol} [Mock]`);
    }
    
    return isSuccessful;
  }
  
  try {
    // Prepare the trading parameters
    const platform = accountDetails.platform || 'MT5';
    const accountType = accountDetails.accountType || 'demo';
    const lotSize = accountDetails.lotSize || signal.lotSize || 0.01;
    
    // Display information about the trade
    console.log(`Executing ${signal.type} trade on ${platform} for ${signal.symbol}`, { 
      account: accountDetails.login,
      server: accountDetails.server,
      accountType,
      signal,
      lotSize
    });
    
    // Display risk warning
    toast.warning(`Risk Warning: Trading involves risk of loss. Only trade with capital you can afford to lose.`, {
      duration: 5000
    });
    
    // In a real implementation, we would connect to the broker's API
    // This would typically involve:
    // 1. Authenticating with the broker's API
    // 2. Sending the order details to the broker
    // 3. Handling the response from the broker
    
    // For demonstration, we're simulating a successful trade execution
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate successful execution
    toast.success(`${platform} Trade executed: ${signal.type} ${signal.symbol} @ ${signal.price.toFixed(5)}`);
    return true;
  } catch (error) {
    console.error(`Error executing ${accountDetails.platform || 'MT5'} trade:`, error);
    toast.error(`Failed to execute trade: ${(error as Error).message}`);
    return false;
  }
};
