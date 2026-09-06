// Universal Broker SDK — OAuth provider layer.
// OAuth is a first-class SDK capability: providers declare how to build an
// authorization URL, how to read the callback, and how sessions are renewed.

import { BrokerError } from './errors.ts';

export type OAuthRenewalStrategy = 'refresh_token' | 'reauthorize' | 'never_expires';

/** A trading account discovered after the token exchange. */
export interface OAuthLinkedAccount {
  accountId: string;
  token: string;
  currency: string | null;
  environment: 'live' | 'demo';
  balance?: number | null;
  status?: string | null;
  group?: string | null;
}

export interface OAuthTokenSet {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  scopes: string[];
}

export interface OAuthProviderConfig {
  broker: string;
  displayName: string;
  /** Env var holding the registered OAuth application id/client id. */
  appIdEnv: string[];
  authorizeBase: string;
  tokenUrl: string;
  renewal: OAuthRenewalStrategy;
  scopes: string[];
  /** Documentation link used in error hints. */
  setupUrl: string;
  buildAuthorizeUrl(input: {
    appId: string; redirectUri: string; state: string;
    codeChallenge?: string | null; codeChallengeMethod?: string | null;
  }): string;
  /** Pull the authorization code (or a provider error) out of the callback query. */
  readCallbackCode(params: Record<string, string>): string;
  exchangeCode(input: {
    appId: string; code: string; redirectUri: string; codeVerifier: string;
  }): Promise<OAuthTokenSet>;
  /** List every trading account the granted token can reach. */
  discoverAccounts(input: { appId: string; tokens: OAuthTokenSet }): Promise<OAuthLinkedAccount[]>;
}

/**
 * Deriv's current API (developers.deriv.com): alphanumeric App IDs, OAuth 2.0
 * Authorization Code + PKCE at auth.deriv.com, then REST account discovery with
 * `Deriv-App-ID` + `Authorization: Bearer`.
 */
export const DERIV_OAUTH: OAuthProviderConfig = {
  broker: 'deriv',
  displayName: 'Deriv',
  appIdEnv: ['DERIV_OAUTH_APP_ID', 'DERIV_APP_ID'],
  authorizeBase: 'https://auth.deriv.com/oauth2/auth',
  tokenUrl: 'https://auth.deriv.com/oauth2/token',
  renewal: 'refresh_token',
  scopes: ['trade', 'account_manage'],
  setupUrl: 'https://developers.deriv.com/docs/account-setup',

  buildAuthorizeUrl({ appId, redirectUri, state, codeChallenge, codeChallengeMethod }) {
    const url = new URL(DERIV_OAUTH.authorizeBase);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', appId);
    // Deriv matches the redirect URI exactly against the registered value.
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('scope', DERIV_OAUTH.scopes.join(' '));
    url.searchParams.set('state', state);
    if (codeChallenge) {
      url.searchParams.set('code_challenge', codeChallenge);
      url.searchParams.set('code_challenge_method', codeChallengeMethod || 'S256');
    }
    return url.toString();
  },

  readCallbackCode(params) {
    const code = String(params.code || '').trim();
    if (!code) {
      throw new BrokerError({
        broker: 'deriv',
        code: 'AUTH_FAILED',
        message: 'Deriv did not return an authorization code.',
        hint: 'Start the connection again and approve the requested permissions.',
      });
    }
    return code;
  },

  async exchangeCode({ appId, code, redirectUri, codeVerifier }) {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: appId,
      code,
      redirect_uri: redirectUri,
    });
    if (codeVerifier) body.set('code_verifier', codeVerifier);

    const res = await fetch(DERIV_OAUTH.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Deriv-App-ID': appId },
      body: body.toString(),
    });
    const text = await res.text();
    let payload: any = null;
    try { payload = JSON.parse(text); } catch { /* non-JSON error body */ }

    if (!res.ok || !payload?.access_token) {
      const reason = payload?.error_description || payload?.error || text.slice(0, 300);
      throw new BrokerError({
        broker: 'deriv',
        code: 'OAUTH_EXCHANGE_FAILED',
        message: `Deriv rejected the sign-in: ${reason || res.status}`,
        hint: /redirect/i.test(String(reason))
          ? 'The callback URL must match the redirect URL registered on your Deriv application exactly.'
          : 'Start the connection again — the authorization code is single-use and expires quickly.',
        raw: payload ?? text,
      });
    }

    const expiresIn = Number(payload.expires_in || 0);
    return {
      accessToken: String(payload.access_token),
      refreshToken: payload.refresh_token ? String(payload.refresh_token) : null,
      expiresAt: expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
      scopes: String(payload.scope || DERIV_OAUTH.scopes.join(' ')).split(/[\s,]+/).filter(Boolean),
    };
  },

  async discoverAccounts({ appId, tokens }) {
    const res = await fetch('https://api.derivws.com/trading/v1/options/accounts', {
      method: 'GET',
      headers: { 'Deriv-App-ID': appId, Authorization: `Bearer ${tokens.accessToken}` },
    });
    const text = await res.text();
    let payload: any = null;
    try { payload = JSON.parse(text); } catch { /* ignore */ }

    if (!res.ok) {
      const reason = payload?.errors?.[0]?.message || payload?.message || text.slice(0, 300);
      throw new BrokerError({
        broker: 'deriv',
        code: res.status === 403 ? 'PERMISSION_DENIED' : 'AUTH_FAILED',
        message: `Deriv could not list your trading accounts: ${reason || res.status}`,
        hint: res.status === 403
          ? 'Re-connect and approve the "trade" permission.'
          : 'Start the connection again.',
      });
    }

    const rows = Array.isArray(payload?.data) ? payload.data : [];
    return rows.map((a: any) => ({
      accountId: String(a.account_id),
      token: tokens.accessToken,
      currency: a.currency ? String(a.currency) : null,
      environment: String(a.account_type || '').toLowerCase() === 'real' ? 'live' : 'demo',
      balance: a.balance == null ? null : Number(a.balance),
      status: a.status ? String(a.status) : null,
      group: a.group ? String(a.group) : null,
    })) as OAuthLinkedAccount[];
  },
};


