
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MLModel, TradingStrategy } from "./types";

// Function to fetch available ML models
export const getActiveModels = async () => {
  try {
    // Force type casting with `as any` to bypass TypeScript's type checking for database tables
    const { data, error } = await (supabase as any)
      .from('ml_models')
      .select('*')
      .eq('is_active', true);
      
    if (error) throw error;
    return data as MLModel[];
  } catch (error) {
    console.error("Error fetching ML models:", error);
    toast.error("Failed to load ML models");
    return [];
  }
};

// Function to fetch active trading strategies
export const getActiveStrategies = async () => {
  try {
    const { data, error } = await (supabase as any)
      .from('trading_strategies')
      .select('*')
      .eq('is_active', true);
      
    if (error) throw error;
    return data as TradingStrategy[];
  } catch (error) {
    console.error("Error fetching trading strategies:", error);
    toast.error("Failed to load trading strategies");
    return [];
  }
};
