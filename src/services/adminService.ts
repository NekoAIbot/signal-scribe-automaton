import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Type definitions
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
  model_id?: string;
  model_ids?: string[];
  ai_auto_select?: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  features: string[];
}

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

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  createdAt?: string;
  lastLogin?: string;
  subscriptionTier: 'free' | 'basic' | 'premium' | 'enterprise';
}

// Check if user has admin role
export const checkAdminRole = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();
    
    return !error && data?.role === 'admin';
  } catch {
    return false;
  }
};

// Telegram bot toggle function
export const toggleTelegramBot = async (isActive: boolean): Promise<boolean> => {
  try {
    if (isActive) {
      // Test Telegram connection via edge function
      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: {
          type: 'telegram',
          message: '🤖 Telegram bot activated! You will receive trading signals here.'
        }
      });
      
      if (error) throw error;
      
      if (data?.success) {
        toast.success("Telegram signal bot activated");
      } else {
        toast.warning("Telegram not configured. Please add TELEGRAM_BOT_TOKEN secret.");
      }
    } else {
      toast.info("Telegram signal bot deactivated");
    }
    
    return isActive;
  } catch (error) {
    console.error("Telegram toggle error:", error);
    toast.error("Failed to toggle Telegram bot");
    return false;
  }
};

// Strategy management with database
export const getStrategies = async (): Promise<TradingStrategy[]> => {
  try {
    const { data, error } = await supabase
      .from('trading_strategies')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(s => ({
      id: s.id,
      name: s.name,
      description: s.description || '',
      assets: s.assets || [],
      indicator: s.indicator || '',
      timeframe: s.timeframe || '1h',
      status: s.status || 'active',
      winRate: Number(s.win_rate) || 0,
      risk_profile: s.risk_profile || 'medium',
      is_active: s.is_active,
      indicators: s.indicators || [],
      model_id: s.model_ids?.[0] || '',
      model_ids: s.model_ids || [],
      ai_auto_select: s.ai_auto_select ?? false,
    }));
  } catch (error) {
    console.error("Error fetching strategies:", error);
    return [];
  }
};

export const addStrategy = async (strategy: TradingStrategy): Promise<TradingStrategy> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const normalizedModelIds = strategy.ai_auto_select
      ? []
      : strategy.model_ids?.length
        ? strategy.model_ids
        : strategy.model_id
          ? [strategy.model_id]
          : [];
    
    const { data, error } = await supabase
      .from('trading_strategies')
      .insert({
        user_id: user.id,
        name: strategy.name,
        description: strategy.description || '',
        assets: strategy.assets || [],
        indicator: strategy.indicator || '',
        timeframe: strategy.timeframe || '1h',
        status: (strategy.status as 'active' | 'inactive' | 'testing') || 'active',
        win_rate: strategy.winRate || 0,
        risk_profile: strategy.risk_profile || 'medium',
        is_active: strategy.is_active !== false,
        indicators: strategy.indicators || [],
        model_ids: normalizedModelIds,
        ai_auto_select: strategy.ai_auto_select ?? false,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    toast.success(`Strategy "${strategy.name}" added`);
    return { ...strategy, id: data.id };
  } catch (error) {
    console.error("Error adding strategy:", error);
    toast.error(`Failed to add strategy`);
    throw error;
  }
};

export const updateStrategy = async (strategy: TradingStrategy): Promise<TradingStrategy> => {
  try {
    const normalizedModelIds = strategy.ai_auto_select
      ? []
      : strategy.model_ids?.length
        ? strategy.model_ids
        : strategy.model_id
          ? [strategy.model_id]
          : [];

    const { error } = await supabase
      .from('trading_strategies')
      .update({
        name: strategy.name,
        description: strategy.description || '',
        assets: strategy.assets || [],
        indicator: strategy.indicator || '',
        timeframe: strategy.timeframe || '1h',
        status: (strategy.status as 'active' | 'inactive' | 'testing') || 'active',
        win_rate: strategy.winRate || 0,
        risk_profile: strategy.risk_profile || 'medium',
        is_active: strategy.is_active,
        indicators: strategy.indicators || [],
        model_ids: normalizedModelIds,
        ai_auto_select: strategy.ai_auto_select ?? false,
      })
      .eq('id', strategy.id);
    
    if (error) throw error;
    
    toast.success(`Strategy "${strategy.name}" updated`);
    return strategy;
  } catch (error) {
    console.error("Error updating strategy:", error);
    toast.error(`Failed to update strategy`);
    throw error;
  }
};

export const deleteStrategy = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('trading_strategies')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    toast.success("Strategy deleted");
  } catch (error) {
    console.error("Error deleting strategy:", error);
    toast.error("Failed to delete strategy");
    throw error;
  }
};

// ML model management with database
export const getModels = async (): Promise<MLModel[]> => {
  try {
    const { data, error } = await supabase
      .from('ml_models')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(m => ({
      id: m.id,
      name: m.name,
      type: m.type as MLModel['type'],
      accuracy: Number(m.accuracy) || 0,
      lastTrained: m.last_trained_at ? new Date(m.last_trained_at).toLocaleDateString() : 'Never',
      status: m.is_active ? 'active' : 'inactive',
      version: m.version || '1.0',
      is_active: m.is_active
    }));
  } catch (error) {
    console.error("Error fetching models:", error);
    return [];
  }
};

