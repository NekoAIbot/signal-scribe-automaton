// Universal Broker SDK — standardized types.
// No application module may talk to a broker API directly; everything goes through
// a BrokerAdapter that implements this interface.

export type BrokerId =
  | 'deriv'
  | 'binance'
  | 'bybit'
  | 'oanda'
  | 'capital'
  | 'alpaca'
  | 'ctrader'
  | 'dxtrade'
  | 'ibkr'
  | 'mt5bridge';

export type Environment = 'live' | 'demo' | 'practice' | 'sandbox' | 'testnet';

export interface BrokerCredentials {
  id?: string;
  user_id?: string;
  account_name?: string | null;
  login?: string | null;
  account_id?: string | null;
  api_token?: string | null;
  api_secret?: string | null;
  encrypted_password?: string | null;
  environment?: string | null;
  server?: string | null;
  broker_type?: string | null;
  account_type?: string | null;
  is_active?: boolean;
  metadata?: Record<string, unknown> | null;
}

export interface BrokerCapabilities {
  marketOrders: boolean;
  limitOrders: boolean;
  stopOrders: boolean;
  pendingOrders: boolean;
  stopLoss: boolean;
  takeProfit: boolean;
  trailingStop: boolean;
  partialClose: boolean;
  hedging: boolean;
  netting: boolean;
  marginTrading: boolean;
  futures: boolean;
  options: boolean;
  copyTrading: boolean;
  streaming: boolean;
}

export const DEFAULT_CAPABILITIES: BrokerCapabilities = {
  marketOrders: true,
  limitOrders: false,
  stopOrders: false,
  pendingOrders: false,
  stopLoss: false,
  takeProfit: false,
  trailingStop: false,
  partialClose: false,
  hedging: false,
  netting: false,
  marginTrading: false,
  futures: false,
  options: false,
  copyTrading: false,
  streaming: false,
};

export interface AccountInfo {
  accountId: string;
  accountName: string;
  currency: string;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  availableFunds: number;
  leverage: number | null;
  accountType: string;
  environment: Environment;
  tradingPermitted: boolean;
  raw?: Record<string, unknown>;
}

export interface SymbolRules {
  symbol: string;              // broker-native symbol
  displaySymbol: string;       // normalized display symbol
  assetClass: string;
  minQuantity: number | null;
  maxQuantity: number | null;
  quantityStep: number | null;
  tickSize: number | null;
  pricePrecision: number | null;
  quantityPrecision: number | null;
  minStake: number | null;
  maxStake: number | null;
  minStopDistance: number | null;
  supportedOrderTypes: string[];
  tradingHours: string | null;
  leverage: number | null;
}

export interface OrderRequest {
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  orderType?: 'MARKET' | 'LIMIT' | 'STOP';
  price?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  clientOrderId?: string;      // idempotency key
  durationMinutes?: number;    // options-style brokers (Deriv)
}

export interface OrderResult {
  brokerOrderId: string;
  status: 'filled' | 'accepted' | 'rejected';
  symbol: string;
  side: 'BUY' | 'SELL';
  filledQuantity: number;
  price: number | null;
  raw?: Record<string, unknown>;
  mode: string;
}

export interface Position {
  positionId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  entryPrice: number | null;
  currentPrice: number | null;
  unrealizedPnl: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  openedAt: string | null;
  raw?: Record<string, unknown>;
}

export interface HealthStatus {
  connected: boolean;
  latencyMs: number;
  checkedAt: string;
  message: string;
  environment: Environment;
  details?: Record<string, unknown>;
}

export interface BrokerAdapter {
  readonly id: BrokerId;
  readonly displayName: string;
  readonly environment: Environment;
  readonly capabilities: BrokerCapabilities;
  readonly supportedEnvironments: Environment[];

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<HealthStatus>;

  getAccountInfo(): Promise<AccountInfo>;
  getSymbols(): Promise<SymbolRules[]>;
  getSymbolRules(symbol: string): Promise<SymbolRules | null>;
  getOpenPositions(): Promise<Position[]>;

  placeOrder(order: OrderRequest): Promise<OrderResult>;
  closePosition(positionId: string, quantity?: number): Promise<OrderResult>;
}

// ---------------------------------------------------------------------------
// Authentication capabilities + standardized adapter surface
// ---------------------------------------------------------------------------

export type AuthMethod = 'oauth' | 'api_key' | 'pat' | 'login_password';

export interface BrokerAuthCapabilities {
  supportsOAuth: boolean;
  supportsApiKey: boolean;
  supportsPAT: boolean;
  supportsDemo: boolean;
  supportsLive: boolean;
  supportsCopyTrading: boolean;
  supportsStreaming: boolean;
  supportsHistory: boolean;
  supportsTrading: boolean;
  supportsAccountSync: boolean;
  supportsPortfolioSync: boolean;
  /** Auth method the connection wizard should offer first. */
  defaultAuthMethod: AuthMethod;
}

export const DEFAULT_AUTH_CAPABILITIES: BrokerAuthCapabilities = {
  supportsOAuth: false,
  supportsApiKey: true,
  supportsPAT: false,
  supportsDemo: true,
  supportsLive: true,
  supportsCopyTrading: false,
  supportsStreaming: false,
  supportsHistory: true,
  supportsTrading: true,
  supportsAccountSync: true,
  supportsPortfolioSync: true,
  defaultAuthMethod: 'api_key',
};

export interface SessionStatus {
  valid: boolean;
  authMethod: AuthMethod;
  expiresAt: string | null;
  renewable: boolean;
  /** Present when the session was silently renewed — persist these fields. */
  renewedCredentials?: Partial<BrokerCredentials>;
  message: string;
}

export interface PermissionReport {
  granted: string[];
  missing: string[];
  canTrade: boolean;
  canRead: boolean;
}

/** Standardized methods every adapter exposes (defaults supplied by the SDK). */
export interface StandardAdapterMethods {
  refresh(): Promise<SessionStatus>;
  validate(): Promise<SessionStatus>;
  health(): Promise<HealthStatus>;
  permissions(): Promise<PermissionReport>;
  supportedAssets(): string[];
  supportedOrderTypes(): string[];
  supportedTimeframes(): string[];
}

export type StandardBrokerAdapter = BrokerAdapter & StandardAdapterMethods;
