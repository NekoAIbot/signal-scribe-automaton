import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Server } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  name?: string | null;
  type?: string | null;
  className?: string;
  variant?: 'compact' | 'full';
}

const typeColor = (type?: string | null) => {
  const t = String(type || '').toLowerCase();
  if (t === 'live') return 'border-green-500/50 text-green-400 bg-green-500/10';
  if (t === 'prop') return 'border-amber-500/50 text-amber-400 bg-amber-500/10';
  if (t === 'demo') return 'border-blue-500/50 text-blue-400 bg-blue-500/10';
  return 'border-muted-foreground/40 text-muted-foreground bg-muted/30';
};

export const BrokerBadge: React.FC<Props> = ({ name, type, className, variant = 'compact' }) => {
  if (!name && !type) {
    return (
      <Badge variant="outline" className={cn('gap-1 text-[10px]', className)}>
        <Server className="h-3 w-3" />
        No broker
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className={cn('gap-1 text-[10px] sm:text-xs font-medium', typeColor(type), className)}
      title={`${name || ''}${type ? ` (${type})` : ''}`}
    >
      <Server className="h-3 w-3 shrink-0" />
      <span className="truncate max-w-[120px]">{name || 'Broker'}</span>
      {variant === 'full' && type && <span className="opacity-70">· {type}</span>}
    </Badge>
  );
};

export default BrokerBadge;
