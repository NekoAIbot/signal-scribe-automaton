import { useState, useEffect, useCallback } from 'react';
import { setBotEnabled, getBotEnabled, onSignalsUpdate, UnifiedSignal } from '@/services/unifiedSignalService';

export function useTradingBot() {
  const [isRunning, setIsRunning] = useState(getBotEnabled());
  const [latestSignals, setLatestSignals] = useState<UnifiedSignal[]>([]);

  useEffect(() => {
    // Sync with unified service
    const unsub = onSignalsUpdate((signals) => {
      setLatestSignals(signals);
    });
    return unsub;
  }, []);

  // Listen for external changes (e.g. from admin page)
  useEffect(() => {
    const handler = () => setIsRunning(getBotEnabled());
    window.addEventListener('bot-state-change', handler);
    return () => window.removeEventListener('bot-state-change', handler);
  }, []);

  const start = useCallback(() => {
    setBotEnabled(true);
    setIsRunning(true);
    window.dispatchEvent(new Event('bot-state-change'));
  }, []);

  const stop = useCallback(() => {
    setBotEnabled(false);
    setIsRunning(false);
    window.dispatchEvent(new Event('bot-state-change'));
  }, []);

  const toggle = useCallback(() => {
    if (getBotEnabled()) stop();
    else start();
  }, [start, stop]);

  return { isRunning, start, stop, toggle, latestSignals };
}
