import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Trash2, Plus, Eye, EyeOff, RefreshCw, ExternalLink, CheckCircle2, XCircle, Loader2, HelpCircle } from "lucide-react";

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
}

const BROKERS = [
  { value: 'deriv',   label: 'Deriv',        markets: 'Crypto + Synthetics + Forex', needs: ['api_token'], tierMin: 'free',  url: 'https://app.deriv.com/account/api-token' },
  { value: 'binance', label: 'Binance',      markets: 'Crypto',                       needs: ['api_token','api_secret'], tierMin: 'starter', url: 'https://www.binance.com/en/my/settings/api-management' },
  { value: 'oanda',   label: 'OANDA',        markets: 'Forex + CFDs',                 needs: ['api_token','account_id'], tierMin: 'pro',     url: 'https://www.oanda.com/account/tpa/personal_token' },
  { value: 'capital', label: 'Capital.com',  markets: 'Forex + Crypto + Stocks',      needs: ['api_token','account_id','password'], tierMin: 'pro', url: 'https://capital.com/trading/api' },
  { value: 'mt5',     label: 'MT5 (Legacy)', markets: 'Forex + CFDs via MetaApi',     needs: ['login','password','server'], tierMin: 'enterprise', url: '' },
];

export const MT5AccountSettings = () => {
  const { user } = useAuth();
  const [credentials, setCredentials] = useState<BrokerCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [statuses, setStatuses] = useState<Record<string, { ok: boolean; message: string; at: string }>>({});

  const testConnection = async (id: string) => {
    setTesting((t) => ({ ...t, [id]: true }));
    try {
      const { data, error } = await supabase.functions.invoke('test-broker-connection', { body: { credentialId: id } });
      if (error) throw error;
      setStatuses((s) => ({ ...s, [id]: { ok: !!data?.ok, message: data?.message || data?.error || 'Unknown', at: new Date().toISOString() } }));
      if (data?.ok) toast.success(`Connected: ${data.message}`);
      else toast.error(`Failed: ${data?.message || data?.error}`);
    } catch (e: any) {
      setStatuses((s) => ({ ...s, [id]: { ok: false, message: e?.message || 'Test failed', at: new Date().toISOString() } }));
      toast.error(e?.message || 'Test failed');
    } finally {
      setTesting((t) => ({ ...t, [id]: false }));
    }
  };


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
        .select('id, broker_type, account_name, login, server, account_type, environment, account_id, is_active, created_at')
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

  useEffect(() => { fetchCredentials(); }, [user?.id]);

  const handleAdd = async () => {
    if (!user?.id) { toast.error('You must be logged in'); return; }
    if (!form.account_name) { toast.error('Account name required'); return; }
    for (const f of broker.needs) {
      if (!(form as any)[f]) { toast.error(`${f.replace('_',' ')} required for ${broker.label}`); return; }
    }
    setIsSaving(true);
    try {
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
      setForm({ ...form, account_name: '', api_token: '', api_secret: '', account_id: '', login: '', password: '', server: '' });
      setShowAddForm(false);
      fetchCredentials();
    } catch (error: any) {
      console.error('Error adding account:', error);
      toast.error(error?.message || 'Failed to add account');
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
            <CardDescription>Connect a free cloud broker (Deriv, Binance, OANDA, Capital.com) — no MT5 or VPS required</CardDescription>
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
                  <Select value={form.broker_type} onValueChange={(v) => setForm({ ...form, broker_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BROKERS.map(b => (
                        <SelectItem key={b.value} value={b.value}>{b.label} — {b.markets}</SelectItem>
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
                <div className="space-y-2">
                  <Label>Environment</Label>
                  <Select value={form.environment} onValueChange={(v) => setForm({ ...form, environment: v, account_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="demo">Demo / Practice</SelectItem>
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
              const st = statuses[c.id];
              const isTesting = !!testing[c.id];
              return (
              <div key={c.id} className="flex items-center justify-between p-4 rounded-lg border bg-card gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{c.account_name}</span>
                    <Badge variant="secondary">{c.broker_type.toUpperCase()}</Badge>
                    <Badge variant={c.environment === 'live' ? 'default' : 'secondary'}>{c.environment || c.account_type}</Badge>
                    <Badge variant={c.is_active ? 'success' as any : 'outline'}>{c.is_active ? 'Active' : 'Inactive'}</Badge>
                    {isTesting ? (
                      <Badge variant="outline" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Testing</Badge>
                    ) : st ? (
                      st.ok
                        ? <Badge className="gap-1 bg-green-500/20 text-green-400 border-green-500/40"><CheckCircle2 className="h-3 w-3" /> Verified</Badge>
                        : <Badge className="gap-1 bg-red-500/20 text-red-400 border-red-500/40"><XCircle className="h-3 w-3" /> Invalid</Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-muted-foreground"><HelpCircle className="h-3 w-3" /> Untested</Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {c.account_id ? `Account: ${c.account_id}` : (c.login ? `Login: ${c.login}` : '')}
                    {c.server ? ` • ${c.server}` : ''}
                  </div>
                  {st && (
                    <div className={`text-xs mt-1 ${st.ok ? 'text-green-400' : 'text-red-400'}`}>{st.message}</div>
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
            );})}
          </div>
        )}

        <div className="text-sm text-muted-foreground mt-4 p-3 bg-muted/50 rounded-lg">
          <strong>Free Cloud Brokers:</strong> Deriv / Binance / OANDA / Capital.com run server-side, so trades execute 24/7 without you keeping a PC or MT5 open.
        </div>
      </CardContent>
    </Card>
  );
};
