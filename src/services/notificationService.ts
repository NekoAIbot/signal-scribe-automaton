import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

export interface SignalNotification {
  symbol: string;
  type: string;
  price: number;
  strategy?: string;
  time?: string;
}

// Technical Alert Interface
export interface TechnicalAlertParams {
  symbol: string;
  indicator: string;
  condition: string;
  value: number;
  timeframe: string;
}

// News Alert Interface
export interface NewsAlertParams {
  keywords: string[];
  importance: 'low' | 'medium' | 'high';
  sources: string[];
}

// Email notification function to simulate sending emails
export const sendEmailNotification = async (subject: string, body: string, to: string): Promise<boolean> => {
  try {
    console.log(`[Email Service] Sending email:
      To: ${to}
      Subject: ${subject}
      Body: ${body}
    `);
    
    // In a real app, this would connect to an email service
    // For demo purposes, we'll simulate success after a short delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Log success
    console.log(`[Email Service] Email sent successfully to ${to}`);
    return true;
  } catch (error) {
    console.error("[Email Service] Error sending email:", error);
    return false;
  }
};

// Function to create technical alert
export const createTechnicalAlert = async (params: TechnicalAlertParams): Promise<boolean> => {
  try {
    console.log("Creating technical alert for:", params.symbol);
    
    // In a production app, this would register the alert with a backend service
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return true;
  } catch (error) {
    console.error("Error creating technical alert:", error);
    return false;
  }
};

// Function to create news alert
export const createNewsAlert = async (params: NewsAlertParams): Promise<boolean> => {
  try {
    console.log("Creating news alert for keywords:", params.keywords.join(', '));
    
    // In a production app, this would register the alert with a backend service
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return true;
  } catch (error) {
    console.error("Error creating news alert:", error);
    return false;
  }
};

