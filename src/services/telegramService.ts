import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TradeAlert {
  symbol: string;
  action: 'BUY' | 'SELL' | 'CLOSE';
  price: number;
  strategy?: string;
  confidence?: number;
  stopLoss?: number;
  takeProfit?: number;
}

interface SignalAlert {
  symbol: string;
  signalType: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  entryPrice: number;
  targetPrice?: number;
  stopLoss?: number;
  timeframe: string;
  models: string[];
}

/**
 * Send a trade alert notification via Telegram
 */
export const sendTradeAlert = async (alert: TradeAlert): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: {
        type: 'trade_alert',
        ...alert
      }
    });

    if (error) {
      console.error('Error sending trade alert:', error);
      toast.error('Failed to send trade alert to Telegram');
      return false;
    }

    if (data?.success) {
      toast.success('Trade alert sent to Telegram');
      return true;
    } else {
      toast.error(data?.message || 'Failed to send trade alert');
      return false;
    }
  } catch (error) {
    console.error('Error sending trade alert:', error);
    toast.error('Failed to send trade alert');
    return false;
  }
};

/**
 * Send a signal alert notification via Telegram
 */
export const sendSignalAlert = async (alert: SignalAlert): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: {
        type: 'signal_alert',
        ...alert
      }
    });

    if (error) {
      console.error('Error sending signal alert:', error);
      toast.error('Failed to send signal alert to Telegram');
      return false;
    }

    if (data?.success) {
      toast.success('Signal alert sent to Telegram');
      return true;
    } else {
      toast.error(data?.message || 'Failed to send signal alert');
      return false;
    }
  } catch (error) {
    console.error('Error sending signal alert:', error);
    toast.error('Failed to send signal alert');
    return false;
  }
};

/**
 * Send a custom message via Telegram
 */
export const sendTelegramMessage = async (message: string, chatId?: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: {
        type: 'telegram',
        message,
        chatId
      }
    });

    if (error) {
      console.error('Error sending Telegram message:', error);
      return false;
    }

    return data?.success || false;
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return false;
  }
};

/**
 * Test the Telegram connection
 */
export const testTelegramConnection = async (): Promise<boolean> => {
  const testMessage = `
🔔 <b>Test Notification</b>

✅ Your Telegram bot is configured correctly!
📡 Trading alerts will be sent to this chat.

⏰ ${new Date().toLocaleString()}
`;

  const success = await sendTelegramMessage(testMessage);
  
  if (success) {
    toast.success('Test message sent to Telegram!');
  } else {
    toast.error('Failed to send test message. Check your bot token and chat ID.');
  }
  
  return success;
};
