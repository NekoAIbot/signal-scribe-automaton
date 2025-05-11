
import { AIInsight, MLModel, TrainingParams } from "./types";
import { toast } from "sonner";

// Function to get AI insights
export const getAIInsights = async (): Promise<AIInsight | null> => {
  try {
    // For now, we'll skip database interactions and use mock data
    // This avoids errors when tables don't exist yet
    return generateMockAIInsights();
  } catch (error) {
    console.error("Error fetching AI insights:", error);
    
    // Return mock insights as fallback
    return generateMockAIInsights();
  }
};

// Function to generate mock AI insights for development
export const generateMockAIInsights = (): AIInsight => {
  const marketPredictions = ['Bullish', 'Bearish', 'Neutral'] as const;
  const riskLevels = ['Low', 'Medium', 'High'] as const;
  
  const prediction = marketPredictions[Math.floor(Math.random() * marketPredictions.length)];
  const risk = riskLevels[Math.floor(Math.random() * riskLevels.length)];
  
  const topOpportunities = [];
  const symbols = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD'];
  const directions = ['BUY', 'SELL'];
  
  for (let i = 0; i < 3; i++) {
    topOpportunities.push({
      symbol: symbols[Math.floor(Math.random() * symbols.length)],
      direction: directions[Math.floor(Math.random() * directions.length)],
      score: 0.7 + Math.random() * 0.3 // 70-100% confidence
    });
  }
  
  return {
    marketPrediction: prediction,
    riskAssessment: risk,
    confidenceLevel: 0.6 + Math.random() * 0.39, // 60-99% confidence
    created_at: new Date().toISOString(),
    topOpportunities
  };
};

// Function to get ML models
export const getMLModels = async (): Promise<MLModel[]> => {
  try {
    // For now, we'll skip database interactions and use mock data
    // This avoids errors when tables don't exist yet
    return generateMockMLModels();
  } catch (error) {
    console.error("Error fetching ML models:", error);
    
    // Return mock models as fallback
    return generateMockMLModels();
  }
};

// Function to generate mock ML models for development
export const generateMockMLModels = (count: number = 5): MLModel[] => {
  const modelTypes = ['DQN', 'PPO', 'LSTM', 'Transformer', 'GRU', 'RandomForest', 'XGBoost'] as const;
  const models: MLModel[] = [];
  
  for (let i = 0; i < count; i++) {
    const type = modelTypes[Math.floor(Math.random() * modelTypes.length)];
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 60)); // Up to 60 days ago
    
    models.push({
      id: `model-${i}-${Date.now()}`,
      name: `${type} Model ${Math.floor(Math.random() * 100)}`,
      type,
      version: `${Math.floor(Math.random() * 3)}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
      is_active: Math.random() > 0.3,
      created_at: date.toISOString(),
      accuracy: 0.7 + Math.random() * 0.25, // 70-95% accuracy
      indicators: ['RSI', 'MACD', 'EMA', 'Bollinger', 'ATR'].slice(0, Math.floor(Math.random() * 5) + 1)
    });
  }
  
  return models;
};

// Function to train a new ML model
export const trainMLModel = async (params: TrainingParams): Promise<MLModel | null> => {
  try {
    toast.loading(`Training ${params.modelType} model, please wait...`);
    
    // Simulate model training for development
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const model: MLModel = {
      id: `model-${Date.now()}`,
      name: `${params.modelType} Model`,
      type: params.modelType,
      version: "1.0.0",
      is_active: true,
      created_at: new Date().toISOString(),
      accuracy: 0.7 + Math.random() * 0.25,
      indicators: params.indicators || ['RSI', 'MACD', 'EMA']
    };
    
    toast.success(`${params.modelType} model training completed (mock)`);
    return model;
  } catch (error) {
    console.error("Error training ML model:", error);
    toast.error(`Failed to train ${params.modelType} model: ${(error as Error).message}`);
    return null;
  }
};
