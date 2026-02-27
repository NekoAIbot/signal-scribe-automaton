import { useState, useEffect, useCallback } from 'react';

// Persist bot state globally across navigation
let globalBotRunning = false;
const listeners = new Set<(running: boolean) => void>();
const notify = () => listeners.forEach(fn => fn(globalBotRunning));

// Load initial state from localStorage
try {
  globalBotRunning = localStorage.getItem('tradingBotRunning') === 'true';
} catch {}

export function useTradingBot() {
  const [isRunning, setIsRunning] = useState(globalBotRunning);

  useEffect(() => {
    const listener = (running: boolean) => setIsRunning(running);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  const start = useCallback(() => {
    globalBotRunning = true;
    localStorage.setItem('tradingBotRunning', 'true');
    setIsRunning(true);
    notify();
  }, []);

  const stop = useCallback(() => {
    globalBotRunning = false;
    localStorage.setItem('tradingBotRunning', 'false');
    setIsRunning(false);
    notify();
  }, []);

  const toggle = useCallback(() => {
    if (globalBotRunning) stop();
    else start();
  }, [start, stop]);

  return { isRunning, start, stop, toggle };
}
