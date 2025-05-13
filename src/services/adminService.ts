
import { toast } from "sonner";

// Defining our own types since the imports aren't working
export interface TradingStrategy {
  id: string;
  name: string;
  description?: string;
  assets?: string[];
  indicator?: string;
  timeframe?: string;
  status?: string;
  winRate?: number;
  risk_profile?: string;
  is_active?: boolean;
  indicators?: string[];
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  features: string[];
}

// Define the ML model type
export interface MLModel {
  id: string;
  name: string;
  type: 'LSTM' | 'Transformer' | 'DQN' | 'PPO' | 'GRU' | 'RandomForest' | 'XGBoost';
  accuracy: number;
  lastTrained: string;
  status: string;
  version: string;
  is_active: boolean;
}

// Define the user type
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  createdAt?: string;
  lastLogin?: string;
  subscriptionTier: 'free' | 'basic' | 'premium' | 'enterprise';
}

// Admin password in localStorage for development
const ADMIN_PASSWORD_KEY = 'admin_password';

// Admin password for demonstration - initialize with default if not set
export const ADMIN_PASSWORD = localStorage.getItem(ADMIN_PASSWORD_KEY) || "Nathan19@@";

// Admin password verification function
export const verifyAdminPassword = (password: string): boolean => {
  const currentPassword = localStorage.getItem(ADMIN_PASSWORD_KEY) || ADMIN_PASSWORD;
  return password === currentPassword;
};

// Update admin password
export const updateAdminPassword = (newPassword: string): void => {
  // Store the new password in localStorage
  localStorage.setItem(ADMIN_PASSWORD_KEY, newPassword);
  toast.success("Admin password has been updated successfully");
};

// Reset admin password function
export const resetAdminPassword = (): void => {
  // In a real app, this would reset the password in a database
  // For this demo, we just show a toast
  toast.success("Admin password has been reset to default");
};

// Telegram bot toggle function
export const toggleTelegramBot = async (isActive: boolean): Promise<boolean> => {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 800));
  
  if (isActive) {
    toast.success("Telegram signal bot activated");
  } else {
    toast.info("Telegram signal bot deactivated");
  }
  
  return isActive;
};

// Mock data
export const mockStrategies: TradingStrategy[] = [
  {
    id: '1',
    name: 'Moving Average Crossover',
    description: 'A strategy based on the crossing of two moving averages',
    assets: ['EURUSD', 'BTCUSDT'],
    indicator: 'Moving Average',
    timeframe: '1h',
    status: 'active',
    winRate: 68.5
  },
  {
    id: '2',
    name: 'RSI Divergence',
    description: 'Identifies potential reversals based on RSI divergence patterns',
    assets: ['GBPUSD', 'ETHUSD'],
    indicator: 'RSI',
    timeframe: '4h',
    status: 'active',
    winRate: 72.1
  }
];

export const mockModels: MLModel[] = [
  {
    id: '1',
    name: 'ForexPredictor-v1',
    type: 'LSTM' as const,
    accuracy: 78.4,
    lastTrained: '2023-12-01',
    status: 'active',
    version: '1.0',
    is_active: true
  },
  {
    id: '2',
    name: 'CryptoTrend-v2',
    type: 'Transformer' as const,
    accuracy: 82.1,
    lastTrained: '2024-01-15',
    status: 'active',
    version: '1.0',
    is_active: true
  }
];

export const mockUsers: User[] = [
  {
    id: '1',
    name: 'John Trader',
    email: 'john@example.com',
    role: 'admin',
    createdAt: '2023-10-01',
    lastLogin: '2024-04-15',
    subscriptionTier: 'enterprise'
  },
  {
    id: '2',
    name: 'Alice Investor',
    email: 'alice@example.com',
    role: 'user',
    createdAt: '2023-11-15',
    lastLogin: '2024-04-10',
    subscriptionTier: 'premium'
  }
];

// In-memory data storage
let strategies: typeof mockStrategies = [...mockStrategies];
let models: typeof mockModels = [...mockModels];
let users = [...mockUsers];

// Strategy management
export const getStrategies = async (): Promise<typeof mockStrategies> => {
  return strategies;
};

export const addStrategy = async (strategy: TradingStrategy): Promise<TradingStrategy> => {
  const newStrategy = {
    ...strategy,
    description: strategy.description || '',
  };
  strategies = [...strategies, newStrategy];
  toast.success(`Strategy "${strategy.name}" added`);
  return strategy;
};

export const updateStrategy = async (strategy: TradingStrategy): Promise<TradingStrategy> => {
  strategies = strategies.map(s => s.id === strategy.id ? {...strategy, description: strategy.description || ''} : s);
  toast.success(`Strategy "${strategy.name}" updated`);
  return strategy;
};

