// Universal Broker SDK — Capital.com adapter.
import type {
  AccountInfo, BrokerAdapter, BrokerCapabilities, BrokerCredentials, Environment,
  HealthStatus, OrderRequest, OrderResult, Position, SymbolRules,
} from '../types.ts';
import { DEFAULT_CAPABILITIES } from '../types.ts';
import { BrokerError, translateError } from '../errors.ts';
import { credentialCandidates, httpRequest } from '../credentials.ts';
import { classifySymbol, normalizeSymbol, toCapitalSymbol } from '../symbols.ts';

export class CapitalAdapter implements BrokerAdapter {
  readonly id = 'capital' as const;
  readonly displayName = 'Capital.com';
  readonly supportedEnvironments: Environment[] = ['live', 'demo'];
  readonly capabilities: BrokerCapabilities = {
    ...DEFAULT_CAPABILITIES,
    marketOrders: true,
    limitOrders: true,
    stopOrders: true,
    pendingOrders: true,
    stopLoss: true,
    takeProfit: true,
    trailingStop: true,
    partialClose: true,
    hedging: true,
    marginTrading: true,
    streaming: true,
  };

  readonly environment: Environment;
  private readonly base: string;
  private readonly apiKey: string;
  private readonly identifier: string;
  private readonly password: string;
  private session: { cst: string; xsec: string } | null = null;

  constructor(private readonly creds: BrokerCredentials) {
    this.environment = String(creds.environment || '').toLowerCase() === 'live' ? 'live' : 'demo';
    this.base = this.environment === 'live'
      ? 'https://api-capital.backend-capital.com'
      : 'https://demo-api-capital.backend-capital.com';
    this.apiKey = credentialCandidates(creds.api_token)[0] || '';
    this.identifier = String(creds.account_id || creds.login || '').trim();
    this.password = credentialCandidates(creds.encrypted_password || creds.api_secret)[0] || '';
  }

