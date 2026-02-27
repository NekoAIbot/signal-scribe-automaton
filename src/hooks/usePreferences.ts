import { useState, useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';

export interface UserPreferences {
  theme: string;
  notifications: {
    email: boolean;
    telegram: boolean;
    push: boolean;
    signals: boolean;
    news: boolean;
    systemAlerts: boolean;
  };
  trading: {
    defaultLotSize: number;
    defaultRisk: number;
    confirmTradeExecution: boolean;
    autocloseEnabled: boolean;
    autocloseProfit: number;
    autocloseLoss: number;
  };
  display: {
    chartTimeframe: string;
    defaultAssetClass: string;
    dashboardLayout: string;
  };
}

const defaultPreferences: UserPreferences = {
  theme: 'dark',
  notifications: {
    email: true,
    telegram: false,
    push: true,
    signals: true,
    news: false,
    systemAlerts: true,
  },
  trading: {
    defaultLotSize: 0.01,
    defaultRisk: 1,
    confirmTradeExecution: true,
    autocloseEnabled: false,
    autocloseProfit: 50,
    autocloseLoss: 25,
  },
  display: {
    chartTimeframe: '1h',
    defaultAssetClass: 'forex',
    dashboardLayout: 'default',
  },
};

// Global event emitter for cross-component reactivity
const listeners = new Set<() => void>();
const notifyListeners = () => listeners.forEach(fn => fn());

export function usePreferences() {
  const { setTheme } = useTheme();
  const [preferences, setPreferencesState] = useState<UserPreferences>(() => {
    try {
      const saved = localStorage.getItem('userPreferences');
      return saved ? { ...defaultPreferences, ...JSON.parse(saved) } : defaultPreferences;
    } catch {
      return defaultPreferences;
    }
  });

  // Listen for changes from other components
  useEffect(() => {
    const listener = () => {
      try {
        const saved = localStorage.getItem('userPreferences');
        if (saved) setPreferencesState({ ...defaultPreferences, ...JSON.parse(saved) });
      } catch {}
    };
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  const updatePreferences = useCallback((newPrefs: UserPreferences) => {
    setPreferencesState(newPrefs);
    localStorage.setItem('userPreferences', JSON.stringify(newPrefs));
    
    // Apply theme immediately
    setTheme(newPrefs.theme);
    
    notifyListeners();
  }, [setTheme]);

  const updatePreference = useCallback((category: string, setting: string, value: any) => {
    setPreferencesState(prev => {
      const updated = {
        ...prev,
        [category]: {
          ...(prev[category as keyof UserPreferences] as object),
          [setting]: value,
        },
      };
      localStorage.setItem('userPreferences', JSON.stringify(updated));
      
      // Apply theme immediately if theme changed
      if (category === 'theme' || (setting === 'theme')) {
        // handled below
      }
      
      notifyListeners();
      return updated;
    });
  }, []);

  const setThemePreference = useCallback((theme: string) => {
    setPreferencesState(prev => {
      const updated = { ...prev, theme };
      localStorage.setItem('userPreferences', JSON.stringify(updated));
      setTheme(theme);
      notifyListeners();
      return updated;
    });
  }, [setTheme]);

  return { preferences, updatePreferences, updatePreference, setThemePreference };
}
