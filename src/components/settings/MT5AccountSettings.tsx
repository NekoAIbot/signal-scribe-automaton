import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Trash2, Plus, Eye, EyeOff, RefreshCw, ExternalLink, CheckCircle2, XCircle, Loader2, HelpCircle, AlertTriangle, ShieldCheck, Pencil, Wifi, WifiOff } from "lucide-react";
import { TRADING_PURPOSES, getBrokerDefinition, isOAuthDefault, type DiscoveredBrokerAccount } from '@/services/broker/authFramework';

interface BrokerCredential {
  id: string;
  broker_type: string;
  account_name: string;
  login: string | null;
  server: string | null;
  account_type: string;
  environment: string | null;
  account_id: string | null;
  is_active: boolean;
  created_at: string;
  metadata: any;
}

interface BrokerDef {
  value: string;
  label: string;
  markets: string;
  needs: string[];
  tierMin: string;
  url: string;
  requiredScopes: string[];
  scopeHelp: string;
  needsAppId?: boolean;
  disabled?: boolean;
}

const BROKERS: BrokerDef[] = [
  {
    value: 'deriv', label: 'Deriv', markets: 'Crypto + Synthetics + Forex',
    needs: ['api_token'], tierMin: 'free',
    url: 'https://oauth.deriv.com/oauth2/authorize',
    requiredScopes: ['Trade', 'Account manage', 'Read account'],
    scopeHelp: 'OAuth is the default. App IDs, redirect URLs, and secrets are configured only on the backend. Personal access token is an advanced fallback.',
  },
  {
    value: 'binance', label: 'Binance', markets: 'Crypto',
    needs: ['api_token', 'api_secret'], tierMin: 'starter',
    url: 'https://www.binance.com/en/my/settings/api-management',
    requiredScopes: ['Enable Reading', 'Enable Spot & Margin & Stock Trading'],
    scopeHelp: 'Binance.com API keys must use Live environment. In Binance API Management, enable "Reading" and "Spot & Margin & Stock Trading". Disable withdrawals. If you use IP whitelist, add the server IP shown after a failed test, or disable the restriction.',
  },
  {
    value: 'bybit', label: 'Bybit', markets: 'Crypto',
    needs: ['api_token', 'api_secret'], tierMin: 'starter',
    url: 'https://www.bybit.com/app/user/api-management',
    requiredScopes: ['Read account', 'Trade'],
    scopeHelp: 'OAuth is preferred when available. API key/secret is the official fallback; use testnet keys for Testnet.',
  },
  {
    value: 'alpaca', label: 'Alpaca', markets: 'Stocks + Crypto',
    needs: ['api_token', 'api_secret'], tierMin: 'starter',
    url: 'https://app.alpaca.markets/paper/dashboard/overview',
    requiredScopes: ['Account read', 'Trading'],
    scopeHelp: 'OAuth is preferred. API key/secret is the fallback for paper or live accounts.',
  },
  {
    value: 'interactive_brokers', label: 'Interactive Brokers', markets: 'Multi-asset',
    needs: [], tierMin: 'pro',
    url: 'https://www.interactivebrokers.com/',
    requiredScopes: ['Accounts', 'Trading'],
    scopeHelp: 'Use the official Interactive Brokers authorization flow; credentials remain backend-only.',
  },
  {
    value: 'oanda', label: 'OANDA', markets: 'Forex + CFDs',
    needs: ['api_token', 'account_id'], tierMin: 'pro',
    url: 'https://www.oanda.com/account/tpa/personal_token',
    requiredScopes: ['Read account', 'Trade'],
    scopeHelp: 'Generate a personal access token with read + trade permissions and use the matching account ID (e.g. 001-001-12345-001).',
  },
  {
    value: 'capital', label: 'Capital.com', markets: 'Forex + Crypto + Stocks',
    needs: ['api_token', 'account_id', 'password'], tierMin: 'pro',
    url: 'https://capital.com/trading/api',
    requiredScopes: ['Trading API enabled', 'Custom password set'],
    scopeHelp: 'Enable the Trading API in Capital.com settings and set a separate custom password for API access — your login password will not work.',
  },
  {
    value: 'mt5', label: 'MT5', markets: 'Broker login + server',
    needs: ['login', 'password', 'server'], tierMin: 'enterprise',
    url: '',
    requiredScopes: [],
    scopeHelp: 'MetaTrader uses the official broker login/password/server flow. Existing MT5 accounts remain compatible.',
  },
];

