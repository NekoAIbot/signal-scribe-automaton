// Universal Broker SDK — OAuth provider layer.
// OAuth is a first-class SDK capability: providers declare how to build an
// authorization URL, how to read the callback, and how sessions are renewed.

import { BrokerError } from './errors.ts';

export type OAuthRenewalStrategy = 'refresh_token' | 'reauthorize' | 'never_expires';

export interface OAuthLinkedAccount {
  accountId: string;
  token: string;
  currency: string | null;
  environment: 'live' | 'demo';
}

export interface OAuthProviderConfig {
  broker: string;
  displayName: string;
  /** Env var holding the registered OAuth application id/client id. */
  appIdEnv: string[];
  authorizeBase: string;
  renewal: OAuthRenewalStrategy;
  scopes: string[];
  /** Documentation link used in error hints. */
  setupUrl: string;
  buildAuthorizeUrl(input: { appId: string; redirectUri: string; state: string }): string;
  parseCallback(params: Record<string, string>): OAuthLinkedAccount[];
}

export const DERIV_OAUTH: OAuthProviderConfig = {
  broker: 'deriv',
  displayName: 'Deriv',
  appIdEnv: ['DERIV_OAUTH_APP_ID', 'DERIV_APP_ID'],
  authorizeBase: 'https://oauth.deriv.com/oauth2/authorize',
  renewal: 'never_expires',
  scopes: ['read', 'trade', 'trading_information'],
  setupUrl: 'https://api.deriv.com/dashboard',

  buildAuthorizeUrl({ appId, redirectUri, state }) {
    const url = new URL(DERIV_OAUTH.authorizeBase);
    url.searchParams.set('app_id', appId);
    url.searchParams.set('l', 'EN');
    url.searchParams.set('brand', 'deriv');
    // Deriv appends acctN/tokenN/curN to the redirect URI and preserves our own params.
    const redirect = new URL(redirectUri);
    redirect.searchParams.set('state', state);
    redirect.searchParams.set('broker', 'deriv');
    url.searchParams.set('redirect_uri', redirect.toString());
    return url.toString();
  },

  parseCallback(params) {
    const accounts: OAuthLinkedAccount[] = [];
    for (let i = 1; i <= 20; i++) {
      const accountId = params[`acct${i}`];
      const token = params[`token${i}`];
      if (!accountId || !token) continue;
      accounts.push({
        accountId,
        token,
        currency: params[`cur${i}`] || null,
        // Deriv virtual accounts always start with VRT/VRW.
        environment: /^vr/i.test(accountId) ? 'demo' : 'live',
      });
    }
    return accounts;
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
    if (!value) continue;
    // Deriv application ids are numeric. A non-numeric value is almost always an
    // API token pasted by mistake and would make the authorize URL fail silently.
    if (provider.broker === 'deriv' && !/^\d+$/.test(value)) {
      throw new BrokerError({
        broker: provider.broker,
        code: 'CONFIG_MISSING',
        message: `The saved ${provider.displayName} App ID is not valid.`,
        hint: `${provider.displayName} App IDs are numbers (for example 12345). Copy the numeric App ID from ${provider.setupUrl} and save it as ${provider.appIdEnv[0]}.`,
      });
    }
    return value;
  }
  throw new BrokerError({
    broker: provider.broker,
    code: 'CONFIG_MISSING',
    message: `${provider.displayName} OAuth is not configured yet.`,
    hint: `Register an application at ${provider.setupUrl} with this app's callback URL, then store its App ID as ${provider.appIdEnv[0]}.`,
  });
}


export function buildAuthorizeUrl(broker: string, redirectUri: string, state: string): string {
  const provider = getOAuthProvider(broker);
  if (!provider) {
    throw new BrokerError({
      broker,
      code: 'NOT_SUPPORTED',
      message: `${broker} does not support OAuth.`,
      hint: 'Connect this broker with an API key instead.',
    });
  }
  const appId = resolveOAuthAppId(provider);
  return provider.buildAuthorizeUrl({ appId, redirectUri, state });
}

export function parseOAuthCallback(broker: string, params: Record<string, string>): OAuthLinkedAccount[] {
  const provider = getOAuthProvider(broker);
  if (!provider) {
    throw new BrokerError({ broker, code: 'NOT_SUPPORTED', message: `${broker} does not support OAuth.` });
  }

  const denied = params.error || params.error_description;
  if (denied) {
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

  const accounts = provider.parseCallback(params);
  if (!accounts.length) {
    throw new BrokerError({
      broker,
      code: 'AUTH_FAILED',
      message: `${provider.displayName} did not return any authorized accounts.`,
      hint: 'Make sure the redirect URL registered on the broker application matches this app exactly, then retry.',
    });
  }
  return accounts;
}
