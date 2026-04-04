import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { marketData, availableModels, availableStrategies } = await req.json();
    console.log('AI Strategy Selector called with:', { marketData, modelCount: availableModels?.length, strategyCount: availableStrategies?.length });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Create prompt for AI analysis
    const systemPrompt = `You are an expert forex trading AI assistant. Analyze market conditions and recommend the best trading strategies and ML models to use.

Your task:
1. Analyze the current market data provided
2. Recommend which trading strategies should be active based on market conditions
3. Recommend which ML models would perform best in current conditions
4. Provide confidence scores and reasoning

Respond with a JSON object using the suggest_strategy tool.`;

    const userPrompt = `Current Market Data:
${JSON.stringify(marketData, null, 2)}

Available ML Models:
${JSON.stringify(availableModels?.map((m: any) => ({ id: m.id, name: m.name, type: m.type, accuracy: m.accuracy })), null, 2)}

Available Strategies:
${JSON.stringify(availableStrategies?.map((s: any) => ({ id: s.id, name: s.name, risk_profile: s.risk_profile, indicators: s.indicators })), null, 2)}

Analyze these conditions and recommend which strategies and models to activate.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_strategy",
              description: "Provide strategy and model recommendations based on market analysis",
              parameters: {
                type: "object",
                properties: {
                  market_analysis: {
                    type: "object",
                    properties: {
                      trend: { type: "string", enum: ["bullish", "bearish", "ranging", "volatile"] },
                      volatility: { type: "string", enum: ["low", "medium", "high"] },
                      sentiment: { type: "string", enum: ["positive", "negative", "neutral"] },
                      key_levels: { type: "array", items: { type: "number" } }
                    },
                    required: ["trend", "volatility", "sentiment"]
                  },
                  recommended_strategies: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        strategy_id: { type: "string" },
                        confidence: { type: "number" },
                        reason: { type: "string" }
                      },
                      required: ["strategy_id", "confidence", "reason"]
                    }
                  },
                  recommended_models: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        model_id: { type: "string" },
                        confidence: { type: "number" },
                        reason: { type: "string" }
                      },
                      required: ["model_id", "confidence", "reason"]
                    }
                  },
                  overall_recommendation: { type: "string" },
                  risk_assessment: { type: "string", enum: ["low", "medium", "high"] }
                },
                required: ["market_analysis", "recommended_strategies", "recommended_models", "overall_recommendation", "risk_assessment"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "suggest_strategy" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log('AI Response:', JSON.stringify(aiResponse));

    // Parse the tool call response
    let recommendation;
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        recommendation = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error('Failed to parse AI response:', e);
        recommendation = generateFallbackRecommendation(availableStrategies, availableModels);
      }
    } else {
      recommendation = generateFallbackRecommendation(availableStrategies, availableModels);
    }

    // Get user ID for saving recommendation
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user && recommendation.recommended_strategies?.length > 0) {
      // Save recommendation to database
      const { error } = await supabaseClient
        .from('ai_strategy_recommendations')
        .insert({
          user_id: user.id,
          strategy_id: recommendation.recommended_strategies[0]?.strategy_id || null,
          market_analysis: recommendation.market_analysis,
          recommended_models: recommendation.recommended_models?.map((m: any) => m.model_id) || [],
          confidence_score: recommendation.recommended_strategies[0]?.confidence || 0.5,
          reasoning: recommendation.overall_recommendation
        });

      if (error) {
        console.error('Error saving recommendation:', error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        recommendation
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('AI Strategy Selector error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      },
    );
  }
});

function generateFallbackRecommendation(strategies: any[], models: any[]) {
  return {
    market_analysis: {
      trend: "ranging",
      volatility: "medium",
      sentiment: "neutral",
      key_levels: []
    },
    recommended_strategies: strategies?.slice(0, 2).map((s: any) => ({
      strategy_id: s.id,
      confidence: 0.7,
      reason: "Default recommendation based on strategy configuration"
    })) || [],
    recommended_models: models?.slice(0, 2).map((m: any) => ({
      model_id: m.id,
      confidence: 0.7,
      reason: `${m.type} model suitable for current conditions`
    })) || [],
    overall_recommendation: "Market conditions are neutral. Using balanced approach with multiple models.",
    risk_assessment: "medium"
  };
}
