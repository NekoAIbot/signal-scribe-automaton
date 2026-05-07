import React, { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useBrokerAccounts } from '@/hooks/useBrokerAccounts';
import { toast } from 'sonner';

export const NoBrokerBanner: React.FC = () => {
  const { mainAccount, isLoading } = useBrokerAccounts();
  const warned = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    if (!mainAccount && !warned.current) {
      warned.current = true;
      toast.warning('No active main broker account — new signals cannot be auto-executed.', {
        duration: 8000,
        action: { label: 'Fix', onClick: () => { window.location.href = '/settings'; } },
      });
    }
    if (mainAccount) warned.current = false;
  }, [mainAccount, isLoading]);

  if (isLoading || mainAccount) return null;

  return (
    <div
      role="alert"
      data-testid="no-broker-banner"
      className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-amber-200 text-xs sm:text-sm"
    >
      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="font-medium">No active main broker account</p>
        <p className="opacity-90">
          New signals will not be auto-executed.{' '}
          <Link to="/settings" className="underline font-medium">Add or activate one in Settings</Link>.
        </p>
      </div>
    </div>
  );
};

export default NoBrokerBanner;
