export type BrokerEnvironment = 'live' | 'demo' | 'practice' | 'sandbox' | 'testnet';
export type BrokerAuthMethod = 'oauth' | 'pat' | 'api_key' | 'login_password_server';
export type TradingPurpose = 'aiTrading' | 'manualTrading' | 'copyTrading' | 'paperTrading' | 'liveTrading';

export interface BrokerDefinition {
  value: string;
  label: string;
  markets: string;
  environments: BrokerEnvironment[];
  defaultEnvironment: BrokerEnvironment;
  authMethods: BrokerAuthMethod[];
  defaultAuthMethod: BrokerAuthMethod;
  requiredScopes: string[];
  fallbackHelp: string;
  oauthSupported: boolean;
}

export interface DiscoveredBrokerAccount {
  accountId: string;
  accountName: string;
  accountNumber?: string | null;
  accountType: string;
  environment: BrokerEnvironment;
  balance?: number | null;
  equity?: number | null;
  currency?: string | null;
  leverage?: string | number | null;
  permissions: string[];
  metadata?: Record<string, unknown>;
}

export const TRADING_PURPOSES: { key: TradingPurpose; label: string }[] = [
  { key: 'aiTrading', label: 'AI Trading' },
  { key: 'manualTrading', label: 'Manual Trading' },
  { key: 'copyTrading', label: 'Copy Trading' },
  { key: 'paperTrading', label: 'Paper Trading' },
  { key: 'liveTrading', label: 'Live Trading' },
];

export const BROKER_DEFINITIONS: BrokerDefinition[] = [
  {
    value: 'deriv', label: 'Deriv', markets: 'Crypto + Synthetics + Forex',
    environments: ['demo', 'live'], defaultEnvironment: 'demo',
    authMethods: ['oauth', 'pat'], defaultAuthMethod: 'oauth', oauthSupported: true,
    requiredScopes: ['Trade', 'Account manage', 'Read account'],
    fallbackHelp: 'OAuth is preferred. Personal access tokens are available as an advanced fallback only; Deriv App IDs stay backend-only.',
  },
  {
    value: 'binance', label: 'Binance', markets: 'Crypto',
    environments: ['live', 'testnet'], defaultEnvironment: 'live',
    authMethods: ['oauth', 'api_key'], defaultAuthMethod: 'oauth', oauthSupported: true,
    requiredScopes: ['Read account', 'Trade'],
    fallbackHelp: 'OAuth is preferred when enabled for the deployment. API keys are the official fallback; disable withdrawals.',
  },
  {
    value: 'bybit', label: 'Bybit', markets: 'Crypto',
    environments: ['live', 'testnet'], defaultEnvironment: 'testnet',
    authMethods: ['oauth', 'api_key'], defaultAuthMethod: 'oauth', oauthSupported: true,
    requiredScopes: ['Read account', 'Trade'],
    fallbackHelp: 'OAuth is preferred when available. API key/secret is the official fallback.',
  },
  {
    value: 'alpaca', label: 'Alpaca', markets: 'Stocks + Crypto',
    environments: ['live', 'practice'], defaultEnvironment: 'practice',
    authMethods: ['oauth', 'api_key'], defaultAuthMethod: 'oauth', oauthSupported: true,
    requiredScopes: ['Account read', 'Trading'],
    fallbackHelp: 'OAuth is preferred. API key/secret can be used for paper or live accounts when OAuth is unavailable.',
  },
  {
    value: 'interactive_brokers', label: 'Interactive Brokers', markets: 'Multi-asset',
    environments: ['live', 'sandbox'], defaultEnvironment: 'sandbox',
    authMethods: ['oauth'], defaultAuthMethod: 'oauth', oauthSupported: true,
    requiredScopes: ['Accounts', 'Trading'], fallbackHelp: 'Use the official Interactive Brokers authorization flow.',
  },
  {
    value: 'oanda', label: 'OANDA', markets: 'Forex + CFDs',
    environments: ['practice', 'live'], defaultEnvironment: 'practice',
    authMethods: ['oauth', 'api_key'], defaultAuthMethod: 'oauth', oauthSupported: true,
    requiredScopes: ['Read account', 'Trade'], fallbackHelp: 'OAuth is preferred. Personal access token plus account ID is the official fallback.',
  },
  {
    value: 'capital', label: 'Capital.com', markets: 'Forex + Crypto + Stocks',
    environments: ['demo', 'live'], defaultEnvironment: 'demo',
    authMethods: ['api_key'], defaultAuthMethod: 'api_key', oauthSupported: false,
    requiredScopes: ['Trading API enabled', 'Custom password set'], fallbackHelp: 'Use Capital.com API key, identifier, and API password.',
  },
  {
    value: 'mt5', label: 'MetaTrader 5', markets: 'Broker-hosted Forex + CFDs',
    environments: ['demo', 'live'], defaultEnvironment: 'demo',
    authMethods: ['login_password_server'], defaultAuthMethod: 'login_password_server', oauthSupported: false,
    requiredScopes: ['Login', 'Password', 'Server'], fallbackHelp: 'MT5 uses broker login, password, and server. Existing MT5 accounts remain supported.',
  },
];

export const getBrokerDefinition = (value: string) => BROKER_DEFINITIONS.find((broker) => broker.value === value) || BROKER_DEFINITIONS[0];
export const isOAuthDefault = (value: string) => getBrokerDefinition(value).defaultAuthMethod === 'oauth';
