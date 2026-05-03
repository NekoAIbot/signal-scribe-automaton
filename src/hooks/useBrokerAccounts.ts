import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { selectMainBrokerAccount } from '@/services/brokerAccountSelection';

export interface BrokerAccount {
  id: string;
  account_name: string;
  login: string;
  server: string;
  account_type: string;
  broker_type: string;
  is_active: boolean;
  created_at: string;
}

// Global state for cross-component reactivity
let globalAccounts: BrokerAccount[] = [];
const listeners = new Set<(accounts: BrokerAccount[]) => void>();
const notify = () => listeners.forEach(fn => fn(globalAccounts));

export function useBrokerAccounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<BrokerAccount[]>(globalAccounts);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const listener = (accs: BrokerAccount[]) => setAccounts(accs);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  const fetchAccounts = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('broker_credentials')
        .select('id, account_name, login, server, account_type, broker_type, is_active, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      globalAccounts = data || [];
      setAccounts(globalAccounts);
      notify();
    } catch (error) {
      console.error('Error fetching broker accounts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const activeAccounts = accounts.filter(a => a.is_active);
  const mainAccount = selectMainBrokerAccount(accounts);
  const hasAccounts = accounts.length > 0;

  return { accounts, activeAccounts, mainAccount, hasAccounts, isLoading, refetch: fetchAccounts };
}