export const deleteStrategy = async (id: string): Promise<void> => {
  strategies = strategies.filter(s => s.id !== id);
  toast.success("Strategy deleted");
  return;
};

// ML model management
export const getModels = async (): Promise<typeof mockModels> => {
  return models;
};

export const addModel = async (model: MLModel): Promise<MLModel> => {
  try {
    const newModel = {
      ...model,
      lastTrained: model.lastTrained || new Date().toISOString().split('T')[0],
      status: model.status || 'active',
      version: model.version || '1.0',
      is_active: model.is_active !== undefined ? model.is_active : true
    };
    models = [...models, newModel];
    toast.success(`Model "${model.name}" added`);
    return model;
  } catch (error) {
    console.error("Error adding model:", error);
    toast.error(`Failed to add model "${model.name}"`);
    throw error;
  }
};

export const updateModel = async (model: MLModel): Promise<MLModel> => {
  try {
    models = models.map(m => m.id === model.id ? {
      ...model, 
      lastTrained: model.lastTrained || new Date().toISOString().split('T')[0], 
      status: model.status || 'active',
      version: model.version || '1.0',
      is_active: model.is_active !== undefined ? model.is_active : true
    } : m);
    toast.success(`Model "${model.name}" updated`);
    return model;
  } catch (error) {
    console.error("Error updating model:", error);
    toast.error(`Failed to update model "${model.name}"`);
    throw error;
  }
};

export const deleteModel = async (id: string): Promise<void> => {
  models = models.filter(m => m.id !== id);
  toast.success("Model deleted");
  return;
};

export const trainModel = async (id: string): Promise<MLModel> => {
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Update the model
    const updatedModels = models.map(m => {
      if (m.id === id) {
        return {
          ...m,
          lastTrained: new Date().toISOString().split('T')[0],
          accuracy: parseFloat((m.accuracy + (Math.random() * 5 - 2)).toFixed(1)) // Slightly adjust accuracy
        };
      }
      return m;
    });
    
    models = updatedModels;
    
    const updatedModel = models.find(m => m.id === id);
    if (!updatedModel) throw new Error("Model not found");
    
    toast.success(`Model "${updatedModel.name}" has been trained`);
    return updatedModel;
  } catch (error) {
    console.error("Error training model:", error);
    toast.error(`Failed to train model: ${(error as Error).message}`);
    throw error;
  }
};

// User management
export const getUsers = async (): Promise<User[]> => {
  return users;
};

export const addUser = async (user: User): Promise<User> => {
  try {
    // Generate a temporary password for new users
    const temporaryPassword = Math.random().toString(36).slice(-8);
    
    // In a real app, you would send an email with this password
    console.log(`Temporary password for ${user.email}: ${temporaryPassword}`);
    
    // Add user with generated ID
    const newUser = {
      ...user, 
      id: (users.length + 1).toString(),
      temporaryPassword // This would be hashed in a real app
    };
    
    users = [...users, newUser];
    toast.success(`User "${user.name}" added with temporary password`);
    return user;
  } catch (error) {
    console.error("Error adding user:", error);
    toast.error(`Failed to add user "${user.name}"`);
    throw error;
  }
};

export const updateUser = async (user: User): Promise<User> => {
  users = users.map(u => u.id === user.id ? user : u);
  toast.success(`User "${user.name}" updated`);
  return user;
};

export const deleteUser = async (id: string): Promise<void> => {
  users = users.filter(u => u.id !== id);
  toast.success("User deleted");
  return;
};

// Subscription plan management
export const getSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  // These would typically come from a database
  return [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      features: [
        'Basic market data',
        '2 trading strategies',
        'Manual trading signals',
        'Email support'
      ]
    },
    {
      id: 'basic',
      name: 'Basic',
      price: 29.99,
      features: [
        'Real-time market data',
        '5 trading strategies',
        'Automated trading signals',
        'Technical indicators',
        'Priority email support'
      ]
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 99.99,
      features: [
        'Advanced real-time data',
        'Unlimited trading strategies',
        'Custom ML models',
        'API access',
        '24/7 support',
        'Strategy backtesting'
      ]
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 499.99,
      features: [
        'All Premium features',
        'Dedicated account manager',
        'Custom development',
        'White-label solution',
        'Multi-user access'
      ]
    }
  ];
};

// System admin functions
export const getSystemStatus = async (): Promise<Record<string, any>> => {
  // This would typically come from monitoring services
  return {
    apiStatus: 'operational',
    databaseStatus: 'operational',
    mlServiceStatus: 'operational',
    tradingEngineStatus: 'operational',
    lastIncident: '2024-03-15',
    uptime: '99.98%',
    activeUsers: 142,
    signalsToday: 28,
    tradesExecuted: 315
  };
};
