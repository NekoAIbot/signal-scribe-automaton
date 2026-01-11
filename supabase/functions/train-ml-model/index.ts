
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    
    const params = await req.json();
    console.log('Training model with parameters:', JSON.stringify(params));
    
    // Get user ID for the model
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }
    
    // Simulate model training with realistic processing time
    const trainingTime = Math.min((params.epochs || 100) * 20, 5000); // Cap at 5 seconds
    await new Promise(resolve => setTimeout(resolve, trainingTime));
    
    // Generate realistic accuracy based on model type and parameters
    let baseAccuracy = 0.70;
    switch (params.modelType) {
      case 'Transformer':
        baseAccuracy = 0.78;
        break;
      case 'LSTM':
        baseAccuracy = 0.75;
        break;
      case 'XGBoost':
        baseAccuracy = 0.77;
        break;
      case 'RandomForest':
        baseAccuracy = 0.73;
        break;
      case 'DQN':
      case 'PPO':
        baseAccuracy = 0.72;
        break;
      case 'GRU':
        baseAccuracy = 0.74;
        break;
    }
    
    // Add some variance based on epochs and indicators
    const epochBonus = Math.min(params.epochs / 1000, 0.1);
    const indicatorBonus = Math.min((params.indicators?.length || 3) * 0.01, 0.05);
    const accuracy = Math.min(baseAccuracy + epochBonus + indicatorBonus + (Math.random() * 0.05), 0.95);
    
    // Create model record
    const modelData = {
      user_id: user.id,
      name: params.name || `${params.modelType} ${new Date().toLocaleDateString()}`,
      type: params.modelType,
      version: '1.0.0',
      params: {
        epochs: params.epochs,
        learningRate: params.learningRate,
        batchSize: params.batchSize,
        dataWindow: params.dataWindow,
        symbols: params.symbols || ['EUR/USD', 'GBP/USD'],
      },
      is_active: true,
      accuracy: parseFloat(accuracy.toFixed(4)),
      indicators: params.indicators || ['RSI', 'MACD', 'EMA'],
      last_trained_at: new Date().toISOString()
    };
    
    // Insert into database
    const { data: model, error } = await supabaseClient
      .from('ml_models')
      .insert(modelData)
      .select()
      .single();
    
    if (error) {
      console.error('Database error:', error);
      throw error;
    }
    
    console.log('Model created successfully:', model);
    
    return new Response(
      JSON.stringify({
        success: true,
        model: {
          id: model.id,
          name: model.name,
          type: model.type,
          accuracy: model.accuracy,
          version: model.version,
          is_active: model.is_active,
          indicators: model.indicators,
          created_at: model.created_at,
          last_trained_at: model.last_trained_at
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Error training model:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});
