// Universal Broker SDK — standardized adapter surface.
// Every adapter created through the registry exposes the same method set:
// connect, disconnect, refresh, validate, health, permissions,
// supportedAssets, supportedOrderTypes, supportedTimeframes.

import type {
  AuthMethod, BrokerAdapter, BrokerCredentials, HealthStatus, PermissionReport,
  SessionStatus, StandardBrokerAdapter,
} from './types.ts';
import { asBrokerError } from './errors.ts';
import { getOAuthProvider } from './oauth.ts';

const ASSETS_BY_BROKER: Record<string, string[]> = {
  deriv: ['forex', 'crypto', 'metals', 'indices', 'synthetic'],
  binance: ['crypto'],
  oanda: ['forex', 'metals', 'indices', 'commodities'],
  capital: ['forex', 'crypto', 'metals', 'indices', 'commodities', 'stocks'],
};

const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];

export function resolveAuthMethod(cred: BrokerCredentials): AuthMethod {
  const declared = String((cred as any).auth_method || '').toLowerCase();
  if (declared === 'oauth' || declared === 'api_key' || declared === 'pat' || declared === 'login_password') {
    return declared as AuthMethod;
  }
  const token = String(cred.api_token || '');
  if (token.startsWith('pat_')) return 'pat';
  if (cred.api_secret) return 'api_key';
  return 'api_key';
}

/** Attach SDK-default implementations for any method the adapter does not define. */
export function standardizeAdapter(
  adapter: BrokerAdapter,
  cred: BrokerCredentials,
): StandardBrokerAdapter {
  const std = adapter as StandardBrokerAdapter;
  const authMethod = resolveAuthMethod(cred);
  const provider = getOAuthProvider(adapter.id);

  if (typeof std.health !== 'function') {
    std.health = () => adapter.healthCheck();
  }

  if (typeof std.validate !== 'function') {
    std.validate = async (): Promise<SessionStatus> => {
      try {
        await adapter.getAccountInfo();
        return {
          valid: true,
          authMethod,
          expiresAt: (cred as any).oauth_expires_at ?? null,
          renewable: provider ? provider.renewal !== 'never_expires' : false,
          message: `${adapter.displayName} session is valid.`,
        };
      } catch (error) {
        const err = asBrokerError(adapter.id, error);
        return {
          valid: false,
          authMethod,
          expiresAt: (cred as any).oauth_expires_at ?? null,
          renewable: err.code === 'AUTH_EXPIRED' && !!provider,
          message: err.message,
        };
      }
    };
  }

  if (typeof std.refresh !== 'function') {
    std.refresh = async (): Promise<SessionStatus> => {
      // Providers whose tokens never expire only need a liveness re-validation.
      const status = await std.validate();
      if (status.valid) return status;
      if (provider && provider.renewal === 'never_expires') {
        return {
          ...status,
          renewable: false,
          message: `${adapter.displayName} session was revoked. Reconnect with ${provider.displayName} to restore access.`,
        };
      }
      return status;
    };
  }

  if (typeof std.permissions !== 'function') {
    std.permissions = async (): Promise<PermissionReport> => {
      try {
        const info = await adapter.getAccountInfo();
        const scopes = (info.raw as any)?.scopes;
        const granted = Array.isArray(scopes) ? scopes.map(String) : ['read'];
        const canTrade = info.tradingPermitted && (!Array.isArray(scopes) || scopes.includes('trade'));
        return {
          granted: canTrade && !granted.includes('trade') ? [...granted, 'trade'] : granted,
          missing: canTrade ? [] : ['trade'],
          canTrade,
          canRead: true,
        };
      } catch {
        return { granted: [], missing: ['read', 'trade'], canTrade: false, canRead: false };
      }
    };
  }

  if (typeof std.supportedAssets !== 'function') {
    std.supportedAssets = () => ASSETS_BY_BROKER[adapter.id] || [];
  }

  if (typeof std.supportedOrderTypes !== 'function') {
    std.supportedOrderTypes = () => {
      const caps = adapter.capabilities;
      const out: string[] = [];
      if (caps.marketOrders) out.push('MARKET');
      if (caps.limitOrders) out.push('LIMIT');
      if (caps.stopOrders) out.push('STOP');
      return out;
    };
  }

  if (typeof std.supportedTimeframes !== 'function') {
    std.supportedTimeframes = () => TIMEFRAMES;
  }

  return std;
}

export type { HealthStatus };
