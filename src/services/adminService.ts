
import { toast } from "sonner";
import { 
  TradingStrategy, 
  MLModel, 
  EnhancedSignal, 
  BacktestResult,
  TrainingParams
} from "@/services/ai/types";
import { broadcastSignal } from '@/services/notificationService';

// Mock admin data 
const mockStrategies = [
  { 
    id: '1', 
    name: 'Trend Following', 
    description: 'Uses moving averages to identify trends',
    model_id: '1',
    risk_profile: 'Medium' as const,
    is_active: true,
    indicators: ['EMA', 'MACD', 'ADX']
  },
  { 
    id: '2', 
    name: 'RSI Reversal', 
    description: 'Spots overbought and oversold conditions',
    model_id: '2',
    risk_profile: 'High' as const,
    is_active: true,
    indicators: ['RSI', 'Stochastic', 'CCI']
  }
];

const mockModels = [
  {
    id: '1',
    name: 'Regression Model v1',
    type: 'LSTM' as const,
    accuracy: 78.4,
    lastTrained: '2023-12-01',
    status: 'active'
  },
  {
    id: '2',
    name: 'Classification Model v2',
    type: 'Transformer' as const,
    accuracy: 82.1,
    lastTrained: '2024-01-15',
    status: 'active'
  }
];

const mockUsers = [
  {
    id: '1',
    name: 'John Trader',
    email: 'john@example.com',
    role: 'user' as const,
    subscriptionTier: 'premium' as const,
    lastLogin: '2024-05-10'
  },
  {
    id: '2',
    name: 'Sarah Analyst',
    email: 'sarah@example.com',
    role: 'user' as const,
    subscriptionTier: 'basic' as const,
    lastLogin: '2024-05-09'
  }
];

// In-memory data storage
let strategies = [...mockStrategies];
let models = [...mockModels];
let users = [...mockUsers];

// Admin password for demonstration
export const ADMIN_PASSWORD = "Nathan19@@";

// Strategy management
export const getStrategies = async (): Promise<TradingStrategy[]> => {
  return strategies;
};

export const addStrategy = async (strategy: TradingStrategy): Promise<TradingStrategy> => {
  strategies = [...strategies, strategy];
  toast.success(`Strategy "${strategy.name}" added`);
  return strategy;
};

export const updateStrategy = async (strategy: TradingStrategy): Promise<TradingStrategy> => {
  strategies = strategies.map(s => s.id === strategy.id ? strategy : s);
  toast.success(`Strategy "${strategy.name}" updated`);
  return strategy;
};

export const deleteStrategy = async (id: string): Promise<boolean> => {
  strategies = strategies.filter(s => s.id !== id);
  toast.success("Strategy deleted");
  return true;
};

// ML model management
export const getModels = async (): Promise<MLModel[]> => {
  return models;
};

export const addModel = async (model: MLModel): Promise<MLModel> => {
  models = [...models, model];
  toast.success(`Model "${model.name}" added`);
  return model;
};

export const updateModel = async (model: MLModel): Promise<MLModel> => {
  models = models.map(m => m.id === model.id ? model : m);
  toast.success(`Model "${model.name}" updated`);
  return model;
};

export const deleteModel = async (id: string): Promise<boolean> => {
  models = models.filter(m => m.id !== id);
  toast.success("Model deleted");
  return true;
};

export const trainModel = async (params: TrainingParams | MLModel): Promise<MLModel> => {
  const modelId = 'id' in params ? params.id : `model-${Date.now()}`;
  const modelName = 'name' in params ? params.name : `Model ${Date.now().toString().slice(-4)}`;
  const modelType = 'type' in params ? params.type : params.modelType;
  
  toast.loading(`Training ${modelName}...`, {
    id: `train-model-${modelId}`
  });
  
  // Simulate training time
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Update or add the model
  const newAccuracy = Math.round((70 + Math.random() * 20) * 10) / 10; // 70-90% accuracy
  const trainedModel = {
    id: modelId,
    name: modelName,
    type: modelType,
    accuracy: newAccuracy,
    lastTrained: new Date().toISOString().split('T')[0],
    status: 'active'
  };
  
  if ('id' in params) {
    // Update existing model
    models = models.map(m => m.id === modelId ? trainedModel : m);
  } else {
    // Add new model
    models = [...models, trainedModel];
  }
  
  toast.success(`Model "${trainedModel.name}" trained successfully (Accuracy: ${trainedModel.accuracy}%)`, {
    id: `train-model-${modelId}`
  });
  
  return trainedModel;
};

// User management
export const getUsers = async (): Promise<typeof mockUsers> => {
  return users;
};

export const addUser = async (user: typeof mockUsers[0]): Promise<typeof mockUsers[0]> => {
  users = [...users, user];
  toast.success(`User "${user.name}" added`);
  return user;
};

export const updateUser = async (user: typeof mockUsers[0]): Promise<typeof mockUsers[0]> => {
  users = users.map(u => u.id === user.id ? user : u);
  toast.success(`User "${user.name}" updated`);
  return user;
};

export const deleteUser = async (id: string): Promise<boolean> => {
  users = users.filter(u => u.id !== id);
  toast.success("User deleted");
  return true;
};

// Bot control
export const toggleTelegramBot = async (activate: boolean): Promise<boolean> => {
  if (activate) {
    // Simulate starting the Telegram bot
    toast.success("Telegram copy-trading bot activated");
    await broadcastSignal({ 
      symbol: "System", 
      type: "NOTIFICATION", 
      message: "Telegram signal generation has been activated",
      timestamp: new Date().toISOString() 
    });
  } else {
    // Simulate stopping the Telegram bot
    toast.info("Telegram copy-trading bot deactivated");
    await broadcastSignal({ 
      symbol: "System", 
      type: "NOTIFICATION", 
      message: "Telegram signal generation has been deactivated",
      timestamp: new Date().toISOString() 
    });
  }
  
  return activate;
};

// System verification
export const verifyAdminPassword = (password: string): boolean => {
  return password === ADMIN_PASSWORD;
};

export const resetAdminPassword = async (): Promise<string> => {
  // In a real system, this would generate a new random password
  // For this demo, we'll just confirm the existing one
  toast.success("Admin password confirmed");
  return ADMIN_PASSWORD;
};
