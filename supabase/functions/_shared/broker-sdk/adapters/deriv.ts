// Universal Broker SDK — Deriv adapter (legacy WS tokens + new PAT tokens + OAuth tokens).
import type {
  AccountInfo, BrokerAdapter, BrokerCapabilities, BrokerCredentials, Environment,
  HealthStatus, OrderRequest, OrderResult, Position, SymbolRules,
} from '../types.ts';
import { DEFAULT_CAPABILITIES } from '../types.ts';
import { BrokerError, translateError } from '../errors.ts';
import { cleanCredentialValue, credentialCandidates, httpRequest } from '../credentials.ts';
import { toDerivSymbol } from '../symbols.ts';

interface WsCall { request: Record<string, unknown>; expect: string; }

export class DerivAdapter implements BrokerAdapter {
  readonly id = 'deriv' as const;
  readonly displayName = 'Deriv';
  readonly supportedEnvironments: Environment[] = ['live', 'demo'];
  readonly capabilities: BrokerCapabilities = {
    ...DEFAULT_CAPABILITIES,
    marketOrders: true,
    options: true,
    streaming: true,
  };

  readonly environment: Environment;
  private readonly tokens: string[];
  private activeToken: string | null = null;
  private authorized: any = null;

  constructor(private readonly creds: BrokerCredentials) {
    const env = String(creds.environment || creds.account_type || 'demo').toLowerCase();
    this.environment = env === 'live' ? 'live' : 'demo';
    this.tokens = credentialCandidates(creds.api_token);
  }

  /**
   * The current Deriv API (REST + OTP WebSocket) is used for OAuth grants and
   * personal access tokens. Legacy `ws.derivws.com` authorize is only kept for
   * older manually-pasted API tokens.
   */
  private modern(token: string): boolean {
    if (String((this.creds as any).auth_method || '').toLowerCase() === 'oauth') return true;
    const meta = (this.creds.metadata || {}) as Record<string, unknown>;
    if (String(meta.auth_method || '').toLowerCase() === 'oauth') return true;
    return token.startsWith('pat_');
  }

  private appId(token: string): string {
    const meta = (this.creds.metadata || {}) as Record<string, unknown>;
    const metaId = cleanCredentialValue(meta.deriv_app_id || meta.app_id || '');
    if (metaId) return metaId;
    const oauthId = cleanCredentialValue(Deno.env.get('DERIV_OAUTH_APP_ID') || '');
    const patId = cleanCredentialValue(Deno.env.get('DERIV_PAT_APP_ID') || '');
    const legacyId = cleanCredentialValue(Deno.env.get('DERIV_APP_ID') || '');
    // OAuth-issued tokens must be used with the app that authorized them.
    if (String((this.creds as any).auth_method || '') === 'oauth' && oauthId) return oauthId;
    if (token.startsWith('pat_')) return patId || oauthId || legacyId || '';
    return legacyId || oauthId || '1089';
  }


  private requireToken() {
    if (!this.tokens.length) {
      throw new BrokerError({ broker: this.id, code: 'CONFIG_MISSING', message: 'Deriv requires an API token.' });
    }
  }

