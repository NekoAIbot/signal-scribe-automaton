
export interface MT5AccountDetails {
  id: string;
  name: string;
  server: string;
  login: string;
  type: string; // demo/live
  balance?: number;
  equity?: number;
  connected: boolean;
  lastSyncTime?: string;
}

export interface BrokerSettings {
  brokerName?: string;
  accountType?: string;
  apiKey?: string;
  secretKey?: string;
  enabled: boolean;
  accountId?: string;
  mt5Accounts: MT5AccountDetails[];
  preferredAccount?: string;
}