export const OAUTH_PROVIDERS: Record<string, OAuthProviderConfig> = {
  deriv: DERIV_OAUTH,
};

export function getOAuthProvider(broker: string): OAuthProviderConfig | null {
  return OAUTH_PROVIDERS[String(broker || '').toLowerCase()] || null;
}

export function supportsOAuth(broker: string): boolean {
  return !!getOAuthProvider(broker);
}

export function resolveOAuthAppId(provider: OAuthProviderConfig): string {
  for (const key of provider.appIdEnv) {
    const value = (Deno.env.get(key) || '').trim();
    if (value) return value;
  }
  throw new BrokerError({
    broker: provider.broker,
    code: 'CONFIG_MISSING',
    message: `${provider.displayName} OAuth is not configured yet.`,
    hint: `Register an application at ${provider.setupUrl} with this app's callback URL, then store its App ID as ${provider.appIdEnv[0]}.`,
  });
}


export function buildAuthorizeUrl(
  broker: string,
  redirectUri: string,
  state: string,
  codeChallenge?: string | null,
): string {
  const provider = requireProvider(broker);
  const appId = resolveOAuthAppId(provider);
  return provider.buildAuthorizeUrl({
    appId,
    redirectUri,
    state,
    codeChallenge: codeChallenge || null,
    codeChallengeMethod: codeChallenge ? 'S256' : null,
  });
}

function requireProvider(broker: string): OAuthProviderConfig {
  const provider = getOAuthProvider(broker);
  if (!provider) {
    throw new BrokerError({
      broker,
      code: 'NOT_SUPPORTED',
      message: `${broker} does not support OAuth.`,
      hint: 'Connect this broker with an API key instead.',
    });
  }
  return provider;
}

/** Surface a provider-side denial before we try to redeem anything. */
export function assertCallbackOk(broker: string, params: Record<string, string>): void {
  const provider = requireProvider(broker);
  const denied = params.error || params.error_description;
  if (!denied) return;
  const lower = String(denied).toLowerCase();
  throw new BrokerError({
    broker,
    code: /denied|access_denied|cancel/.test(lower) ? 'PERMISSION_DENIED' : 'AUTH_FAILED',
    message: /denied|access_denied|cancel/.test(lower)
      ? `Authorization was denied on ${provider.displayName}.`
      : `${provider.displayName} rejected the authorization: ${denied}`,
    hint: 'Start the connection again and approve the requested permissions.',
  });
}

/**
 * Full server-side callback redemption: validate, exchange the code for tokens,
 * then list every trading account the grant covers.
 */
export async function redeemOAuthCallback(input: {
  broker: string;
  params: Record<string, string>;
  redirectUri: string;
  codeVerifier: string;
}): Promise<{ tokens: OAuthTokenSet; accounts: OAuthLinkedAccount[] }> {
  const provider = requireProvider(input.broker);
  assertCallbackOk(input.broker, input.params);

  const appId = resolveOAuthAppId(provider);
  const code = provider.readCallbackCode(input.params);
  const tokens = await provider.exchangeCode({
    appId,
    code,
    redirectUri: input.redirectUri,
    codeVerifier: input.codeVerifier,
  });

  const accounts = await provider.discoverAccounts({ appId, tokens });
  if (!accounts.length) {
    throw new BrokerError({
      broker: input.broker,
      code: 'AUTH_FAILED',
      message: `${provider.displayName} did not return any trading accounts.`,
      hint: 'Open your broker account and make sure at least one trading account is active, then retry.',
    });
  }
  return { tokens, accounts };
}

