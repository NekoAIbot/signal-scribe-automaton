
// Define the different broker types

export interface BrokerSettings {
  id: string;
  name: string;
  brokerName: string;
  accountType: 'demo' | 'real';
  platform: 'MT5' | 'MT4' | 'cTrader';
  server: string;
  login: string;
  password: string;
  enabled: boolean;
  autoTrade: boolean;
  riskPerTrade: number;
  maxDailyRisk: number;
  createdAt?: string;
  updatedAt?: string;
  userId?: string;
}

export interface MT5AccountDetails {
  id: string;
  login: string;
  password: string;
  server: string;
  platform?: 'MT4' | 'MT5' | 'cTrader';
  accountType?: 'demo' | 'real';
  lotSize?: number;
  maxRisk?: number;
  name?: string;
  brokerName?: string;
}

export interface BrokerConnection {
  id: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  lastError?: string;
  lastConnected?: string;
}
