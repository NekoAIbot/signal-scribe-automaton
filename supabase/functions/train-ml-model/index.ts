
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
    
    // In a real implementation, this would communicate with ML training infrastructure
    // For development purposes, simulate model training
    
    // Simulate processing time based on epochs
    const trainingTime = Math.min(params.epochs * 100, 3000); // Cap at 3 seconds
    await new Promise(resolve => setTimeout(resolve, trainingTime));
    
    // Create a new model record
    const modelData = {
      name: `${params.modelType} ${new Date().toLocaleDateString()}`,
      type: params.modelType,
      version: '1.0.0',
      params: params,
      is_active: false,
      accuracy: 0.7 + Math.random() * 0.2, // 0.7-0.9 range
      indicators: params.indicators || ['RSI', 'MACD', 'EMA'],
      created_at: new Date().toISOString()
    };
    
    // Insert into database
    const { data: model, error } = await supabaseClient
      .from('ml_models')
      .insert(modelData)
      .select()
      .single();
    
    if (error) throw error;
    
    return new Response(
      JSON.stringify({
        success: true,
        model: model || modelData
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
