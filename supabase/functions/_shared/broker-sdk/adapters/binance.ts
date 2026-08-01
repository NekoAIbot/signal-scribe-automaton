// Universal Broker SDK — Binance Spot adapter.
import type {
  AccountInfo, BrokerAdapter, BrokerCapabilities, BrokerCredentials, Environment,
  HealthStatus, OrderRequest, OrderResult, Position, SymbolRules,
} from '../types.ts';
import { DEFAULT_CAPABILITIES } from '../types.ts';
import { BrokerError, translateError } from '../errors.ts';
import { credentialCandidates, hmacSha256Hex, httpRequest } from '../credentials.ts';
import { normalizeSymbol, toBinanceSymbol } from '../symbols.ts';

export class BinanceAdapter implements BrokerAdapter {
  readonly id = 'binance' as const;
  readonly displayName = 'Binance Spot';
  readonly supportedEnvironments: Environment[] = ['live', 'testnet'];
  readonly capabilities: BrokerCapabilities = {
    ...DEFAULT_CAPABILITIES,
    marketOrders: true,
    limitOrders: true,
    stopOrders: true,
    pendingOrders: true,
    partialClose: true,
    netting: true,
    streaming: true,
  };

  readonly environment: Environment;
  private readonly base: string;
  private readonly keys: string[];
  private readonly secrets: string[];
  private resolved: { key: string; secret: string } | null = null;
  private rulesCache: SymbolRules[] | null = null;

  constructor(private readonly creds: BrokerCredentials) {
    this.environment = String(creds.environment || '').toLowerCase() === 'live' ? 'live' : 'testnet';
    this.base = this.environment === 'live' ? 'https://api.binance.com' : 'https://testnet.binance.vision';
    this.keys = credentialCandidates(creds.api_token);
    this.secrets = credentialCandidates(creds.api_secret || creds.encrypted_password);
  }

  private envLabel() {
    return this.environment === 'live' ? 'Binance.com Live' : 'Binance Spot Testnet';
  }

  private requireCreds() {
    if (!this.keys.length || !this.secrets.length) {
      throw new BrokerError({
        broker: this.id, code: 'CONFIG_MISSING',
        message: 'Binance requires both an API key and an API secret.',
      });
    }
  }

