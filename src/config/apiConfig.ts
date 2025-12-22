// API Configuration - Only publishable/non-sensitive keys
// All sensitive API keys have been moved to Lovable Cloud secrets

export const API_LIMITS = {
  TWELVEDATA_DAILY_LIMIT: 800,
  ALPHAVANTAGE_DAILY_LIMIT: 500
};

export const CONFIG_FLAGS = {
  USE_MOCK_MT5: true, // Set to false when MT5 integration is configured
  EXHAUSTIVE_SEARCH: true
};

// Email configuration (non-sensitive)
export const EMAIL_CONFIG = {
  SMTP_SERVER: 'smtp.gmail.com',
  SMTP_PORT: 587
};
