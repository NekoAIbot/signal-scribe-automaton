import { describe, expect, it } from 'vitest';
import { selectMainBrokerAccount, type BrokerExecutionAccount } from '@/services/brokerAccountSelection';

const account = (overrides: Partial<BrokerExecutionAccount>): BrokerExecutionAccount => ({
  id: overrides.id || 'account-id',
  account_name: overrides.account_name || 'Account',
  account_type: overrides.account_type || 'demo',
  broker_type: overrides.broker_type || 'mt5',
  is_active: overrides.is_active ?? true,
  created_at: overrides.created_at || new Date().toISOString(),
  ...overrides,
});

describe('selectMainBrokerAccount', () => {
  it('routes automatic execution to the active live account first', () => {
    const selected = selectMainBrokerAccount([
      account({ id: 'demo', account_name: 'Demo', account_type: 'demo' }),
      account({ id: 'live', account_name: 'Main Live', account_type: 'live' }),
    ]);

    expect(selected?.id).toBe('live');
  });

  it('ignores inactive accounts when selecting the main execution account', () => {
    const selected = selectMainBrokerAccount([
      account({ id: 'inactive-live', account_type: 'live', is_active: false }),
      account({ id: 'active-demo', account_type: 'demo', is_active: true }),
    ]);

    expect(selected?.id).toBe('active-demo');
  });
});