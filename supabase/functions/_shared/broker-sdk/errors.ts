// Universal Broker SDK — unified error model.
// Every broker failure is translated into one of these codes so the UI never
// shows a raw provider payload without a human-readable explanation.

export type BrokerErrorCode =
  | 'AUTH_FAILED'
  | 'AUTH_EXPIRED'
  | 'PERMISSION_DENIED'
  | 'IP_NOT_ALLOWED'
  | 'INVALID_SYMBOL'
  | 'SYMBOL_NOT_TRADABLE'
  | 'MARKET_CLOSED'
  | 'INVALID_QUANTITY'
  | 'INSUFFICIENT_FUNDS'
  | 'RISK_BLOCKED'
  | 'ORDER_REJECTED'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'ENVIRONMENT_MISMATCH'
  | 'NOT_SUPPORTED'
  | 'CONFIG_MISSING'
  | 'OAUTH_DENIED'
  | 'OAUTH_CALLBACK_FAILED'
  | 'OAUTH_EXCHANGE_FAILED'
  | 'OAUTH_STATE_INVALID'
  | 'INVALID_REDIRECT_URI'
  | 'REFRESH_EXPIRED'
  | 'SESSION_REVOKED'
  | 'BROKER_UNAVAILABLE'
  | 'UNKNOWN';

/** Human recovery actions surfaced with every structured broker error. */
export const RECOVERY_ACTIONS: Record<string, string> = {
  AUTH_FAILED: 'Reconnect this broker account.',
  AUTH_EXPIRED: 'Reconnect this broker account to renew the session.',
  PERMISSION_DENIED: 'Grant the missing trading permission and reconnect.',
  OAUTH_DENIED: 'Start the connection again and approve access on the broker consent screen.',
  OAUTH_CALLBACK_FAILED: 'Start the connection again from Settings → Brokers.',
  OAUTH_EXCHANGE_FAILED: 'Retry the connection; if it keeps failing, re-check the broker application redirect URL.',
  OAUTH_STATE_INVALID: 'The connection link expired. Start the connection again.',
  INVALID_REDIRECT_URI: 'Register this app callback URL on the broker application, then retry.',
  REFRESH_EXPIRED: 'Reconnect the broker account — the refresh token is no longer valid.',
  SESSION_REVOKED: 'Access was revoked at the broker. Reconnect to restore trading.',
  BROKER_UNAVAILABLE: 'The broker is temporarily unavailable. Retry in a few minutes.',
  TIMEOUT: 'Retry — the broker did not respond in time.',
  NETWORK_ERROR: 'Check connectivity and retry.',
  CONFIG_MISSING: 'Complete the broker configuration and retry.',
};

export function recoveryAction(code: string): string {
  return RECOVERY_ACTIONS[code] || 'Retry the action; contact support if the problem persists.';
}

export interface BrokerErrorOptions {
  broker: string;
  code: BrokerErrorCode;
  message: string;
  hint?: string;
  retryable?: boolean;
  httpStatus?: number;
  raw?: unknown;
}

export class BrokerError extends Error {
  readonly broker: string;
  readonly code: BrokerErrorCode;
  readonly hint?: string;
  readonly retryable: boolean;
  readonly httpStatus?: number;
  readonly raw?: unknown;

  constructor(opts: BrokerErrorOptions) {
    super(opts.hint ? `${opts.message} — ${opts.hint}` : opts.message);
    this.name = 'BrokerError';
    this.broker = opts.broker;
    this.code = opts.code;
    this.hint = opts.hint;
    this.retryable = opts.retryable ?? false;
    this.httpStatus = opts.httpStatus;
    this.raw = opts.raw;
  }

  toJSON() {
    return {
      broker: this.broker,
      code: this.code,
      message: this.message,
      hint: this.hint,
      retryable: this.retryable,
      httpStatus: this.httpStatus,
      recovery: recoveryAction(this.code),
    };
  }
}

const RETRYABLE: BrokerErrorCode[] = ['RATE_LIMITED', 'TIMEOUT', 'NETWORK_ERROR', 'BROKER_UNAVAILABLE'];

/** Best-effort translation of an arbitrary provider payload into a BrokerError. */
export function translateError(
  broker: string,
  status: number,
  body: string,
  fallback: BrokerErrorCode = 'ORDER_REJECTED',
): BrokerError {
  const text = String(body || '').slice(0, 800);
  const lower = text.toLowerCase();

  let code: BrokerErrorCode = fallback;
  let hint: string | undefined;

  if (status === 401 || /invalid.?token|unauthor|invalidtoken|api-key|apikey.*invalid|signature/i.test(lower)) {
    code = 'AUTH_FAILED';
    hint = 'Re-enter the API credentials for this account and make sure they belong to the selected environment.';
  } else if (status === 403 || /permission|not allowed|forbidden|scope/i.test(lower)) {
    code = 'PERMISSION_DENIED';
    hint = 'The key is valid but lacks trading permission. Enable trading scope on the broker key.';
  } else if (/ip( address)? (is )?not|whitelist/i.test(lower)) {
    code = 'IP_NOT_ALLOWED';
    hint = 'Remove the IP allow-list on the broker key — cloud execution uses rotating IPs.';
  } else if (status === 429 || /rate limit|too many requests/i.test(lower)) {
    code = 'RATE_LIMITED';
  } else if (/insufficient|not enough (balance|funds)|-2019|margin/i.test(lower)) {
    code = 'INSUFFICIENT_FUNDS';
  } else if (/market is closed|market closed|trading is closed|not open/i.test(lower)) {
    code = 'MARKET_CLOSED';
  } else if (/invalid symbol|unknown symbol|instrument.*(invalid|unknown)|-1121/i.test(lower)) {
    code = 'INVALID_SYMBOL';
  } else if (/quantity|lot size|min.?notional|-1013|size/i.test(lower)) {
    code = 'INVALID_QUANTITY';
  } else if (/timeout|timed out/i.test(lower)) {
    code = 'TIMEOUT';
  } else if (status === 0 || /network|fetch failed|econn/i.test(lower)) {
    code = 'NETWORK_ERROR';
  }

  return new BrokerError({
    broker,
    code,
    message: text || `HTTP ${status}`,
    hint,
    httpStatus: status,
    retryable: RETRYABLE.includes(code),
    raw: body,
  });
}

export function asBrokerError(broker: string, error: unknown): BrokerError {
  if (error instanceof BrokerError) return error;
  const message = error instanceof Error ? error.message : String(error);
  if (/timeout/i.test(message)) {
    return new BrokerError({ broker, code: 'TIMEOUT', message, retryable: true });
  }
  return new BrokerError({ broker, code: 'UNKNOWN', message });
}
