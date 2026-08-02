// Universal Broker SDK — public entry point.
// Application code imports ONLY from this module.

export * from './types.ts';
export * from './errors.ts';
export * from './symbols.ts';
export * from './validation.ts';
export * from './registry.ts';
export * from './oauth.ts';
export { standardizeAdapter, resolveAuthMethod } from './standard.ts';
export {
  encryptSecret, decryptSecret, decryptCredentials, isEncrypted, encryptionAvailable,
} from './crypto.ts';
export { credentialCandidates, cleanCredentialValue, firstCredential, httpRequest, parseJson, hmacSha256Hex } from './credentials.ts';

import type { BrokerAdapter, BrokerCredentials, OrderRequest, OrderResult } from './types.ts';
import { createBrokerAdapter } from './registry.ts';
import { asBrokerError, BrokerError } from './errors.ts';
import { decryptCredentials } from './crypto.ts';
import { assertValid, validateOrder, type ValidationResult } from './validation.ts';


export interface ExecutionOutcome {
  order: OrderResult;
  validation: ValidationResult;
  adapter: BrokerAdapter;
}

/**
 * Full guarded execution path: build adapter → load symbol rules → validate
 * locally → place order. Any failure surfaces as a BrokerError with a code.
 */
export async function executeOrder(
  credentials: BrokerCredentials,
  request: OrderRequest,
): Promise<ExecutionOutcome> {
  const resolved = await decryptCredentials(credentials as Record<string, unknown>) as BrokerCredentials;
  const adapter = createBrokerAdapter(resolved);
  try {
    let rules = null;
    try { rules = await adapter.getSymbolRules(request.symbol); }
    catch (error) {
      // Symbol-metadata lookups must never silently swallow a hard rejection.
      const err = asBrokerError(adapter.id, error);
      if (err.code === 'INVALID_SYMBOL' || err.code === 'SYMBOL_NOT_TRADABLE') throw err;
    }

    const validation = validateOrder(request, {
      broker: adapter.displayName,
      capabilities: adapter.capabilities,
      rules,
      account: null,
    });
    assertValid(validation, adapter.displayName);

    const order = await adapter.placeOrder(validation.normalizedOrder);
    return { order, validation, adapter };
  } catch (error) {
    throw error instanceof BrokerError ? error : asBrokerError(adapter.id, error);
  } finally {
    try { await adapter.disconnect(); } catch { /* noop */ }
  }
}

export async function checkBrokerHealth(credentials: BrokerCredentials) {
  const resolved = await decryptCredentials(credentials as Record<string, unknown>) as BrokerCredentials;
  const adapter = createBrokerAdapter(resolved);
  try {
    return await adapter.healthCheck();
  } finally {
    try { await adapter.disconnect(); } catch { /* noop */ }
  }

}
