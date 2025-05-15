
export interface MT5AccountDetails {
  id: string;  // Adding the id property that's used in BrokerSettingsModal
  name: string;
  server: string;
  login: string;
  type: string; // demo/live
  balance?: number;
  equity?: number;
  connected: boolean;
  lastSyncTime?: string;
  password?: string;  // Adding password field used in BrokerSettingsModal
  platform?: string;  // Adding platform field
  accountType?: string;  // Adding accountType field
  lotSize?: number;  // Adding lotSize field
  maxRisk?: number;  // Adding maxRisk field
}

export interface BrokerSettings {
  brokerName?: string;  // Adding brokerName property used in TradingBot component
  accountType?: string;  // Adding accountType property used in TradingBot component
  apiKey?: string;
  secretKey?: string;
  enabled: boolean;
  accountId?: string;
  mt5Accounts: MT5AccountDetails[];
  preferredAccount?: string;
  mt4Accounts?: MT5AccountDetails[];  // Adding mt4Accounts used in BrokerSettingsModal
  ctraderAccounts?: MT5AccountDetails[];  // Adding ctraderAccounts used in BrokerSettingsModal
  defaultAccountId?: string;  // Adding defaultAccountId used in BrokerSettingsModal
}
