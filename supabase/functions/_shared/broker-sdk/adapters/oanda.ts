// Universal Broker SDK — OANDA v20 adapter.
import type {
  AccountInfo, BrokerAdapter, BrokerCapabilities, BrokerCredentials, Environment,
  HealthStatus, OrderRequest, OrderResult, Position, SymbolRules,
} from '../types.ts';
import { DEFAULT_CAPABILITIES } from '../types.ts';
import { BrokerError, translateError } from '../errors.ts';
import { credentialCandidates, httpRequest } from '../credentials.ts';
import { classifySymbol, normalizeSymbol, toOandaSymbol } from '../symbols.ts';

export class OandaAdapter implements BrokerAdapter {
  readonly id = 'oanda' as const;
  readonly displayName = 'OANDA';
  readonly supportedEnvironments: Environment[] = ['live', 'practice'];
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
    netting: true,
    marginTrading: true,
    streaming: true,
  };

  readonly environment: Environment;
  private readonly base: string;
  private readonly token: string;
  private accountId: string;
  private rulesCache: SymbolRules[] | null = null;

  constructor(private readonly creds: BrokerCredentials) {
    this.environment = String(creds.environment || '').toLowerCase() === 'live' ? 'live' : 'practice';
    this.base = this.environment === 'live' ? 'https://api-fxtrade.oanda.com' : 'https://api-fxpractice.oanda.com';
    this.token = credentialCandidates(creds.api_token)[0] || '';
    this.accountId = String(creds.account_id || creds.login || '').trim();
  }

  private headers() {
    if (!this.token) {
      throw new BrokerError({ broker: this.id, code: 'CONFIG_MISSING', message: 'OANDA requires an API token.' });
    }
    return { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' };
  }

  private async ensureAccountId(): Promise<string> {
    if (this.accountId) return this.accountId;
    const res = await httpRequest(`${this.base}/v3/accounts`, { headers: this.headers() });
    if (!res.ok) throw translateError(this.id, res.status, res.text, 'AUTH_FAILED');
    const first = (res.json?.accounts || [])[0];
    if (!first?.id) throw new BrokerError({ broker: this.id, code: 'CONFIG_MISSING', message: 'No OANDA account was found for this token.' });
    this.accountId = String(first.id);
    return this.accountId;
  }

  async connect() { await this.ensureAccountId(); }
  async disconnect() { /* stateless REST */ }

  async healthCheck(): Promise<HealthStatus> {
    const started = Date.now();
    try {
      const account = await this.getAccountInfo();
      return {
        connected: true, latencyMs: Date.now() - started, checkedAt: new Date().toISOString(),
        message: `Connected to OANDA ${this.environment} account ${account.accountId} — ${account.balance.toFixed(2)} ${account.currency}`,
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
    const id = await this.ensureAccountId();
    const res = await httpRequest(`${this.base}/v3/accounts/${id}/summary`, { headers: this.headers() });
    if (!res.ok) throw translateError(this.id, res.status, res.text, 'AUTH_FAILED');
    const a = res.json?.account || {};
    return {
      accountId: String(a.id || id),
      accountName: this.creds.account_name || a.alias || this.displayName,
      currency: String(a.currency || 'USD'),
      balance: Number(a.balance || 0),
      equity: Number(a.NAV || a.balance || 0),
      margin: Number(a.marginUsed || 0),
      freeMargin: Number(a.marginAvailable || 0),
      availableFunds: Number(a.marginAvailable || 0),
      leverage: a.marginRate ? Math.round(1 / Number(a.marginRate)) : null,
      accountType: this.environment,
      environment: this.environment,
      tradingPermitted: a.openTradeCount !== undefined,
      raw: { openTradeCount: a.openTradeCount, unrealizedPL: a.unrealizedPL },
    };
  }

  async getSymbols(): Promise<SymbolRules[]> {
    if (this.rulesCache) return this.rulesCache;
    const id = await this.ensureAccountId();
    const res = await httpRequest(`${this.base}/v3/accounts/${id}/instruments`, { headers: this.headers() });
    if (!res.ok) throw translateError(this.id, res.status, res.text);
    this.rulesCache = (res.json?.instruments || []).map((i: any) => ({
      symbol: i.name,
      displaySymbol: normalizeSymbol(String(i.name).replace('_', '')),
      assetClass: classifySymbol(String(i.name).replace('_', '')),
      minQuantity: Number(i.minimumTradeSize || 1),
      maxQuantity: Number(i.maximumOrderUnits || 0) || null,
      quantityStep: 1,
      tickSize: i.pipLocation !== undefined ? Math.pow(10, Number(i.pipLocation)) : null,
      pricePrecision: Number(i.displayPrecision ?? 5),
      quantityPrecision: Number(i.tradeUnitsPrecision ?? 0),
      minStake: null,
      maxStake: null,
      minStopDistance: Number(i.minimumTrailingStopDistance || 0) || null,
      supportedOrderTypes: ['MARKET', 'LIMIT', 'STOP'],
      tradingHours: null,
      leverage: i.marginRate ? Math.round(1 / Number(i.marginRate)) : null,
    })) as SymbolRules[];
    return this.rulesCache;
  }

  async getSymbolRules(symbol: string): Promise<SymbolRules | null> {
    const native = toOandaSymbol(symbol);
    const all = await this.getSymbols();
    return all.find(r => r.symbol === native) || null;
  }

  async getOpenPositions(): Promise<Position[]> {
    const id = await this.ensureAccountId();
    const res = await httpRequest(`${this.base}/v3/accounts/${id}/openTrades`, { headers: this.headers() });
    if (!res.ok) throw translateError(this.id, res.status, res.text);
    return (res.json?.trades || []).map((t: any) => ({
      positionId: String(t.id),
      symbol: normalizeSymbol(String(t.instrument).replace('_', '')),
      side: Number(t.currentUnits) >= 0 ? 'BUY' : 'SELL',
      quantity: Math.abs(Number(t.currentUnits || 0)) / 100000,
      entryPrice: Number(t.price || 0),
      currentPrice: null,
      unrealizedPnl: Number(t.unrealizedPL || 0),
      stopLoss: t.stopLossOrder ? Number(t.stopLossOrder.price) : null,
      takeProfit: t.takeProfitOrder ? Number(t.takeProfitOrder.price) : null,
      openedAt: t.openTime || null,
      raw: t,
    })) as Position[];
  }

  async placeOrder(order: OrderRequest): Promise<OrderResult> {
    const id = await this.ensureAccountId();
    const instrument = toOandaSymbol(order.symbol);
    const units = (order.side === 'BUY' ? 1 : -1) * Math.round(order.quantity * 100000);
    const body: any = {
      order: {
        units: String(units),
        instrument,
        type: order.orderType === 'LIMIT' ? 'LIMIT' : 'MARKET',
        timeInForce: order.orderType === 'LIMIT' ? 'GTC' : 'FOK',
        positionFill: 'DEFAULT',
      },
    };
    if (order.orderType === 'LIMIT' && order.price) body.order.price = String(order.price);
    if (order.stopLoss) body.order.stopLossOnFill = { price: String(order.stopLoss) };
    if (order.takeProfit) body.order.takeProfitOnFill = { price: String(order.takeProfit) };
    if (order.clientOrderId) body.order.clientExtensions = { id: order.clientOrderId.slice(0, 128) };

    const res = await httpRequest(`${this.base}/v3/accounts/${id}/orders`, {
      method: 'POST', headers: this.headers(), body: JSON.stringify(body),
    });
    if (!res.ok) throw translateError(this.id, res.status, res.text);
    const fill = res.json?.orderFillTransaction;
    const create = res.json?.orderCreateTransaction;
    const reject = res.json?.orderRejectTransaction || res.json?.orderCancelTransaction;
    if (!fill && reject) {
      throw translateError(this.id, 400, JSON.stringify(reject));
    }
    return {
      brokerOrderId: String(fill?.id || create?.id),
      status: fill ? 'filled' : 'accepted',
      symbol: instrument,
      side: order.side,
      filledQuantity: Math.abs(Number(fill?.units || units)) / 100000,
      price: fill?.price ? Number(fill.price) : null,
      mode: 'oanda',
      raw: res.json,
    };
  }

  async closePosition(positionId: string, quantity?: number): Promise<OrderResult> {
    const id = await this.ensureAccountId();
    const body = quantity ? { units: String(Math.round(quantity * 100000)) } : { units: 'ALL' };
    const res = await httpRequest(`${this.base}/v3/accounts/${id}/trades/${positionId}/close`, {
      method: 'PUT', headers: this.headers(), body: JSON.stringify(body),
    });
    if (!res.ok) throw translateError(this.id, res.status, res.text);
    const fill = res.json?.orderFillTransaction || {};
    return {
      brokerOrderId: String(fill.id || positionId),
      status: 'filled',
      symbol: String(fill.instrument || ''),
      side: Number(fill.units || 0) >= 0 ? 'BUY' : 'SELL',
      filledQuantity: Math.abs(Number(fill.units || 0)) / 100000,
      price: fill.price ? Number(fill.price) : null,
      mode: 'oanda',
      raw: res.json,
    };
  }
}
