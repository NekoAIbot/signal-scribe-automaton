import React from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RealtimeStatus } from '@/hooks/useLiveTrades';

interface Props { status: RealtimeStatus }

export const RealtimeStatusBadge: React.FC<Props> = ({ status }) => {
  const map = {
    connecting: { Icon: Loader2, label: 'Connecting…', cls: 'text-blue-400 bg-blue-500/10', spin: true },
    connected: { Icon: Wifi, label: 'Live', cls: 'text-green-400 bg-green-500/10', spin: false },
    reconnecting: { Icon: Loader2, label: 'Reconnecting…', cls: 'text-yellow-400 bg-yellow-500/10', spin: true },
    error: { Icon: WifiOff, label: 'Offline', cls: 'text-red-400 bg-red-500/10', spin: false },
  }[status];

  return (
    <span
      data-testid="realtime-status"
      data-status={status}
      className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-medium', map.cls)}
    >
      <map.Icon className={cn('h-3 w-3', map.spin && 'animate-spin')} />
      {map.label}
    </span>
  );
};

export default RealtimeStatusBadge;
