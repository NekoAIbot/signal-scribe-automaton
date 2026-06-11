import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, CheckCircle2, XCircle, AlertTriangle, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

interface SubRow {
  id: string;
  plan_id: string;
  status: string;
  amount: number | null;
  currency: string | null;
  starts_at: string | null;
  current_period_end: string | null;
  created_at: string;
  paystack_customer_code: string | null;
  paystack_subscription_code: string | null;
}

interface WebhookEvent {
  id: string;
  event_type: string | null;
  status: string;
  status_code: number | null;
  signature_valid: boolean | null;
  error: string | null;
  created_at: string;
}

export const SubscriptionStatus: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = (user as any)?.role === 'admin';
  const [tier, setTier] = useState<string>('free');
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    const [profileQ, subsQ, eventsQ] = await Promise.all([
      supabase.from('profiles').select('subscription_tier').eq('id', user.id).maybeSingle(),
      supabase.from('user_subscriptions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      isAdmin
        ? supabase.from('webhook_events').select('id, event_type, status, status_code, signature_valid, error, created_at').order('created_at', { ascending: false }).limit(25)
        : Promise.resolve({ data: [], error: null } as any),
    ]);
    if (profileQ.data?.subscription_tier) setTier(profileQ.data.subscription_tier as string);
    setSubs((subsQ.data as any) || []);
    setEvents((eventsQ.data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const lastEvent = events[0];
  const recentFailures = events.filter(e => e.status === 'invalid_signature' || e.status === 'error' || (e.status_code && e.status_code >= 400));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Current Subscription</CardTitle>
            <CardDescription>Your active plan and billing status</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Tier:</span>
            <Badge className="text-sm uppercase">{tier}</Badge>
            {subs[0]?.current_period_end && tier !== 'free' && (
              <span className="text-xs text-muted-foreground">
                Renews {formatDistanceToNow(new Date(subs[0].current_period_end), { addSuffix: true })}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Paystack Payment History</CardTitle>
          <CardDescription>All subscription transactions recorded for your account</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-6"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
          ) : subs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {subs.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border bg-card/50 gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium capitalize">{s.plan_id}</span>
                      <Badge variant={s.status === 'active' ? 'default' : 'secondary'}>{s.status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleString()}
                      {s.paystack_customer_code ? ` • cust ${s.paystack_customer_code.slice(0, 12)}…` : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{s.currency || 'USD'} {Number(s.amount || 0).toFixed(2)}</div>
                    {s.current_period_end && (
                      <div className="text-xs text-muted-foreground">until {new Date(s.current_period_end).toLocaleDateString()}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Last Webhook Event
            {lastEvent && (lastEvent.status === 'processed'
              ? <CheckCircle2 className="h-4 w-4 text-green-500" />
              : <XCircle className="h-4 w-4 text-red-500" />)}
          </CardTitle>
          <CardDescription>Most recent Paystack callback received by the backend</CardDescription>
        </CardHeader>
        <CardContent>
          {!isAdmin ? (
            <p className="text-sm text-muted-foreground">Webhook event details are only visible to admins.</p>
          ) : !lastEvent ? (
            <p className="text-sm text-muted-foreground">No webhook events received yet.</p>
          ) : (
            <div className="space-y-1 text-sm">
              <div><span className="text-muted-foreground">Event:</span> {lastEvent.event_type || '—'}</div>
              <div><span className="text-muted-foreground">Status:</span> <Badge variant={lastEvent.status === 'processed' ? 'default' : 'destructive'}>{lastEvent.status}</Badge> ({lastEvent.status_code})</div>
              <div><span className="text-muted-foreground">Signature valid:</span> {lastEvent.signature_valid ? 'yes' : 'no'}</div>
              <div><span className="text-muted-foreground">When:</span> {new Date(lastEvent.created_at).toLocaleString()}</div>
              {lastEvent.error && <div className="text-red-400">Error: {lastEvent.error}</div>}
            </div>
          )}
        </CardContent>
      </Card>

      {isAdmin && (
        <Card className={recentFailures.length > 0 ? 'border-red-500/40' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" /> Webhook Failure Report
              {recentFailures.length > 0 && <Badge variant="destructive">{recentFailures.length}</Badge>}
            </CardTitle>
            <CardDescription>Failed signature verifications and non-200 responses (last 25 events)</CardDescription>
          </CardHeader>
          <CardContent>
            {recentFailures.length === 0 ? (
              <p className="text-sm text-muted-foreground">No webhook failures recorded. 🎉</p>
            ) : (
              <div className="space-y-2">
                {recentFailures.map((e) => (
                  <div key={e.id} className="p-2 rounded border border-red-500/30 bg-red-500/5 text-xs">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3 w-3 text-red-400" />
                      <span className="font-medium">{e.event_type || e.status}</span>
                      <Badge variant="destructive" className="text-[10px]">{e.status_code}</Badge>
                      <span className="text-muted-foreground ml-auto">{new Date(e.created_at).toLocaleString()}</span>
                    </div>
                    {e.error && <div className="text-red-400 mt-1">{e.error}</div>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SubscriptionStatus;