  /** Signed request that retries across credential candidates on signature errors. */
  private async signed(path: string, params: Record<string, string | number> = {}, method = 'GET') {
    this.requireCreds();
    const keyList = this.resolved ? [this.resolved.key] : this.keys;
    const secretList = this.resolved ? [this.resolved.secret] : this.secrets;
    let last = { status: 0, text: 'no attempt' };

    for (const key of keyList) {
      for (const secret of secretList) {
        const query = new URLSearchParams({ ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])), timestamp: String(Date.now()), recvWindow: '10000' }).toString();
        const signature = await hmacSha256Hex(secret, query);
        const res = await httpRequest(`${this.base}${path}?${query}&signature=${signature}`, {
          method, headers: { 'X-MBX-APIKEY': key },
        });
        if (res.ok) { this.resolved = { key, secret }; return res; }
        last = { status: res.status, text: res.text };
        if (!/-1022|-2014|-2015|signature|invalid api/i.test(res.text)) {
          throw this.decorate(res.status, res.text);
        }
      }
    }
    throw this.decorate(last.status, last.text);
  }

  private decorate(status: number, text: string): BrokerError {
    const err = translateError(this.id, status, text);
    if (text.includes('-2015') && this.environment !== 'live') {
      return new BrokerError({
        broker: this.id, code: 'ENVIRONMENT_MISMATCH',
        message: `Binance rejected the key on ${this.envLabel()}.`,
        hint: 'This looks like a Binance.com live key stored as Testnet. Switch this account to Live, or create a Spot Testnet key at testnet.binance.vision.',
        httpStatus: status, raw: text,
      });
    }
    return err;
  }

  async connect() { this.requireCreds(); await this.getAccountInfo(); }
  async disconnect() { this.resolved = null; }

  async healthCheck(): Promise<HealthStatus> {
    const started = Date.now();
    try {
      const account = await this.getAccountInfo();
      return {
        connected: true, latencyMs: Date.now() - started, checkedAt: new Date().toISOString(),
        message: `Connected to ${this.envLabel()} — ${account.balance.toFixed(2)} ${account.currency} available`,
        environment: this.environment,
        details: { canTrade: account.tradingPermitted },
      };
    } catch (error) {
      const err = error as BrokerError;
      return {
        connected: false, latencyMs: Date.now() - started, checkedAt: new Date().toISOString(),
        message: err.message, environment: this.environment, details: { code: err.code, hint: err.hint },
      };
    }
  }

  async getAccountInfo(): Promise<AccountInfo> {
    const res = await this.signed('/api/v3/account');
    const balances = Array.isArray(res.json?.balances) ? res.json.balances : [];
    const quote = balances.find((b: any) => b.asset === 'USDT') || balances.find((b: any) => b.asset === 'USD') || { asset: 'USDT', free: '0', locked: '0' };
    const free = Number(quote.free || 0);
    const locked = Number(quote.locked || 0);
    return {
      accountId: String(res.json?.uid || this.creds.account_id || this.creds.login || 'binance'),
      accountName: this.creds.account_name || this.displayName,
      currency: quote.asset,
      balance: free + locked,
      equity: free + locked,
      margin: locked,
      freeMargin: free,
      availableFunds: free,
      leverage: null,
      accountType: String(res.json?.accountType || 'SPOT'),
      environment: this.environment,
      tradingPermitted: res.json?.canTrade !== false,
      raw: { permissions: res.json?.permissions },
    };
  }

  async getSymbols(): Promise<SymbolRules[]> {
    if (this.rulesCache) return this.rulesCache;
    const res = await httpRequest(`${this.base}/api/v3/exchangeInfo`, { method: 'GET' });
    if (!res.ok) throw translateError(this.id, res.status, res.text);
    this.rulesCache = (res.json?.symbols || [])
      .filter((s: any) => s.status === 'TRADING')
      .map((s: any) => {
        const lot = (s.filters || []).find((f: any) => f.filterType === 'LOT_SIZE') || {};
        const price = (s.filters || []).find((f: any) => f.filterType === 'PRICE_FILTER') || {};
        return {
          symbol: s.symbol,
          displaySymbol: normalizeSymbol(s.symbol),
          assetClass: 'crypto',
          minQuantity: lot.minQty ? Number(lot.minQty) : null,
          maxQuantity: lot.maxQty ? Number(lot.maxQty) : null,
          quantityStep: lot.stepSize ? Number(lot.stepSize) : null,
          tickSize: price.tickSize ? Number(price.tickSize) : null,
          pricePrecision: s.quotePrecision ?? null,
          quantityPrecision: s.baseAssetPrecision ?? null,
          minStake: null,
          maxStake: null,
          minStopDistance: null,
          supportedOrderTypes: s.orderTypes || ['MARKET', 'LIMIT'],
          tradingHours: '24/7',
          leverage: null,
        } as SymbolRules;
      });
    return this.rulesCache;
  }

  async getSymbolRules(symbol: string): Promise<SymbolRules | null> {
    const native = toBinanceSymbol(symbol);
    const all = await this.getSymbols();
    return all.find(r => r.symbol === native) || null;
  }

  async getOpenPositions(): Promise<Position[]> {
    // Spot has no positions; balances are the exposure.
    return [];
  }

  async placeOrder(order: OrderRequest): Promise<OrderResult> {
    const symbol = toBinanceSymbol(order.symbol);
    const params: Record<string, string | number> = {
      symbol,
      side: order.side,
      type: order.orderType === 'LIMIT' ? 'LIMIT' : 'MARKET',
      quantity: order.quantity,
    };
    if (order.orderType === 'LIMIT') {
      params.price = String(order.price);
      params.timeInForce = 'GTC';
    }
    if (order.clientOrderId) params.newClientOrderId = order.clientOrderId.slice(0, 36);

    const res = await this.signed('/api/v3/order', params, 'POST');
    const fills = res.json?.fills || [];
    const avg = fills.length
      ? fills.reduce((sum: number, f: any) => sum + Number(f.price) * Number(f.qty), 0) / fills.reduce((sum: number, f: any) => sum + Number(f.qty), 0)
      : Number(res.json?.price) || null;
    return {
      brokerOrderId: String(res.json?.orderId),
      status: res.json?.status === 'FILLED' ? 'filled' : 'accepted',
      symbol,
      side: order.side,
      filledQuantity: Number(res.json?.executedQty || order.quantity),
      price: avg,
      mode: 'binance',
      raw: res.json,
    };
  }

  async closePosition(positionId: string): Promise<OrderResult> {
    throw new BrokerError({
      broker: this.id, code: 'NOT_SUPPORTED',
      message: 'Binance Spot has no closable positions — place an opposing market order instead.',
      raw: positionId,
    });
  }
}