  /** Run a sequence of WS calls on an authorized legacy connection. */
  private wsSequence(url: string, calls: (auth: any) => WsCall[], preAuthToken?: string) {
    return new Promise<any[]>((resolve, reject) => {
      let ws: WebSocket;
      try { ws = new WebSocket(url); } catch (e) {
        return reject(new BrokerError({ broker: this.id, code: 'NETWORK_ERROR', message: String(e) }));
      }
      const results: any[] = [];
      let queue: WsCall[] = [];
      let index = 0;
      const timer = setTimeout(() => {
        try { ws.close(); } catch { /* noop */ }
        reject(new BrokerError({ broker: this.id, code: 'TIMEOUT', message: 'Deriv WebSocket timed out.', retryable: true }));
      }, 20000);

      const finish = (fn: () => void) => { clearTimeout(timer); try { ws.close(); } catch { /* noop */ } fn(); };

      ws.onopen = () => {
        if (preAuthToken) ws.send(JSON.stringify({ authorize: preAuthToken }));
        else { queue = calls(null); ws.send(JSON.stringify(queue[0].request)); }
      };
      ws.onmessage = (ev: MessageEvent) => {
        let msg: any;
        try { msg = JSON.parse(ev.data as string); } catch { return; }
        if (msg.error) {
          return finish(() => reject(new BrokerError({
            broker: this.id,
            code: /token|authoriz/i.test(String(msg.error.code)) ? 'AUTH_FAILED' : 'ORDER_REJECTED',
            message: `Deriv: ${msg.error.message}`,
            raw: msg.error,
          })));
        }
        if (preAuthToken && msg.msg_type === 'authorize' && queue.length === 0) {
          this.authorized = msg.authorize;
          queue = calls(msg.authorize);
          if (!queue.length) return finish(() => resolve([msg.authorize]));
          return ws.send(JSON.stringify(queue[0].request));
        }
        if (queue.length && msg.msg_type === queue[index].expect) {
          results.push(msg);
          index += 1;
          if (index >= queue.length) return finish(() => resolve(results));
          const next = queue[index];
          const req = typeof (next.request as any).__fromPrevious === 'function'
            ? (next.request as any).__fromPrevious(msg)
            : next.request;
          ws.send(JSON.stringify(req));
        }
      };
      ws.onerror = () => finish(() => reject(new BrokerError({
        broker: this.id, code: 'NETWORK_ERROR', message: 'Deriv WebSocket connection failed.', retryable: true,
      })));
    });
  }

  private async authorizeLegacy(token: string) {
    const appId = this.appId(token);
    const [auth] = await this.wsSequence(`wss://ws.derivws.com/websockets/v3?app_id=${appId}`, () => [], token);
    return auth;
  }

