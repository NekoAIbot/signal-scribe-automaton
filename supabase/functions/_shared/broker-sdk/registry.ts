// Universal Broker SDK — adapter registry.
// This is the ONLY place that knows which concrete adapter serves a broker id,
// and the single source of truth for broker capabilities (auth + trading).

import type { BrokerAdapter, BrokerAuthCapabilities, BrokerCredentials, BrokerId, StandardBrokerAdapter } from './types.ts';
import { DEFAULT_AUTH_CAPABILITIES } from './types.ts';
import { BrokerError } from './errors.ts';
import { standardizeAdapter } from './standard.ts';
import { BinanceAdapter } from './adapters/binance.ts';
import { DerivAdapter } from './adapters/deriv.ts';
import { OandaAdapter } from './adapters/oanda.ts';
import { CapitalAdapter } from './adapters/capital.ts';

export interface BrokerDescriptor {
  id: BrokerId;
  displayName: string;
  supported: boolean;
  authKind: 'api_key_secret' | 'token' | 'token_account' | 'key_identifier_password' | 'oauth';
  assetClasses: string[];
  requiredFields: string[];
  optionalFields: string[];
  requiredScopes: string[];
  environments: string[];
  auth: BrokerAuthCapabilities;
  notes?: string;
}

export const BROKER_CATALOG: BrokerDescriptor[] = [
  {
    id: 'deriv', displayName: 'Deriv', supported: true, authKind: 'oauth',
    assetClasses: ['forex', 'crypto', 'metals', 'indices', 'synthetic'],
    requiredFields: [], optionalFields: ['api_token', 'account_id', 'deriv_app_id'],
    requiredScopes: ['read', 'trade'], environments: ['demo', 'live'],
    auth: {
      ...DEFAULT_AUTH_CAPABILITIES,
      supportsOAuth: true,
      supportsApiKey: true,
      supportsPAT: true,
      supportsCopyTrading: true,
      supportsStreaming: true,
      defaultAuthMethod: 'oauth',
    },
    notes: 'Connect with Deriv OAuth — no manual token needed. API tokens (including pat_… with an App ID) remain available as an advanced option.',
  },

  {
    id: 'binance', displayName: 'Binance Spot', supported: true, authKind: 'api_key_secret',
    assetClasses: ['crypto'],
    requiredFields: ['api_token', 'api_secret'], optionalFields: [],
    requiredScopes: ['Enable Reading', 'Enable Spot & Margin Trading'], environments: ['testnet', 'live'],
    notes: 'Live keys must be stored as Live. Do not enable IP allow-listing.',
  },
  {
    id: 'oanda', displayName: 'OANDA', supported: true, authKind: 'token_account',
    assetClasses: ['forex', 'metals', 'indices', 'commodities'],
    requiredFields: ['api_token'], optionalFields: ['account_id'],
    requiredScopes: ['Trade'], environments: ['practice', 'live'],
  },
  {
    id: 'capital', displayName: 'Capital.com', supported: true, authKind: 'key_identifier_password',
    assetClasses: ['forex', 'crypto', 'metals', 'indices', 'commodities', 'stocks'],
    requiredFields: ['api_token', 'account_id', 'password'], optionalFields: [],
    requiredScopes: ['Trading enabled API key'], environments: ['demo', 'live'],
  },
  {
    id: 'bybit', displayName: 'Bybit', supported: false, authKind: 'api_key_secret',
    assetClasses: ['crypto'], requiredFields: ['api_token', 'api_secret'], optionalFields: [],
    requiredScopes: ['Trade'], environments: ['testnet', 'live'], notes: 'Adapter planned.',
  },
  {
    id: 'alpaca', displayName: 'Alpaca', supported: false, authKind: 'api_key_secret',
    assetClasses: ['stocks', 'crypto'], requiredFields: ['api_token', 'api_secret'], optionalFields: [],
    requiredScopes: ['Trading'], environments: ['sandbox', 'live'], notes: 'Adapter planned.',
  },
  {
    id: 'ctrader', displayName: 'cTrader', supported: false, authKind: 'oauth',
    assetClasses: ['forex', 'metals', 'indices'], requiredFields: [], optionalFields: [],
    requiredScopes: ['trading'], environments: ['demo', 'live'], notes: 'OAuth adapter planned.',
  },
  {
    id: 'mt5bridge', displayName: 'MetaTrader 5 Bridge', supported: false, authKind: 'token',
    assetClasses: ['forex', 'metals', 'indices', 'commodities'],
    requiredFields: ['api_token'], optionalFields: ['server'],
    requiredScopes: [], environments: ['demo', 'live'],
    notes: 'Requires a self-hosted bridge; disabled for cloud execution.',
  },
];

export function describeBroker(brokerType: string): BrokerDescriptor | null {
  const id = String(brokerType || '').toLowerCase();
  return BROKER_CATALOG.find(b => b.id === id) || null;
}

export function isSupportedBroker(brokerType: string): boolean {
  return describeBroker(brokerType)?.supported === true;
}

export function createBrokerAdapter(credentials: BrokerCredentials): BrokerAdapter {
  const brokerType = String(credentials.broker_type || '').toLowerCase();
  switch (brokerType) {
    case 'binance': return new BinanceAdapter(credentials);
    case 'deriv': return new DerivAdapter(credentials);
    case 'oanda': return new OandaAdapter(credentials);
    case 'capital': return new CapitalAdapter(credentials);
    case 'mt4':
    case 'mt5':
    case 'metatrader':
    case 'mt5bridge':
      throw new BrokerError({
        broker: brokerType || 'unknown', code: 'NOT_SUPPORTED',
        message: 'MetaTrader execution is disabled on cloud execution.',
        hint: 'Connect a Deriv, Binance, OANDA, or Capital.com account in Settings → Brokers.',
      });
    default:
      throw new BrokerError({
        broker: brokerType || 'unknown', code: 'NOT_SUPPORTED',
        message: `Broker "${brokerType || 'unknown'}" is not supported yet.`,
        hint: 'Supported brokers: Deriv, Binance, OANDA, Capital.com.',
      });
  }
}