export const addModel = async (model: MLModel): Promise<MLModel> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    
    const { data, error } = await supabase
      .from('ml_models')
      .insert({
        user_id: user.id,
        name: model.name,
        type: model.type,
        accuracy: model.accuracy || 0,
        version: model.version || '1.0',
        is_active: model.is_active !== false
      })
      .select()
      .single();
    
    if (error) throw error;
    
    toast.success(`Model "${model.name}" added`);
    return { ...model, id: data.id };
  } catch (error) {
    console.error("Error adding model:", error);
    toast.error(`Failed to add model`);
    throw error;
  }
};

export const updateModel = async (model: MLModel): Promise<MLModel> => {
  try {
    const { error } = await supabase
      .from('ml_models')
      .update({
        name: model.name,
        type: model.type,
        accuracy: model.accuracy,
        version: model.version,
        is_active: model.is_active
      })
      .eq('id', model.id);
    
    if (error) throw error;
    
    toast.success(`Model "${model.name}" updated`);
    return model;
  } catch (error) {
    console.error("Error updating model:", error);
    toast.error(`Failed to update model`);
    throw error;
  }
};

export const deleteModel = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('ml_models')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    toast.success("Model deleted");
  } catch (error) {
    console.error("Error deleting model:", error);
    toast.error("Failed to delete model");
    throw error;
  }
};

export const trainModel = async (id: string): Promise<MLModel> => {
  try {
    const { data, error } = await supabase.functions.invoke('train-ml-model', {
      body: { modelId: id }
    });
    
    if (error) throw error;
    
    // Update the model's last trained timestamp
    await supabase
      .from('ml_models')
      .update({ last_trained_at: new Date().toISOString() })
      .eq('id', id);
    
    const models = await getModels();
    const updatedModel = models.find(m => m.id === id);
    
    if (!updatedModel) throw new Error("Model not found");
    
    toast.success(`Model "${updatedModel.name}" has been trained`);
    return updatedModel;
  } catch (error) {
    console.error("Error training model:", error);
    toast.error(`Failed to train model`);
    throw error;
  }
};

// User management (admin only)
export const getUsers = async (): Promise<User[]> => {
  try {
    const isAdmin = await checkAdminRole();
    if (!isAdmin) {
      toast.error("Admin access required");
      return [];
    }
    
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Get roles for all users
    const userIds = (profiles || []).map(p => p.id);
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('user_id', userIds);
    
    const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);
    
    return (profiles || []).map(p => ({
      id: p.id,
      name: p.name || '',
      email: p.email || '',
      role: roleMap.get(p.id) === 'admin' ? 'admin' : 'user',
      createdAt: p.created_at ? new Date(p.created_at).toLocaleDateString() : '',
      lastLogin: p.updated_at ? new Date(p.updated_at).toLocaleDateString() : '',
      subscriptionTier: (p.subscription_tier as User['subscriptionTier']) || 'free'
    }));
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
};

export const addUser = async (user: User): Promise<User> => {
  toast.info("User registration is handled through the signup flow");
  return user;
};

export const updateUser = async (user: User): Promise<User> => {
  try {
    const isAdmin = await checkAdminRole();
    if (!isAdmin) throw new Error("Admin access required");
    
    // Update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        name: user.name,
        subscription_tier: user.subscriptionTier
      })
      .eq('id', user.id);
    
    if (profileError) throw profileError;
    
    // Update role if changed
    if (user.role === 'admin') {
      await supabase
        .from('user_roles')
        .upsert({
          user_id: user.id,
          role: 'admin'
        }, { onConflict: 'user_id,role' });
    }
    
    toast.success(`User "${user.name}" updated`);
    return user;
  } catch (error) {
    console.error("Error updating user:", error);
    toast.error("Failed to update user");
    throw error;
  }
};

export const deleteUser = async (id: string): Promise<void> => {
  toast.warning("User deletion must be done through the backend for security");
};

// Subscription plans (from database)
export const getSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  try {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });
    
    if (error) throw error;
    
    return (data || []).map(p => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      features: p.features || []
    }));
  } catch (error) {
    console.error("Error fetching subscription plans:", error);
    return [];
  }
};

// System status
export const getSystemStatus = async (): Promise<Record<string, any>> => {
  try {
    // Get real counts from database
    const [
      { count: userCount },
      { count: signalCount },
      { count: strategyCount }
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('trading_signals').select('*', { count: 'exact', head: true }),
      supabase.from('trading_strategies').select('*', { count: 'exact', head: true })
    ]);
    
    return {
      apiStatus: 'operational',
      databaseStatus: 'operational',
      mlServiceStatus: 'operational',
      tradingEngineStatus: 'operational',
      lastIncident: 'None',
      uptime: '99.98%',
      activeUsers: userCount || 0,
      signalsToday: signalCount || 0,
      strategiesActive: strategyCount || 0
    };
  } catch (error) {
    console.error("Error fetching system status:", error);
    return {
      apiStatus: 'unknown',
      databaseStatus: 'error',
      mlServiceStatus: 'unknown',
      tradingEngineStatus: 'unknown'
    };
  }
};