  /** PAT tokens use the REST trading API to mint a short-lived WS OTP url. */
  private async otpSocketUrl(token: string): Promise<string> {
    const appId = this.appId(token);
    if (!appId) {
      throw new BrokerError({
        broker: this.id, code: 'CONFIG_MISSING',
        message: 'Deriv personal access tokens require the matching Deriv App ID.',
        hint: 'Edit this broker account and add the App ID from the same Deriv application that issued the token.',
      });
    }
    const accountId = cleanCredentialValue(this.creds.account_id || this.creds.login || '') || await this.resolveAccountId(token, appId);
    if (!accountId) {
      throw new BrokerError({ broker: this.id, code: 'CONFIG_MISSING', message: 'No active Deriv trading account was found for this token.' });
    }
    const res = await httpRequest(`https://api.derivws.com/trading/v1/options/accounts/${encodeURIComponent(accountId)}/otp`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Deriv-App-ID': appId },
    });
    const url = res.json?.data?.url;
    if (!res.ok || !url) throw translateError(this.id, res.status, this.restError(res.text, res.json), 'AUTH_FAILED');
    return url;
  }

  private restError(raw: string, body: any) {
    const first = Array.isArray(body?.errors) ? body.errors[0] : null;
    return String(first?.message || raw || '').trim();
  }

  private async resolveAccountId(token: string, appId: string): Promise<string> {
    const res = await httpRequest('https://api.derivws.com/trading/v1/options/accounts', {
      method: 'GET', headers: { Authorization: `Bearer ${token}`, 'Deriv-App-ID': appId },
    });
    if (!res.ok) throw translateError(this.id, res.status, this.restError(res.text, res.json), 'AUTH_FAILED');
    const accounts = Array.isArray(res.json?.data) ? res.json.data : [];
    const match = accounts.find((a: any) => String(a.account_type || '').toLowerCase() === this.environment && a.status === 'active')
      || accounts.find((a: any) => a.status === 'active')
      || accounts[0];
    return match?.account_id || '';
  }

  /** Try each credential candidate; stop on the first non-auth failure. */
  private async withToken<T>(fn: (token: string) => Promise<T>): Promise<T> {
    this.requireToken();
    const list = this.activeToken ? [this.activeToken] : this.tokens;
    let last: unknown = null;
    for (const token of list) {
      try {
        const out = await fn(token);
        this.activeToken = token;
        return out;
      } catch (error) {
        last = error;
        const code = (error as BrokerError)?.code;
        if (code !== 'AUTH_FAILED') break;
      }
    }
    throw last instanceof BrokerError ? last : new BrokerError({ broker: this.id, code: 'AUTH_FAILED', message: String(last) });
  }

  async connect() { await this.getAccountInfo(); }
  async disconnect() { this.activeToken = null; this.authorized = null; }

  async healthCheck(): Promise<HealthStatus> {
    const started = Date.now();
    try {
      const account = await this.getAccountInfo();
      return {
        connected: true, latencyMs: Date.now() - started, checkedAt: new Date().toISOString(),
        message: `Connected to Deriv ${account.accountType} account ${account.accountId} — ${account.balance.toFixed(2)} ${account.currency}`,
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
    return await this.withToken(async (token) => {
      if (this.modern(token)) {
        const appId = this.appId(token);
        const accountId = cleanCredentialValue(this.creds.account_id || this.creds.login || '') || await this.resolveAccountId(token, appId);
        const res = await httpRequest('https://api.derivws.com/trading/v1/options/accounts', {
          method: 'GET', headers: { Authorization: `Bearer ${token}`, 'Deriv-App-ID': appId },
        });
        if (!res.ok) throw translateError(this.id, res.status, this.restError(res.text, res.json), 'AUTH_FAILED');
        const acct = (res.json?.data || []).find((a: any) => a.account_id === accountId) || (res.json?.data || [])[0] || {};
        return {
          accountId: String(acct.account_id || accountId),
          accountName: this.creds.account_name || this.displayName,
          currency: String(acct.currency || 'USD'),
          balance: Number(acct.balance || 0),
          equity: Number(acct.balance || 0),
          margin: 0,
          freeMargin: Number(acct.balance || 0),
          availableFunds: Number(acct.balance || 0),
          leverage: null,
          accountType: String(acct.account_type || this.environment),
          environment: this.environment,
          tradingPermitted: String(acct.status || 'active') === 'active',
          raw: acct,
        } as AccountInfo;
      }

      const auth = await this.authorizeLegacy(token);
      return {
        accountId: String(auth.loginid),
        accountName: this.creds.account_name || auth.fullname || this.displayName,
        currency: String(auth.currency || 'USD'),
        balance: Number(auth.balance || 0),
        equity: Number(auth.balance || 0),
        margin: 0,
        freeMargin: Number(auth.balance || 0),
        availableFunds: Number(auth.balance || 0),
        leverage: null,
        accountType: auth.is_virtual ? 'demo' : 'live',
        environment: auth.is_virtual ? 'demo' : 'live',
        tradingPermitted: true,
        raw: {
          scopes: auth.scopes,
          landing_company: auth.landing_company_fullname || auth.landing_company_name || null,
          is_virtual: !!auth.is_virtual,
          account_list: auth.account_list || [],
          email: auth.email || null,
        },

      } as AccountInfo;
    });
  }

  async getSymbols(): Promise<SymbolRules[]> {
    // Deriv exposes thousands of contracts; the platform trades the curated universe.
    return [];
  }

  async getSymbolRules(symbol: string): Promise<SymbolRules | null> {
    return {
      symbol: toDerivSymbol(symbol),
      displaySymbol: symbol,
      assetClass: 'options',
      minQuantity: 0.35,
      maxQuantity: null,
      quantityStep: 0.01,
      tickSize: null,
      pricePrecision: null,
      quantityPrecision: 2,
      minStake: 0.35,
      maxStake: null,
      minStopDistance: null,
      supportedOrderTypes: ['MARKET'],
      tradingHours: null,
      leverage: null,
    };
  }

  async getOpenPositions(): Promise<Position[]> {
    return await this.withToken(async (token) => {
      
      const appId = this.appId(token);
      const url = this.modern(token)
        ? await this.otpSocketUrl(token)
        : `wss://ws.derivws.com/websockets/v3?app_id=${appId}`;
      const [res] = await this.wsSequence(
        url,
        () => [{ request: { portfolio: 1 }, expect: 'portfolio' }],
        this.modern(token) ? undefined : token,
      );

      return (res?.portfolio?.contracts || []).map((c: any) => ({
        positionId: String(c.contract_id),
        symbol: String(c.symbol),
        side: /CALL/i.test(String(c.contract_type)) ? 'BUY' : 'SELL',
        quantity: Number(c.buy_price || 0),
        entryPrice: Number(c.buy_price || 0),
        currentPrice: null,
        unrealizedPnl: null,
        stopLoss: null,
        takeProfit: null,
        openedAt: c.date_start ? new Date(c.date_start * 1000).toISOString() : null,
        raw: c,
      })) as Position[];
    });
  }

  async placeOrder(order: OrderRequest): Promise<OrderResult> {
    const symbol = toDerivSymbol(order.symbol);
    const amount = Math.max(0.35, Number(order.quantity) || 1);
    const duration = Math.max(1, Math.round(order.durationMinutes || 5));
    const contractType = order.side === 'BUY' ? 'CALL' : 'PUT';

    return await this.withToken(async (token) => {
      if (this.modern(token)) {
        const wsUrl = await this.otpSocketUrl(token);
        const results = await this.wsSequence(wsUrl, () => [
          {
            request: {
              proposal: 1, amount, basis: 'stake', contract_type: contractType,
              currency: 'USD', duration, duration_unit: 'm', underlying_symbol: symbol, req_id: 1,
            },
            expect: 'proposal',
          },
          {
            request: Object.assign({}, { buy: '', price: amount, req_id: 2 }, {
              __fromPrevious: (prev: any) => ({ buy: prev.proposal.id, price: amount, req_id: 2 }),
            }),
            expect: 'buy',
          },
        ]);
        const buy = results[results.length - 1]?.buy || {};
        return {
          brokerOrderId: String(buy.contract_id || buy.transaction_id || Date.now()),
          status: 'filled', symbol, side: order.side,
          filledQuantity: amount, price: Number(buy.buy_price ?? null) || null,
          mode: 'deriv-v1', raw: buy,
        } as OrderResult;
      }

      const appId = this.appId(token);
      const results = await this.wsSequence(
        `wss://ws.derivws.com/websockets/v3?app_id=${appId}`,
        (auth) => [{
          request: {
            buy: 1, price: amount,
            parameters: {
              amount, basis: 'stake', contract_type: contractType,
              currency: auth?.currency || 'USD', duration, duration_unit: 'm', symbol,
            },
          },
          expect: 'buy',
        }],
        token,
      );
      const buy = results[results.length - 1]?.buy || {};
      return {
        brokerOrderId: String(buy.contract_id || Date.now()),
        status: 'filled', symbol, side: order.side,
        filledQuantity: amount, price: Number(buy.buy_price ?? null) || null,
        mode: 'deriv', raw: buy,
      } as OrderResult;
    });
  }

  async closePosition(positionId: string): Promise<OrderResult> {
    return await this.withToken(async (token) => {
      const appId = this.appId(token);
      const url = this.modern(token)
        ? await this.otpSocketUrl(token)
        : `wss://ws.derivws.com/websockets/v3?app_id=${appId}`;
      const results = await this.wsSequence(
        url,
        () => [{ request: { sell: Number(positionId), price: 0 }, expect: 'sell' }],
        this.modern(token) ? undefined : token,
      );

      const sell = results[results.length - 1]?.sell || {};
      return {
        brokerOrderId: String(sell.transaction_id || positionId),
        status: 'filled', symbol: '', side: 'SELL',
        filledQuantity: Number(sell.sold_for || 0), price: Number(sell.sold_for || 0),
        mode: 'deriv', raw: sell,
      } as OrderResult;
    });
  }
}
