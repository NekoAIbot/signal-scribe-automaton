// Types for AI and ML features
export interface MLModel {
  id: string;
  name: string;
  type: 'DQN' | 'PPO' | 'LSTM' | 'Transformer' | 'GRU' | 'RandomForest' | 'XGBoost';
  version: string;
  params?: any;
  is_active: boolean;
  created_at?: string;
  accuracy?: number;
  indicators?: string[];
}

export interface AIInsight {
  marketPrediction: 'Bullish' | 'Bearish' | 'Neutral';
  riskAssessment: 'Low' | 'Medium' | 'High';
  confidenceLevel: number;
  created_at: string;
  topOpportunities?: Array<{
    symbol: string;
    direction: string;
    score: number;
  }>;
}

export interface TradingStrategy {
  id: string;
  name: string;
  description?: string;
  model_id?: string;
  parameters?: any;
  risk_profile: 'Low' | 'Medium' | 'High';
  is_active: boolean;
  indicators: string[];
  timeframes?: string[];
}

export interface MarketSentiment {
  symbol: string;
  sentiment_score: number;
  news_sentiment?: number;
  social_sentiment?: number;
  source: string;
  collected_at?: string;
}

export interface EnhancedSignal {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  price: number;
  time?: string;
  status: 'new' | 'executing' | 'executed' | 'failed' | 'monitoring' | 'completed';
  strategy_id?: string;
  strategy_name?: string;
  confidence_score?: number;
  technical_factors?: {
    rsi?: number;
    macd?: { value: number; signal: number };
    ema?: { short: number; long: number };
    volatility?: number;
    [key: string]: any;
  };
  sentiment_factors?: {
    news_score?: number;
    social_score?: number;
    overall_sentiment?: number;
    [key: string]: any;
  };
  stop_loss?: number;
  take_profit_levels?: number[];
  volatility_forecast?: number;
  risk_adjustment?: number;
  execution_data?: any;
  user_id?: string;
  broker_account?: string;
  pnl?: number;
  close_price?: number;
  close_time?: string;
}

export interface TrainingParams {
  modelType: 'LSTM' | 'Transformer' | 'DQN' | 'PPO' | 'GRU' | 'RandomForest' | 'XGBoost';
  epochs: number;
  learningRate: number;
  batchSize: number;
  dataWindow: number;
  datasetSize: number;
  symbols?: string[];
  indicators?: string[];
  timeframes?: string[];
}

export interface BacktestParams {
  strategyId: string;
  startDate: string;
  endDate: string;
  symbols: string[];
  initialCapital: number;
}

export interface BacktestResult {
  id: string;
  strategyId: string;
  startDate: string;
  endDate: string;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  netProfit: number;
  symbols: string[];
  tradesData: any[];
}

export interface TechnicalIndicator {
  id: string;
  name: string;
  description?: string;
  parameters: {
    [key: string]: {
      type: 'number' | 'boolean' | 'string' | 'select';
      default: any;
      min?: number;
      max?: number;
      options?: string[];
    }
  };
  is_active: boolean;
  category: 'trend' | 'momentum' | 'volatility' | 'volume' | 'other';
}

export interface BrokerAccount {
  id: string;
  user_id: string;
  broker_name: string;
  account_number: string;
  platform: 'MT4' | 'MT5' | 'cTrader';
  server: string;
  login: string;
  password?: string;
  api_key?: string;
  is_active: boolean;
  account_type: 'demo' | 'real';
  balance?: number;
  equity?: number;
  last_sync?: string;
}

export interface MonitoredTrade {
  id: string;
  signal_id: string;
  broker_account_id: string;
  ticket_number?: string;
  entry_price: number;
  current_price?: number;
  type: 'BUY' | 'SELL';
  volume: number;
  stop_loss?: number;
  take_profit?: number;
  profit?: number;
  status: 'open' | 'closed' | 'partially_closed';
  open_time: string;
  close_time?: string;
  symbol: string;
  pips?: number;
  user_id: string;
}
