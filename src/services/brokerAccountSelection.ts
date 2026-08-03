import { supabase } from '@/integrations/supabase/client';

export interface BrokerExecutionAccount {
  id: string;
  account_name: string;
  login?: string | null;
  server?: string | null;
  account_type?: string | null;
  broker_type?: string | null;
  is_active: boolean;
  created_at?: string | null;
  is_default?: boolean | null;
}

const accountPriority = (account: BrokerExecutionAccount) => {
  const type = String(account.account_type || '').toLowerCase();
  if (type === 'live') return 0;
  if (type === 'prop') return 1;
  return 2;
};

export function selectMainBrokerAccount<T extends BrokerExecutionAccount>(accounts: T[]): T | null {
  const activeAccounts = accounts.filter(account => account.is_active);
  if (activeAccounts.length === 0) return null;

  // An explicitly chosen trading account always wins.
  const explicitDefault = activeAccounts.find(account => account.is_default);
  if (explicitDefault) return explicitDefault;

  return activeAccounts
    .map((account, index) => ({ account, index }))
    .sort((a, b) => accountPriority(a.account) - accountPriority(b.account) || a.index - b.index)[0]
    .account;
}

export async function fetchMainBrokerAccount(): Promise<BrokerExecutionAccount | null> {
  const { data, error } = await supabase
    .from('broker_credentials')
    .select('id, account_name, login, server, account_type, broker_type, is_active, created_at, is_default')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return selectMainBrokerAccount(data || []);
}

export function formatBrokerAccountName(account: BrokerExecutionAccount) {
  const accountType = account.account_type ? ` (${account.account_type})` : '';
  return `${account.account_name}${accountType}`;
}