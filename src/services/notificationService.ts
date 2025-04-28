
import { API_KEYS, EMAIL_CONFIG } from "@/config/apiConfig";
import { toast } from "sonner";

// Function to send a Telegram notification
export const sendTelegramNotification = async (message: string): Promise<boolean> => {
  try {
    const botToken = API_KEYS.TELEGRAM_BOT_TOKEN;
    const chatId = API_KEYS.TELEGRAM_CHAT_ID;
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });
    
    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("Telegram notification sent:", data);
    toast.success("Notification sent to Telegram");
    return true;
  } catch (error) {
    console.error("Error sending Telegram notification:", error);
    toast.error("Failed to send Telegram notification");
    return false;
  }
};

// Function to send an email notification (simplified - backend would typically handle this)
export const sendEmailNotification = async (subject: string, body: string, to: string): Promise<boolean> => {
  // In a real app, this would likely be handled by a backend API
  // This is just a simulation for the frontend
  try {
    console.log(`Email would be sent from ${EMAIL_CONFIG.EMAIL_FROM} to ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${body}`);
    console.log(`Using SMTP: ${EMAIL_CONFIG.SMTP_SERVER}:${EMAIL_CONFIG.SMTP_PORT}`);
    
    // Simulate a successful email send
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast.success("Email notification sent");
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    toast.error("Failed to send email notification");
    return false;
  }
};

// Function to broadcast a signal to all channels
export const broadcastSignal = async (signal: {
  symbol: string;
  type: 'BUY' | 'SELL';
  price: number;
  strategy: string;
}): Promise<boolean> => {
  const message = `
<b>📊 TRADING SIGNAL</b>
<b>${signal.type}</b>: ${signal.symbol}
💰 Price: ${signal.price.toFixed(5)}
📈 Strategy: ${signal.strategy}
🕒 Time: ${new Date().toLocaleString()}
  `;
  
  return await sendTelegramNotification(message);
};
