
// Types for AI and ML features
export interface MLModel {
  id: string;
  name: string;
  type: 'DQN' | 'PPO' | 'LSTM' | 'Transformer';
  version: string;
  params?: any;
  is_active: boolean;
}

export interface TradingStrategy {
  id: string;
  name: string;
  description?: string;
  model_id?: string;
  parameters?: any;
  risk_profile: 'Low' | 'Medium' | 'High';
  is_active: boolean;
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
  status: 'new' | 'executing' | 'executed' | 'failed';
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
}