  private async ensureSession() {
    if (this.session) return this.session;
    if (!this.apiKey || !this.identifier || !this.password) {
      throw new BrokerError({
        broker: this.id, code: 'CONFIG_MISSING',
        message: 'Capital.com requires an API key, account email/identifier, and password.',
      });
    }
    const res = await httpRequest(`${this.base}/api/v1/session`, {
      method: 'POST',
      headers: { 'X-CAP-API-KEY': this.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: this.identifier, password: this.password }),
    });
    if (!res.ok) throw translateError(this.id, res.status, res.text, 'AUTH_FAILED');
    this.session = {
      cst: res.headers.get('CST') || '',
      xsec: res.headers.get('X-SECURITY-TOKEN') || '',
    };
    return this.session;
  }

  private async authHeaders() {
    const s = await this.ensureSession();
    return {
      'X-CAP-API-KEY': this.apiKey,
      CST: s.cst,
      'X-SECURITY-TOKEN': s.xsec,
      'Content-Type': 'application/json',
    };
  }

  async connect() { await this.ensureSession(); }
  async disconnect() { this.session = null; }

  async healthCheck(): Promise<HealthStatus> {
    const started = Date.now();
    try {
      const account = await this.getAccountInfo();
      return {
        connected: true, latencyMs: Date.now() - started, checkedAt: new Date().toISOString(),
        message: `Connected to Capital.com ${this.environment} — ${account.balance.toFixed(2)} ${account.currency}`,
        environment: this.environment,
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
    const res = await httpRequest(`${this.base}/api/v1/accounts`, { headers: await this.authHeaders() });
    if (!res.ok) throw translateError(this.id, res.status, res.text, 'AUTH_FAILED');
    const accounts = res.json?.accounts || [];
    const a = accounts.find((x: any) => x.preferred) || accounts[0] || {};
    const bal = a.balance || {};
    return {
      accountId: String(a.accountId || this.identifier),
      accountName: this.creds.account_name || a.accountName || this.displayName,
      currency: String(a.currency || 'USD'),
      balance: Number(bal.balance || 0),
      equity: Number(bal.balance || 0) + Number(bal.profitLoss || 0),
      margin: Number(bal.deposit || 0),
      freeMargin: Number(bal.available || 0),
      availableFunds: Number(bal.available || 0),
      leverage: null,
      accountType: String(a.accountType || this.environment),
      environment: this.environment,
      tradingPermitted: String(a.status || 'ENABLED') === 'ENABLED',
      raw: a,
    };
  }

  async getSymbols(): Promise<SymbolRules[]> {
    const res = await httpRequest(`${this.base}/api/v1/markets?searchTerm=`, { headers: await this.authHeaders() });
    if (!res.ok) return [];
    return (res.json?.markets || []).map((m: any) => ({
      symbol: m.epic,
      displaySymbol: normalizeSymbol(m.epic),
      assetClass: classifySymbol(m.epic),
      minQuantity: null,
      maxQuantity: null,
      quantityStep: null,
      tickSize: null,
      pricePrecision: m.decimalPlacesFactor ?? null,
      quantityPrecision: null,
      minStake: null,
      maxStake: null,
      minStopDistance: null,
      supportedOrderTypes: ['MARKET', 'LIMIT', 'STOP'],
      tradingHours: m.marketStatus || null,
      leverage: null,
    })) as SymbolRules[];
  }

  async getSymbolRules(symbol: string): Promise<SymbolRules | null> {
    const epic = toCapitalSymbol(symbol);
    const res = await httpRequest(`${this.base}/api/v1/markets/${encodeURIComponent(epic)}`, { headers: await this.authHeaders() });
    if (!res.ok) return null;
    const d = res.json?.dealingRules || {};
    const inst = res.json?.instrument || {};
    const snapshot = res.json?.snapshot || {};
    return {
      symbol: epic,
      displaySymbol: normalizeSymbol(epic),
      assetClass: classifySymbol(epic),
      minQuantity: d.minDealSize?.value ?? null,
      maxQuantity: d.maxDealSize?.value ?? null,
      quantityStep: null,
      tickSize: null,
      pricePrecision: null,
      quantityPrecision: null,
      minStake: null,
      maxStake: null,
      minStopDistance: d.minStopOrProfitDistance?.value ?? null,
      supportedOrderTypes: ['MARKET', 'LIMIT', 'STOP'],
      tradingHours: snapshot.marketStatus || inst.marketStatus || null,
      leverage: null,
    };
  }

  async getOpenPositions(): Promise<Position[]> {
    const res = await httpRequest(`${this.base}/api/v1/positions`, { headers: await this.authHeaders() });
    if (!res.ok) throw translateError(this.id, res.status, res.text);
    return (res.json?.positions || []).map((p: any) => ({
      positionId: String(p.position?.dealId),
      symbol: normalizeSymbol(String(p.market?.epic || '')),
      side: String(p.position?.direction || 'BUY').toUpperCase() === 'BUY' ? 'BUY' : 'SELL',
      quantity: Number(p.position?.size || 0),
      entryPrice: Number(p.position?.level || 0),
      currentPrice: Number(p.market?.bid ?? p.market?.offer ?? 0) || null,
      unrealizedPnl: Number(p.position?.upl ?? 0) || null,
      stopLoss: p.position?.stopLevel ? Number(p.position.stopLevel) : null,
      takeProfit: p.position?.profitLevel ? Number(p.position.profitLevel) : null,
      openedAt: p.position?.createdDateUTC || null,
      raw: p,
    })) as Position[];
  }

  async placeOrder(order: OrderRequest): Promise<OrderResult> {
    const epic = toCapitalSymbol(order.symbol);
    const body: any = { epic, direction: order.side, size: order.quantity, orderType: order.orderType || 'MARKET' };
    if (order.orderType === 'LIMIT' && order.price) body.level = order.price;
    if (order.stopLoss) body.stopLevel = order.stopLoss;
    if (order.takeProfit) body.profitLevel = order.takeProfit;

    const res = await httpRequest(`${this.base}/api/v1/positions`, {
      method: 'POST', headers: await this.authHeaders(), body: JSON.stringify(body),
    });
    if (!res.ok) throw translateError(this.id, res.status, res.text);
    return {
      brokerOrderId: String(res.json?.dealReference || Date.now()),
      status: 'accepted',
      symbol: epic,
      side: order.side,
      filledQuantity: order.quantity,
      price: order.price ?? null,
      mode: 'capital',
      raw: res.json,
    };
  }

  async closePosition(positionId: string): Promise<OrderResult> {
    const res = await httpRequest(`${this.base}/api/v1/positions/${encodeURIComponent(positionId)}`, {
      method: 'DELETE', headers: await this.authHeaders(),
    });
    if (!res.ok) throw translateError(this.id, res.status, res.text);
    return {
      brokerOrderId: String(res.json?.dealReference || positionId),
      status: 'accepted', symbol: '', side: 'SELL', filledQuantity: 0, price: null,
      mode: 'capital', raw: res.json,
    };
  }
}
