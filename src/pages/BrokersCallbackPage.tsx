import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { completeBrokerOAuth, oauthLog } from '@/services/brokerOAuth';

const RESUME_KEY = 'axion.broker_oauth.callback';

export default function BrokersCallbackPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading: isLoading } = useAuth();
  const started = useRef(false);
  const [status, setStatus] = useState<'working' | 'done' | 'error'>('working');
  const [message, setMessage] = useState('Verifying your broker authorization…');
  const [hint, setHint] = useState<string | null>(null);
  const [linked, setLinked] = useState<Array<Record<string, any>>>([]);
  const [returnTo, setReturnTo] = useState('/settings');

  useEffect(() => {
    if (isLoading) return;

    const search = window.location.search || localStorage.getItem(RESUME_KEY) || '';

    // Session expired mid-flow: park the callback and resume after sign-in.
    if (!isAuthenticated) {
      if (window.location.search) localStorage.setItem(RESUME_KEY, window.location.search);
      oauthLog('session_restore_required', {});
      navigate('/login', { replace: true });
      return;
    }

    if (started.current) return;
    started.current = true;
    localStorage.removeItem(RESUME_KEY);
    oauthLog('session_restored', {});

    (async () => {
      try {
        const result = await completeBrokerOAuth(search);
        setReturnTo(result.returnTo || '/settings');
        setMessage(result.message);
        setHint(result.hint || null);
        setLinked((result.linked || []).filter((l: any) => l.ok));
        setStatus(result.ok ? 'done' : 'error');
        if (result.ok) {
          toast.success(result.message);
          window.dispatchEvent(new Event('broker-accounts-changed'));
          setTimeout(() => navigate(result.returnTo || '/settings', { replace: true }), 2200);
        } else {
          toast.error(result.message);
        }
      } catch (e: any) {
        setStatus('error');
        setMessage(e?.message || 'The broker connection could not be completed.');
      }
    })();
  }, [isAuthenticated, isLoading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            {status === 'working' && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
            {status === 'done' && <CheckCircle2 className="h-6 w-6 text-emerald-500" />}
            {status === 'error' && <XCircle className="h-6 w-6 text-destructive" />}
          </div>
          <CardTitle className="text-lg">
            {status === 'working' ? 'Linking your broker' : status === 'done' ? 'Broker connected' : 'Connection failed'}
          </CardTitle>
          <CardDescription className="text-sm">{message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {hint && <p className="text-xs text-muted-foreground text-center">{hint}</p>}

          {linked.length > 0 && (
            <div className="space-y-2">
              {linked.map((l) => (
                <div key={String(l.account_id)} className="flex items-center justify-between rounded-md border p-2 text-xs">
                  <span className="font-medium">{String(l.account_id)}</span>
                  <span className="text-muted-foreground">
                    {String(l.environment) === 'live' ? 'Real' : 'Demo'} · {Number(l.balance || 0).toFixed(2)} {l.currency || ''}
                  </span>
                </div>
              ))}
            </div>
          )}

          {status === 'working' && (
            <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Validating state, PKCE and every linked account
            </p>
          )}

          {status !== 'working' && (
            <Button className="w-full" onClick={() => navigate(returnTo, { replace: true })}>
              {status === 'done' ? 'Go to Broker Accounts' : 'Back to Broker Accounts'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