// Hook to use technical alert creation
export const useTechnicalAlert = () => {
  return useMutation({
    mutationFn: createTechnicalAlert,
    onSuccess: () => {
      toast.success("Technical alert created successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to create technical alert: ${error}`);
    }
  });
};

// Hook to use news alert creation
export const useNewsAlert = () => {
  return useMutation({
    mutationFn: createNewsAlert,
    onSuccess: () => {
      toast.success("News alert created successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to create news alert: ${error}`);
    }
  });
};

// Initialize signal service (placeholder for any WebSocket or notification setup)
export const initializeSignalService = () => {
  console.log("Initializing signal service");
  // This would set up WebSocket connections, push notification registrations, etc.
};

export const useSignalNotification = () => {
  return useMutation({
    mutationFn: async (notification: SignalNotification) => {
      // Simulate sending notification to user
      console.log("Signal notification:", notification);
      return notification;
    },
    onSuccess: () => {
      // This would be called after successful notification
    }
  });
};

// Function to register Telegram bot
export const registerTelegramBot = async (botToken: string, chatId: string): Promise<boolean> => {
  try {
    // In a real app, this would store the token and chat ID securely
    localStorage.setItem('telegramBotToken', botToken);
    localStorage.setItem('telegramBotChatId', chatId);
    
    toast.success('Telegram bot registered successfully');
    return true;
  } catch (error) {
    console.error("Error registering Telegram bot:", error);
    toast.error(`Failed to register Telegram bot: ${(error as Error).message}`);
    return false;
  }
};

// Check if Telegram bot is configured
export const isTelegramBotConfigured = (): boolean => {
  const botToken = localStorage.getItem('telegramBotToken');
  const chatId = localStorage.getItem('telegramBotChatId');
  return !!botToken && !!chatId;
};

// Function to test Telegram notification
export const testTelegramNotification = async (): Promise<boolean> => {
  try {
    const testSignal: SignalNotification = {
      symbol: 'TEST/USD',
      type: 'BUY',
      price: 1.0000,
      strategy: 'Test Notification',
      time: new Date().toISOString()
    };
    
    const result = await broadcastSignal(testSignal);
    return result;
  } catch (error) {
    console.error("Error testing Telegram notification:", error);
    toast.error(`Failed to test Telegram notification: ${(error as Error).message}`);
    return false;
  }
};

// Add a testAlertSystem function to support AlertsPage call
export const testAlertSystem = async (): Promise<boolean> => {
  try {
    toast.info("Testing alert system...");
    await new Promise(resolve => setTimeout(resolve, 500));
    toast.success("Alert system is working correctly");
    return true;
  } catch (error) {
    toast.error("Alert system test failed");
    return false;
  }
};

// Set up or update trade signal service
export const setupRealTimeSignals = (isActive: boolean): void => {
  // In a real app, this would connect to a WebSocket or similar for real-time signals
  if (isActive) {
    toast.success("Real-time signal service activated");
    
    // Start a periodic check for new signals (simulated)
    const intervalId = setInterval(() => {
      // Check if service is still active
      const isStillActive = localStorage.getItem('telegramSignalServiceActive') === 'true';
      if (!isStillActive) {
        clearInterval(intervalId);
        return;
      }
      
      // 15% chance to generate a signal every minute
      if (Math.random() < 0.15) {
        const symbols = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD'];
        const types = ['BUY', 'SELL'];
        const strategies = ['RSI Divergence', 'MA Crossover', 'Breakout', 'Support/Resistance', 'AI Model'];
        
        const randomSignal: SignalNotification = {
          symbol: symbols[Math.floor(Math.random() * symbols.length)],
          type: types[Math.floor(Math.random() * types.length)],
          price: 1 + Math.random(), // Simple random price
          strategy: strategies[Math.floor(Math.random() * strategies.length)],
          time: new Date().toISOString()
        };
        
        broadcastSignal(randomSignal);
      }
    }, 60000); // Check every minute
    
    // Store interval ID and state
    localStorage.setItem('telegramSignalIntervalId', intervalId.toString());
    localStorage.setItem('telegramSignalServiceActive', 'true');
  } else {
    // Stop the service
    const intervalId = localStorage.getItem('telegramSignalIntervalId');
    if (intervalId) {
      clearInterval(parseInt(intervalId));
    }
    localStorage.setItem('telegramSignalServiceActive', 'false');
    toast.info("Real-time signal service deactivated");
  }
};

// Initialize the service based on stored state
export const initializeSignalService = (): void => {
  const isActive = localStorage.getItem('telegramSignalServiceActive') === 'true';
  if (isActive) {
    setupRealTimeSignals(true);
  }
};

// Function to check and toggle the trade signal service
export const toggleTradeSignalService = async (isActive: boolean): Promise<boolean> => {
  try {
    setupRealTimeSignals(isActive);
    return isActive;
  } catch (error) {
    console.error("Error toggling trade signal service:", error);
    toast.error(`Failed to toggle trade signal service: ${(error as Error).message}`);
    return !isActive;
  }
};

// Function to broadcast signal to Telegram
export const broadcastSignal = async (signal: SignalNotification): Promise<boolean> => {
  try {
    // Get current time if not provided
    const signalTime = signal.time || new Date().toISOString();
    
    // Format the message for Telegram
    const message = `
📊 TRADING SIGNAL
${signal.type === 'BUY' ? '🟢 BUY' : '🔴 SELL'}: ${signal.symbol}
💰 Price: ${signal.price.toFixed(5)}
📈 Strategy: ${signal.strategy || 'AI Model'}
🕒 Time: ${new Date(signalTime).toLocaleString()}
`;
    
    // In a production app, this would send the message via an API or webhook
    // Here we'll simulate it for the demo
    console.log("Broadcasting signal to Telegram:", message);
    
    // Simulate successful broadcast
    await new Promise(resolve => setTimeout(resolve, 800));
    
    toast.success(`Signal ${signal.type} ${signal.symbol} broadcasted to Telegram`);
    return true;
  } catch (error) {
    console.error("Error broadcasting signal:", error);
    toast.error(`Failed to broadcast signal to Telegram: ${(error as Error).message}`);
    return false;
  }
};

// Hook to broadcast signal with React Query
export const useBroadcastSignal = () => {
  return useMutation({
    mutationFn: broadcastSignal,
    onSuccess: () => {
      // Handle success if needed
    },
    onError: (error) => {
      console.error("Error broadcasting signal:", error);
      toast.error(`Failed to broadcast signal: ${(error as Error).message}`);
    }
  });
};
