import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface MLModelRow {
  id: string;
  name: string;
  type: string;
  version: string | null;
  accuracy: number | null;
  indicators: string[] | null;
  is_active: boolean | null;
  last_trained_at: string | null;
  created_at: string | null;
  params: any;
}

interface Props {
  /** A bumping counter from parent to trigger refresh after a new training run */
  refreshKey?: number;
}

const fmtPct = (v: number | null | undefined) =>
  typeof v === 'number' ? `${(v * 100).toFixed(2)}%` : '—';

const TrainingHistoryPanel: React.FC<Props> = ({ refreshKey = 0 }) => {
  const { user } = useAuth();
  const [models, setModels] = useState<MLModelRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('ml_models')
      .select('*')
      .order('last_trained_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(10);
    if (!error) setModels((data || []) as MLModelRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user, refreshKey]);

  // Realtime: re-load whenever an ml_models row is inserted/updated
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`ml-models-${user.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'ml_models', filter: `user_id=eq.${user.id}` },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const latest = models[0];

  return (
    <Card data-testid="training-history-panel">
      <CardHeader className="pb-2 sm:pb-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
            <Brain className="h-4 w-4 sm:h-5 sm:w-5" />
            ML Training Verification
          </CardTitle>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 sm:mr-2 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && models.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Loading training runs…</p>
        ) : models.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No trained models yet. Click <strong>Train New Model</strong> to start a run.
          </p>
        ) : (
          <>
            {/* Latest run highlight */}
            {latest && (
              <div className="rounded-md border border-primary/30 bg-primary/5 p-3" data-testid="latest-training">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Latest run</p>
                    <p className="text-sm sm:text-base font-semibold truncate">{latest.name}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] sm:text-xs">
                    {latest.type} v{latest.version || '1.0'}
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span>Accuracy</span>
                    <span className="font-mono font-semibold" data-testid="latest-accuracy">
                      {fmtPct(latest.accuracy)}
                    </span>
                  </div>
                  <Progress value={(latest.accuracy || 0) * 100} className="h-2" />
                </div>
                {latest.params?.metrics && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-[11px]">
                    <Metric label="Precision" value={latest.params.metrics.precision} pct />
                    <Metric label="Recall" value={latest.params.metrics.recall} pct />
                    <Metric label="F1" value={latest.params.metrics.f1_score} pct />
                    <Metric label="Sharpe" value={latest.params.metrics.sharpe_ratio} />
                  </div>
                )}
                {latest.last_trained_at && (
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Trained {new Date(latest.last_trained_at).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            {/* History list */}
            <div className="space-y-1.5">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Recent runs</p>
              <div className="space-y-1">
                {models.map(m => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-2 text-xs border-b border-border pb-1 last:border-0"
                    data-testid={`run-${m.id}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{m.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {m.type} • v{m.version || '1.0'} •{' '}
                        {m.last_trained_at ? new Date(m.last_trained_at).toLocaleString() : '—'}
                      </p>
                    </div>
                    <span className="font-mono shrink-0">{fmtPct(m.accuracy)}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

const Metric: React.FC<{ label: string; value: any; pct?: boolean }> = ({ label, value, pct }) => (
  <div className="rounded bg-muted/40 p-1.5">
    <p className="text-[10px] text-muted-foreground">{label}</p>
    <p className="font-mono">
      {typeof value === 'number'
        ? pct ? `${(value * 100).toFixed(1)}%` : value.toFixed(2)
        : '—'}
    </p>
  </div>
);

export default TrainingHistoryPanel;
