import React from 'react';
import { Check, Clock, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimelineEvent } from '@/hooks/useLiveTrades';

const STAGE_LABEL: Record<string, string> = {
  requested: 'Requested',
  auth: 'Auth',
  risk_check: 'Risk check',
  provisioning: 'Provisioning',
  deploying: 'Deploying',
  order: 'Order placed',
  filled: 'Filled',
  failed: 'Failed',
};

interface Props {
  events: TimelineEvent[];
  compact?: boolean;
}

const TradeTimeline: React.FC<Props> = ({ events, compact = false }) => {
  if (!events || events.length === 0) {
    return (
      <p className="text-xs text-muted-foreground" data-testid="timeline-empty">
        No execution events recorded.
      </p>
    );
  }

  return (
    <ol className="space-y-1.5" data-testid="trade-timeline">
      {events.map((ev, i) => {
        const Icon = ev.status === 'success' ? Check : ev.status === 'failed' ? X : ev.status === 'started' ? Loader2 : Clock;
        return (
          <li key={i} className="flex items-start gap-2 text-xs">
            <span
              className={cn(
                'mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
                ev.status === 'success' && 'bg-green-500/20 text-green-400',
                ev.status === 'failed' && 'bg-red-500/20 text-red-400',
                ev.status === 'started' && 'bg-blue-500/20 text-blue-400',
              )}
            >
              <Icon className={cn('h-3 w-3', ev.status === 'started' && 'animate-spin')} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-medium">{STAGE_LABEL[ev.stage] || ev.stage}</span>
                {!compact && (
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(ev.at).toLocaleTimeString()}
                  </span>
                )}
              </div>
              {ev.message && (
                <p className="break-words text-muted-foreground">{ev.message}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
};

export default TradeTimeline;
