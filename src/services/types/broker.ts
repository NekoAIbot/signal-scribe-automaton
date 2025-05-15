
// MT5 Account details interface
export interface MT5AccountDetails {
  id: string;
  login: string;
  server: string;
  password?: string;
  investorPassword?: string;
  accountType: 'demo' | 'real';
  balance?: number;
  equity?: number;
  margin?: number;
  freeMargin?: number;
  leverage?: number;
  name?: string;
}

// Broker settings interface
export interface BrokerSettings {
  id: string;
  userId: string;
  brokerName: string;
  accountType: string;
  apiKey?: string;
  apiSecret?: string;
  isConnected: boolean;
  status: 'active' | 'inactive' | 'pending';
  mt5Accounts?: MT5AccountDetails[];
  createdAt?: string;
  updatedAt?: string;
}
