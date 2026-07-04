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
import { Trash2, Plus, Eye, EyeOff, RefreshCw, ExternalLink, CheckCircle2, XCircle, Loader2, HelpCircle, AlertTriangle, ShieldCheck, Pencil } from "lucide-react";

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
  disabled?: boolean;
}

const BROKERS: BrokerDef[] = [
  {
    value: 'deriv', label: 'Deriv', markets: 'Crypto + Synthetics + Forex',
    needs: ['api_token'], tierMin: 'free',
    url: 'https://app.deriv.com/account/api-token',
    requiredScopes: ['Read', 'Trade', 'Trading information', 'Payments'],
    scopeHelp: 'When creating the Deriv API token, check the "Read", "Trade", "Trading information" and "Payments" scopes — otherwise auto-execute will be rejected.',
  },
  {
    value: 'binance', label: 'Binance', markets: 'Crypto',
    needs: ['api_token', 'api_secret'], tierMin: 'starter',
    url: 'https://www.binance.com/en/my/settings/api-management',
    requiredScopes: ['Enable Reading', 'Enable Spot & Margin & Stock Trading'],
    scopeHelp: 'Binance.com API keys must use Live environment. In Binance API Management, enable "Reading" and "Spot & Margin & Stock Trading". Disable withdrawals. If you use IP whitelist, add the server IP shown after a failed test, or disable the restriction.',
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
    value: 'mt5', label: 'MT5 (Disabled)', markets: 'Use Deriv / Binance / OANDA / Capital.com instead',
    needs: ['login', 'password', 'server'], tierMin: 'enterprise',
    url: '',
    requiredScopes: [],
    scopeHelp: 'MetaTrader execution has been removed. Existing MT5 accounts will not place trades — switch to one of the supported brokers above.',
    disabled: true,
  },
];

const HEALTH_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export const MT5AccountSettings = () => {
  const { user } = useAuth();
  const [credentials, setCredentials] = useState<BrokerCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
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
    environment: 'demo',
    account_type: 'demo',
  });

  const broker = BROKERS.find(b => b.value === form.broker_type)!;

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
    account_id: '', login: '', password: '', server: '', environment: 'demo', account_type: 'demo',
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
      environment: c.environment || 'demo',
      account_type: c.account_type || 'demo',
    });
  };

  const handleAdd = async () => {
    if (!user?.id) { toast.error('You must be logged in'); return; }
    if (!form.account_name) { toast.error('Account name required'); return; }
    if (!editingId) {
      for (const f of broker.needs) {
        if (!(form as any)[f]) { toast.error(`${f.replace('_',' ')} required for ${broker.label}`); return; }
      }
    }
    setIsSaving(true);
    try {
      if (editingId) {
        const updates: any = {
          account_name: form.account_name,
          account_type: form.account_type,
          environment: form.environment,
          account_id: form.account_id || null,
          login: form.login || form.account_id || form.account_name,
          server: form.server || form.broker_type,
        };
        // Only overwrite secrets if user typed a new value
        if (form.api_token) updates.api_token = form.api_token;
        if (form.api_secret) updates.api_secret = btoa(form.api_secret);
        if (form.password) updates.encrypted_password = btoa(form.password);
        const { error } = await supabase.from('broker_credentials').update(updates).eq('id', editingId);
        if (error) throw error;
        toast.success(`${broker.label} account updated`);
      } else {
        const payload: any = {
          user_id: user.id,
          broker_type: form.broker_type,
          account_name: form.account_name,
          account_type: form.account_type,
          environment: form.environment,
          api_token: form.api_token || null,
          api_secret: form.api_secret ? btoa(form.api_secret) : null,
          account_id: form.account_id || null,
          login: form.login || form.account_id || form.account_name,
          server: form.server || form.broker_type,
          encrypted_password: form.password ? btoa(form.password) : 'n/a',
        };
        const { error } = await supabase.from('broker_credentials').insert(payload);
        if (error) throw error;
        toast.success(`${broker.label} account added`);
      }
      resetForm();
      setEditingId(null);
      setShowAddForm(false);
      fetchCredentials();
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
            <CardDescription>Connect a free cloud broker — credentials are auto-tested every 5 minutes</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchCredentials}><RefreshCw className="h-4 w-4" /></Button>
            <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}><Plus className="h-4 w-4 mr-2" />Add Broker</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showAddForm && (
          <Card className="border-dashed">
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Broker</Label>
                  <Select value={form.broker_type} onValueChange={(v) => setForm({ ...form, broker_type: v, environment: v === 'binance' ? 'live' : form.environment, account_type: v === 'binance' ? 'live' : form.account_type })}>
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
                      <SelectItem value="demo">Demo / Practice / Testnet</SelectItem>
                      <SelectItem value="live">Live</SelectItem>
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
                    <Label>API Token / Key</Label>
                    <Input value={form.api_token} onChange={(e) => setForm({ ...form, api_token: e.target.value })} placeholder="Paste your token" type={showSecret ? 'text' : 'password'} />
                  </div>
                )}
                {broker.needs.includes('api_secret') && (
                  <div className="space-y-2 md:col-span-2">
                    <Label>API Secret</Label>
                    <div className="relative">
                      <Input value={form.api_secret} onChange={(e) => setForm({ ...form, api_secret: e.target.value })} type={showSecret ? 'text' : 'password'} />
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
                  <div className="space-y-2"><Label>Password</Label><Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} type="password" /></div>
                )}
                {broker.needs.includes('server') && (
                  <div className="space-y-2"><Label>MT5 Server</Label><Input value={form.server} onChange={(e) => setForm({ ...form, server: e.target.value })} placeholder="Broker-Demo" /></div>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
                <Button onClick={handleAdd} disabled={isSaving}>{isSaving ? 'Saving…' : 'Save Account'}</Button>
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

        <div className="text-sm text-muted-foreground mt-4 p-3 bg-muted/50 rounded-lg">
          <strong>Free Cloud Brokers:</strong> Deriv / Binance / OANDA / Capital.com run server-side. Connections are auto-re-tested every 5 minutes so the status badge stays current.
        </div>
      </CardContent>
    </Card>
  );
};
