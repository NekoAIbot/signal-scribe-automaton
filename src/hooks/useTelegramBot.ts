import { useState, useEffect, useCallback } from 'react';
import { setTelegramEnabled, getTelegramEnabled } from '@/services/unifiedSignalService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useTelegramBot() {
  const [isActive, setIsActive] = useState(getTelegramEnabled());

  useEffect(() => {
    const handler = () => setIsActive(getTelegramEnabled());
    window.addEventListener('telegram-state-change', handler);
    return () => window.removeEventListener('telegram-state-change', handler);
  }, []);

  const toggle = useCallback(async () => {
    const newState = !getTelegramEnabled();
    
    if (newState) {
      // Test Telegram connection
      try {
        const { data, error } = await supabase.functions.invoke('send-notification', {
          body: {
            type: 'telegram',
            message: '🤖 Telegram signal bot activated! You will now receive live trading signals with risk warnings.'
          }
        });
        
        if (error) throw error;
        if (!data?.success) {
          toast.warning("Telegram not configured. Please add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID secrets.");
          return;
        }
        
        toast.success("Telegram signal bot activated");
      } catch (error) {
        console.error("Telegram toggle error:", error);
        toast.error("Failed to activate Telegram bot");
        return;
      }
    } else {
      toast.info("Telegram signal bot deactivated");
    }
    
    setTelegramEnabled(newState);
    setIsActive(newState);
    window.dispatchEvent(new Event('telegram-state-change'));
  }, []);

  return { isActive, toggle };
}
