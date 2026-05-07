import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, FileText, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBrokerAccounts } from '@/hooks/useBrokerAccounts';
import TradeTimeline from '@/components/monitoring/TradeTimeline';
import BrokerBadge from '@/components/common/BrokerBadge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AuditEntry {
  id: string;
  created_at: string;
  broker_account_id: string | null;
  broker_account_name: string | null;
  broker_account_type: string | null;
  symbol: string | null;
  trade_type: string | null;
  success: boolean;
  status: string | null;
  error_message: string | null;
  execution_timeline: any[];
  retry_of: string | null;
  trade_id: string | null;
}

const ranges = [
  { value: '1h', label: 'Last hour', ms: 3600_000 },
  { value: '24h', label: 'Last 24 hours', ms: 86_400_000 },
  { value: '7d', label: 'Last 7 days', ms: 7 * 86_400_000 },
  { value: '30d', label: 'Last 30 days', ms: 30 * 86_400_000 },
  { value: 'all', label: 'All time', ms: 0 },
];

const AuditLogPage: React.FC = () => {
  const { user } = useAuth();
  const { accounts } = useBrokerAccounts();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [broker, setBroker] = useState<string>('all');
  const [range, setRange] = useState<string>('24h');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('execution_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setEntries((data as any) || []);
    } catch (e: any) {
      toast.error(`Failed to load audit log: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`audit-${user.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'execution_audit_log', filter: `user_id=eq.${user.id}` },
        (payload) => setEntries(prev => [payload.new as AuditEntry, ...prev])
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const filtered = useMemo(() => {
    const r = ranges.find(x => x.value === range);
    const cutoff = r && r.ms > 0 ? Date.now() - r.ms : 0;
    return entries.filter(e => {
      if (broker !== 'all' && e.broker_account_id !== broker) return false;
      if (cutoff && new Date(e.created_at).getTime() < cutoff) return false;
      if (search && !(`${e.symbol} ${e.broker_account_name} ${e.status}`.toLowerCase().includes(search.toLowerCase()))) return false;
      return true;
    });
  }, [entries, broker, range, search]);

  const successCount = filtered.filter(e => e.success).length;
  const failCount = filtered.length - successCount;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5" /> Execution Audit Log
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Every <code>execute-trade</code> attempt with broker, result, and timeline.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4 sm:mr-2', loading && 'animate-spin')} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm sm:text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            <Select value={broker} onValueChange={setBroker}>
              <SelectTrigger><SelectValue placeholder="Broker" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All brokers</SelectItem>
                {accounts.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.account_name} ({a.account_type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger><SelectValue placeholder="Time range" /></SelectTrigger>
              <SelectContent>
                {ranges.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Search symbol / status…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="mt-3 flex gap-2 text-xs">
            <Badge variant="outline" className="border-green-500/50 text-green-400">{successCount} success</Badge>
            <Badge variant="outline" className="border-red-500/50 text-red-400">{failCount} failed</Badge>
            <Badge variant="outline">{filtered.length} total</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              {loading ? 'Loading…' : 'No audit entries match these filters.'}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(e => (
                <Collapsible key={e.id} open={openId === e.id} onOpenChange={(o) => setOpenId(o ? e.id : null)}>
                  <div className="p-3 sm:p-4 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <Badge variant="outline" className={cn(
                          'text-[10px]',
                          e.success ? 'border-green-500/50 text-green-400 bg-green-500/10'
                                    : 'border-red-500/50 text-red-400 bg-red-500/10',
                        )}>
                          {e.success ? 'SUCCESS' : 'FAILED'}
                        </Badge>
                        {e.trade_type && (
                          <Badge variant="outline" className="text-[10px]">{e.trade_type}</Badge>
                        )}
                        <span className="font-mono font-semibold text-sm">{e.symbol || '—'}</span>
                        <BrokerBadge name={e.broker_account_name} type={e.broker_account_type} />
                        {e.retry_of && <Badge variant="outline" className="text-[10px]">retry</Badge>}
                      </div>
                      <span className="text-[10px] sm:text-xs text-muted-foreground shrink-0">
                        {new Date(e.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs text-muted-foreground truncate min-w-0">
                        {e.status}{e.error_message ? ` · ${e.error_message}` : ''}
                      </div>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 text-[10px] sm:text-xs shrink-0">
                          Timeline ({e.execution_timeline?.length || 0})
                          {openId === e.id ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent className="rounded-md border border-border bg-muted/30 p-2 sm:p-3">
                      <TradeTimeline events={e.execution_timeline || []} />
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogPage;