const HEALTH_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

const normalizeCredentialInput = (value: string) => {
  let cleaned = (value || '').trim();
  if (!cleaned) return '';
  cleaned = cleaned.replace(/^['"`]+|['"`]+$/g, '').trim();
  cleaned = cleaned.replace(/^Bearer\s+/i, '').trim();
  cleaned = cleaned.replace(/^(token|api[_ -]?token|api[_ -]?key|secret|password)\s*[:=]\s*/i, '').trim();
  cleaned = cleaned.replace(/^['"`]+|['"`]+$/g, '').trim();
  return cleaned;
};

export const MT5AccountSettings = () => {
  const { user } = useAuth();
  const [credentials, setCredentials] = useState<BrokerCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeAccountId, setActiveAccountId] = useState<string>('');
  const [oauthStarting, setOauthStarting] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [defaultAssignments, setDefaultAssignments] = useState<Record<string, string>>({});
  const lastAutoTest = useRef<Record<string, number>>({});

  const testConnection = useCallback(async (id: string, silent = false) => {
    setTesting((t) => ({ ...t, [id]: true }));
    try {
      const { data, error } = await supabase.functions.invoke('test-broker-connection', { body: { credentialId: id } });
      if (error) throw error;
      if (!silent) {
        if (data?.ok) toast.success(`Connected: ${data.message}`);
        else toast.error(`Failed: ${data?.message || data?.error}`);
      }
      // Refresh credentials so persisted metadata (last_test) reloads
      await fetchCredentials();
    } catch (e: any) {
      if (!silent) toast.error(e?.message || 'Test failed');
    } finally {
      setTesting((t) => ({ ...t, [id]: false }));
      lastAutoTest.current[id] = Date.now();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [form, setForm] = useState({
    broker_type: 'deriv',
    account_name: '',
    api_token: '',
    api_secret: '',
    account_id: '',
    login: '',
    password: '',
    server: '',
    deriv_app_id: '',
    environment: 'demo',
    account_type: 'demo',
  });

  const broker = BROKERS.find(b => b.value === form.broker_type)!;
  const brokerDefinition = getBrokerDefinition(form.broker_type);
  const supportsOAuth = isOAuthDefault(form.broker_type);

  const fetchCredentials = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('broker_credentials')
        .select('id, broker_type, account_name, login, server, account_type, environment, account_id, is_active, created_at, metadata')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCredentials((data as any) || []);
    } catch (error) {
      console.error('Error fetching credentials:', error);
      toast.error('Failed to load broker accounts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchCredentials(); /* eslint-disable-next-line */ }, [user?.id]);

  useEffect(() => {
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline); };
  }, []);

  useEffect(() => {
    const active = credentials.find((c) => c.is_active);
    if (active && !activeAccountId) setActiveAccountId(active.id);
    const savedDefaults = credentials.reduce<Record<string, string>>((acc, c) => ({ ...acc, ...(c.metadata?.default_assignments || {}) }), {});
    if (Object.keys(savedDefaults).length) setDefaultAssignments(savedDefaults);
  }, [credentials, activeAccountId]);

  // Periodic background health check — re-test active credentials every 5 min
  useEffect(() => {
    if (!credentials.length) return;
    const tick = () => {
      const now = Date.now();
      credentials.filter(c => c.is_active).forEach((c) => {
        const last = lastAutoTest.current[c.id] || 0;
        const lastTestedAt = c.metadata?.last_test?.tested_at ? new Date(c.metadata.last_test.tested_at).getTime() : 0;
        const since = now - Math.max(last, lastTestedAt);
        if (since > HEALTH_CHECK_INTERVAL_MS && !testing[c.id]) {
          testConnection(c.id, true);
        }
      });
    };
    tick();
    const id = setInterval(tick, 60 * 1000); // check the queue every minute
    return () => clearInterval(id);
  }, [credentials, testing, testConnection]);

  const resetForm = () => setForm({
    broker_type: 'deriv', account_name: '', api_token: '', api_secret: '',
    account_id: '', login: '', password: '', server: '', deriv_app_id: '', environment: 'demo', account_type: 'demo',
  });

  const handleEdit = (c: BrokerCredential) => {
    setEditingId(c.id);
    setShowAddForm(true);
    setForm({
      broker_type: c.broker_type,
      account_name: c.account_name || '',
      api_token: '',
      api_secret: '',
      account_id: c.account_id || '',
      login: c.login || '',
      password: '',
      server: c.server || '',
      deriv_app_id: c.metadata?.deriv_app_id || '',
      environment: c.environment || 'demo',
      account_type: c.account_type || 'demo',
    });
  };

  const startOAuth = async () => {
    if (!supportsOAuth) return;
    setOauthStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke('broker-oauth-start', { body: { broker: form.broker_type, environment: form.environment } });
      if (error) throw error;
      if (data?.ok && data.authorizationUrl) {
        sessionStorage.setItem('broker_oauth_state', JSON.stringify({ broker: form.broker_type, environment: form.environment, state: data.state }));
        window.location.assign(data.authorizationUrl);
      } else {
        toast.info(data?.error || 'OAuth is not configured yet. Use the advanced fallback for this broker.');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Unable to start broker OAuth');
    } finally {
      setOauthStarting(false);
    }
  };

  const discoveredAccounts = (credential: BrokerCredential): DiscoveredBrokerAccount[] => {
    const accounts = credential.metadata?.discovered_accounts || credential.metadata?.last_test?.details?.accounts || [];
    if (Array.isArray(accounts) && accounts.length) {
      return accounts.map((account: any, index: number) => ({
        accountId: String(account.accountId || account.account_id || account.id || credential.account_id || `${credential.id}-${index}`),
        accountName: String(account.accountName || account.name || account.account_id || credential.account_name),
        accountNumber: account.accountNumber || account.login || account.account_id || null,
        accountType: String(account.accountType || account.account_type || credential.account_type || 'demo'),
        environment: (account.environment || credential.environment || credential.account_type || 'demo') as any,
        balance: account.balance ?? null, equity: account.equity ?? null, currency: account.currency || null, leverage: account.leverage || null,
        permissions: account.permissions || credential.metadata?.permissions || [], metadata: account,
      }));
    }
    return [{ accountId: credential.account_id || credential.login || credential.id, accountName: credential.account_name, accountNumber: credential.login, accountType: credential.account_type, environment: (credential.environment || credential.account_type || 'demo') as any, balance: credential.metadata?.last_test?.details?.balance ?? null, equity: credential.metadata?.last_test?.details?.equity ?? null, currency: credential.metadata?.last_test?.details?.currency || null, leverage: credential.metadata?.leverage || null, permissions: credential.metadata?.permissions || [] }];
  };

  const switchAccount = async (credential: BrokerCredential, account: DiscoveredBrokerAccount) => {
    try {
      setActiveAccountId(credential.id);
      const { error } = await supabase.functions.invoke('broker-account-sync', { body: { credentialId: credential.id, selectedAccount: account } });
      if (error) throw error;
      toast.success(`Active broker account switched to ${account.accountName}`);
      fetchCredentials();
    } catch (error: any) {
      toast.error(error?.message || 'Account switch failed');
    }
  };

  const saveDefaultAssignment = async (purpose: string, credentialId: string) => {
    const next = { ...defaultAssignments, [purpose]: credentialId };
    setDefaultAssignments(next);
    const credential = credentials.find((c) => c.id === credentialId);
    if (!credential) return;
    const metadata = { ...(credential.metadata || {}), default_assignments: next };
    const { error } = await supabase.from('broker_credentials').update({ metadata }).eq('id', credentialId);
    if (error) toast.error('Failed to save default account'); else toast.success('Default account saved');
  };

  const handleAdd = async () => {
    if (!user?.id) { toast.error('You must be logged in'); return; }
    if (!form.account_name) { toast.error('Account name required'); return; }
    if (!editingId && supportsOAuth && broker.needs.length === 0) { toast.info('This broker uses backend OAuth. Click Connect instead of saving browser credentials.'); return; }
    if (!editingId) {
      for (const f of broker.needs) {
        if (!(form as any)[f]) { toast.error(`${f.replace('_',' ')} required for ${broker.label}`); return; }
      }
    }
    setIsSaving(true);
    try {
      let savedCredentialId = editingId;
      const cleanApiToken = normalizeCredentialInput(form.api_token);
      const cleanApiSecret = normalizeCredentialInput(form.api_secret);
      const cleanPassword = normalizeCredentialInput(form.password);
      const cleanAccountId = normalizeCredentialInput(form.account_id);
      const cleanLogin = normalizeCredentialInput(form.login);
      const cleanDerivAppId = normalizeCredentialInput(form.deriv_app_id);
      const cleanServer = form.server.trim();
      const existingCredential = credentials.find((c) => c.id === editingId);
      const metadataUpdate = form.broker_type === 'deriv'
        ? {
            ...(editingId ? (existingCredential?.metadata || {}) : {}),
            deriv_app_id: cleanDerivAppId || null,
            ...(cleanApiToken ? { credential_kind: cleanApiToken.startsWith('pat_') ? 'pat' : 'legacy' } : {}),
          }
        : undefined;
      if (editingId) {
        const updates: any = {
          account_name: form.account_name,
          account_type: form.account_type,
          environment: form.environment,
          account_id: cleanAccountId || null,
          login: cleanLogin || cleanAccountId || form.account_name,
          server: cleanServer || form.broker_type,
        };
        if (metadataUpdate) updates.metadata = metadataUpdate;
        // Only overwrite secrets if user typed a new value
        if (cleanApiToken) updates.api_token = cleanApiToken;
        if (cleanApiSecret) updates.api_secret = btoa(cleanApiSecret);
        if (cleanPassword) updates.encrypted_password = btoa(cleanPassword);
        const { error } = await supabase.from('broker_credentials').update(updates).eq('id', editingId);
        if (error) throw error;
        toast.success(`${broker.label} account updated — testing connection now`);
      } else {
        const payload: any = {
          user_id: user.id,
          broker_type: form.broker_type,
          account_name: form.account_name,
          account_type: form.account_type,
          environment: form.environment,
          api_token: cleanApiToken || null,
          api_secret: cleanApiSecret ? btoa(cleanApiSecret) : null,
          account_id: cleanAccountId || null,
          login: cleanLogin || cleanAccountId || form.account_name,
          server: cleanServer || form.broker_type,
          encrypted_password: cleanPassword ? btoa(cleanPassword) : 'n/a',
          ...(metadataUpdate ? { metadata: metadataUpdate } : {}),
        };
        const { data, error } = await supabase.from('broker_credentials').insert(payload).select('id').single();
        if (error) throw error;
        savedCredentialId = data?.id || null;
        toast.success(`${broker.label} account added — testing connection now`);
      }
      resetForm();
      setEditingId(null);
      setShowAddForm(false);
      await fetchCredentials();
      if (savedCredentialId) await testConnection(savedCredentialId, false);
    } catch (error: any) {
      console.error('Error saving account:', error);
      toast.error(error?.message || 'Failed to save account');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this broker account?')) return;
    try {
      const { error } = await supabase.from('broker_credentials').delete().eq('id', id);
      if (error) throw error;
      toast.success('Account deleted');
      fetchCredentials();
    } catch (e) { toast.error('Failed to delete'); }
  };

  const handleToggle = async (id: string, current: boolean) => {
    try {
      const { error } = await supabase.from('broker_credentials').update({ is_active: !current }).eq('id', id);
      if (error) throw error;
      fetchCredentials();
    } catch { toast.error('Failed to update'); }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Broker Accounts</CardTitle>
            <CardDescription>Universal broker authentication, account discovery, switching, and session health</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchCredentials}><RefreshCw className="h-4 w-4" /></Button>
            <Button size="sm" onClick={() => { if (showAddForm) { setEditingId(null); resetForm(); } setShowAddForm(!showAddForm); }}>
              <Plus className="h-4 w-4 mr-2" />{editingId ? 'Editing' : 'Add Broker'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          <AlertTitle className="text-sm">Session management</AlertTitle>
          <AlertDescription className="text-xs">OAuth-capable brokers authenticate through backend-managed authorization. Refresh tokens, client IDs, app IDs, redirect URLs, and secrets are never entered in the browser. Active sessions are heartbeated every 5 minutes and recover safely when you return online.</AlertDescription>
        </Alert>

        {showAddForm && (
          <Card className="border-dashed">
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Broker</Label>
                  <Select value={form.broker_type} disabled={!!editingId} onValueChange={(v) => { const nextBroker = getBrokerDefinition(v); setForm({ ...form, broker_type: v, environment: nextBroker.defaultEnvironment, account_type: nextBroker.defaultEnvironment }); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BROKERS.map(b => (
                        <SelectItem key={b.value} value={b.value} disabled={(b as any).disabled}>
                          {b.label} — {b.markets}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {broker.url && (
                    <a href={broker.url} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1">
                      Get {broker.label} API token <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {editingId && <p className="text-[11px] text-muted-foreground">Leave token / secret / password blank to keep the existing saved value.</p>}
                </div>
                <div className="space-y-2">
                  <Label>Account Name</Label>
                  <Input value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} placeholder="My Trading Account" />
                </div>
                <div className="md:col-span-2">
                  <Alert>
                    <ShieldCheck className="h-4 w-4" />
                    <AlertTitle className="text-sm">Required permissions for {broker.label}</AlertTitle>
                    <AlertDescription className="text-xs space-y-2">
                      <div className="flex gap-1 flex-wrap pt-1">
                        {broker.requiredScopes.map(s => <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>)}
                      </div>
                      <p className="text-muted-foreground">{broker.scopeHelp}</p>
                    </AlertDescription>
                  </Alert>
                </div>
                <div className="space-y-2">
                  <Label>Environment</Label>
                  <Select value={form.environment} onValueChange={(v) => setForm({ ...form, environment: v, account_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {brokerDefinition.environments.map((environment) => (
                        <SelectItem key={environment} value={environment}>{environment.charAt(0).toUpperCase() + environment.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {broker.needs.includes('account_id') && (
                  <div className="space-y-2">
                    <Label>Account ID</Label>
                    <Input value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })} placeholder="001-001-12345-001" />
                  </div>
                )}

                {broker.needs.includes('api_token') && (
                  <div className="space-y-2 md:col-span-2">
                    <Label>API Token / Key{editingId ? ' (leave blank to keep current)' : ''}</Label>
                    <Input value={form.api_token} onChange={(e) => setForm({ ...form, api_token: e.target.value })} placeholder={editingId ? '••••••• (unchanged)' : 'Paste your token'} type={showSecret ? 'text' : 'password'} />
                  </div>
                )}
                {broker.needs.includes('api_secret') && (
                  <div className="space-y-2 md:col-span-2">
                    <Label>API Secret{editingId ? ' (leave blank to keep current)' : ''}</Label>
                    <div className="relative">
                      <Input value={form.api_secret} onChange={(e) => setForm({ ...form, api_secret: e.target.value })} type={showSecret ? 'text' : 'password'} placeholder={editingId ? '••••••• (unchanged)' : ''} />
                      <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowSecret(!showSecret)}>
                        {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                )}
                {broker.needs.includes('login') && (
                  <div className="space-y-2"><Label>MT5 Login</Label><Input value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} /></div>
                )}
                {broker.needs.includes('password') && (
                  <div className="space-y-2"><Label>Password{editingId ? ' (leave blank to keep current)' : ''}</Label><Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} type="password" placeholder={editingId ? '••••••• (unchanged)' : ''} /></div>
                )}
                {broker.needs.includes('server') && (
                  <div className="space-y-2"><Label>MT5 Server</Label><Input value={form.server} onChange={(e) => setForm({ ...form, server: e.target.value })} placeholder="Broker-Demo" /></div>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setShowAddForm(false); setEditingId(null); resetForm(); }}>Cancel</Button>
                {supportsOAuth && !editingId && <Button variant="secondary" onClick={startOAuth} disabled={oauthStarting || !isOnline}>{oauthStarting ? 'Starting OAuth…' : `Connect with ${broker.label}`}</Button>}
                <Button onClick={handleAdd} disabled={isSaving}>{isSaving ? 'Saving…' : editingId ? 'Update Account' : supportsOAuth ? 'Save fallback account' : 'Save Account'}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Loading…</div>
        ) : credentials.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No broker accounts connected.</p>
            <p className="text-sm">Start with a free Deriv account (no upfront cost) or Binance testnet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {credentials.map((c) => {
              const def = BROKERS.find(b => b.value === c.broker_type);
              const lt = c.metadata?.last_test as
                | { ok: boolean; message: string; missing_scopes?: string[]; required_scopes?: string[]; tested_at: string }
                | undefined;
              const isTesting = !!testing[c.id];
              const missing = lt?.missing_scopes || [];
              return (
                <div key={c.id} className="flex flex-col gap-2 p-4 rounded-lg border bg-card">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{c.account_name}</span>
                        <Badge variant="secondary">{c.broker_type.toUpperCase()}</Badge>
                        <Badge variant={c.environment === 'live' ? 'default' : 'secondary'}>{c.environment || c.account_type}</Badge>
                        <Badge variant={c.is_active ? 'default' : 'outline'}>{c.is_active ? 'Active' : 'Inactive'}</Badge>
                        {isTesting ? (
                          <Badge variant="outline" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Testing</Badge>
                        ) : lt ? (
                          lt.ok
                            ? <Badge className="gap-1 bg-green-500/20 text-green-400 border-green-500/40"><CheckCircle2 className="h-3 w-3" /> Verified</Badge>
                            : <Badge className="gap-1 bg-red-500/20 text-red-400 border-red-500/40"><XCircle className="h-3 w-3" /> Invalid</Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-muted-foreground"><HelpCircle className="h-3 w-3" /> Untested</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {c.account_id ? `Account: ${c.account_id}` : (c.login ? `Login: ${c.login}` : '')}
                        {c.server ? ` • ${c.server}` : ''}
                        {lt?.tested_at ? ` • last checked ${new Date(lt.tested_at).toLocaleTimeString()}` : ''}
                      </div>
                      {lt && (
                        <div className={`text-xs mt-1 ${lt.ok ? 'text-green-400' : 'text-red-400'}`}>{lt.message}</div>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button variant="outline" size="sm" onClick={() => testConnection(c.id)} disabled={isTesting}>
                        {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Test'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(c)}><Pencil className="h-4 w-4 mr-1" />Edit</Button>
                      <Button variant="outline" size="sm" onClick={() => handleToggle(c.id, c.is_active)}>
                        {c.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>

                  {lt && !lt.ok && (
                    <Alert variant="destructive" className="py-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle className="text-sm">Connection failed</AlertTitle>
                      <AlertDescription className="text-xs space-y-1">
                        <div>{lt.message}</div>
                        {missing.length > 0 && (
                          <div>
                            <span className="text-muted-foreground">Missing / required:</span>{' '}
                            {missing.map(s => <Badge key={s} variant="outline" className="ml-1 text-[10px]">{s}</Badge>)}
                          </div>
                        )}
                        {def?.url && (
                          <a href={def.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary">
                            Fix in {def.label} <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  {def && (!lt || lt.ok) && (
                    <div className="text-[11px] text-muted-foreground">
                      Required scopes: {def.requiredScopes.map(s => (
                        <Badge key={s} variant="outline" className="ml-1 text-[10px]">{s}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {credentials.length > 0 && (
          <Card className="border-muted">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Universal Account Switcher & Defaults</CardTitle>
              <CardDescription>Switch discovered accounts without re-authentication and assign defaults for trading modes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                {credentials.map((credential) => (
                  <div key={`switch-${credential.id}`} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="font-medium">{credential.account_name}</div>
                      <Badge variant={activeAccountId === credential.id || credential.is_active ? 'default' : 'outline'}>{activeAccountId === credential.id || credential.is_active ? 'Active session' : 'Available'}</Badge>
                    </div>
                    <div className="grid md:grid-cols-2 gap-2">
                      {discoveredAccounts(credential).map((account) => (
                        <Button key={`${credential.id}-${account.accountId}`} variant="outline" className="h-auto justify-start" onClick={() => switchAccount(credential, account)}>
                          <span className="text-left">
                            <span className="block">{account.accountName}</span>
                            <span className="block text-xs text-muted-foreground">{account.accountType} • {account.currency || '—'} {account.balance ?? '—'} balance • {account.permissions.length ? account.permissions.join(', ') : 'standard permissions'}</span>
                          </span>
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                {TRADING_PURPOSES.map((purpose) => (
                  <div key={purpose.key} className="space-y-1">
                    <Label>{purpose.label} default</Label>
                    <Select value={defaultAssignments[purpose.key] || ''} onValueChange={(value) => saveDefaultAssignment(purpose.key, value)}>
                      <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                      <SelectContent>{credentials.map((credential) => <SelectItem key={`${purpose.key}-${credential.id}`} value={credential.id}>{credential.account_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-sm text-muted-foreground mt-4 p-3 bg-muted/50 rounded-lg">
          <strong>Free Cloud Brokers:</strong> Deriv / Binance / Bybit / Alpaca / Interactive Brokers / OANDA / Capital.com / MT5 run through broker-independent adapters. Connections are auto-re-tested every 5 minutes so the status badge stays current.
        </div>
      </CardContent>
    </Card>
  );
};
