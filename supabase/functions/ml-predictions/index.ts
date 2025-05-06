
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
    )
    
    // Handle different prediction types
    const url = new URL(req.url);
    const predictionType = url.searchParams.get('type');
    
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
      )
    }
    
    const requestData = await req.json();
    let response;
    
    // Handle different prediction types
    switch(predictionType) {
      case 'market-prediction':
        response = await generateMarketPrediction(requestData, supabaseClient);
        break;
      case 'sentiment-analysis':
        response = await analyzeSentiment(requestData);
        break;
      case 'risk-assessment':
        response = await assessRisk(requestData);
        break;
      default:
        response = {
          error: 'Unknown prediction type'
        };
    }
    
    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Error:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})

// Mock ML service for market predictions
async function generateMarketPrediction(data: any, supabaseClient: any) {
  console.log('Generating market prediction for:', data.symbol);
  
  // In a production environment, this would call an actual ML model
  // For now, we'll generate a random prediction
  const signal = Math.random() > 0.5 ? 'BUY' : 'SELL';
  const confidence = 0.5 + (Math.random() * 0.4); // 0.5 - 0.9 confidence
  const price = data.currentPrice * (1 + ((Math.random() - 0.5) * 0.01)); // +/- 0.5% from current price
  
  // Create a new signal in the database
  const { data: newSignal, error } = await supabaseClient
    .from('enhanced_signals')
    .insert({
      symbol: data.symbol,
      type: signal,
      price: price,
      status: 'new',
      strategy_name: 'ML Prediction',
      confidence_score: confidence,
      technical_factors: {
        rsi: Math.random() * 100,
        macd: { value: Math.random() * 0.01 - 0.005, signal: Math.random() * 0.01 - 0.005 }
      },
      sentiment_factors: {
        news_score: Math.random() * 2 - 1, // -1 to 1
        social_score: Math.random() * 2 - 1, // -1 to 1
        overall_sentiment: Math.random() * 2 - 1 // -1 to 1
      }
    })
    .select()
  
  if (error) {
    console.error('Error creating signal:', error);
    return { error: error.message };
  }
  
  return {
    success: true,
    prediction: signal,
    confidence: confidence,
    price: price,
    signal: newSignal[0]
  };
}

// Mock sentiment analysis service
async function analyzeSentiment(data: any) {
  console.log('Analyzing sentiment for:', data.symbol, 'from sources:', data.sources);
  
  // In a production environment, this would call an NLP model or sentiment API
  const sentiments = {
    news: Math.random() * 2 - 1, // -1 to 1
    social: Math.random() * 2 - 1, // -1 to 1
    overall: 0
  };
  
  // Calculate overall sentiment (weighted average)
  sentiments.overall = (sentiments.news * 0.6) + (sentiments.social * 0.4);
  
  return {
    success: true,
    symbol: data.symbol,
    sentiment: sentiments,
    timestamp: new Date().toISOString()
  };
}

// Mock risk assessment service
async function assessRisk(data: any) {
  console.log('Assessing risk for:', data);
  
  // In a production environment, this would use a risk model
  const volatilityForecast = Math.random() * 0.1; // 0% to 10% volatility
  const drawdownProbability = Math.random() * 0.3; // 0% to 30% probability
  const expectedDrawdown = volatilityForecast * 2; // Estimated drawdown size
  
  // Categorize risks
  let riskLevel;
  if (volatilityForecast > 0.07) riskLevel = 'High';
  else if (volatilityForecast > 0.04) riskLevel = 'Medium';
  else riskLevel = 'Low';
  
  return {
    success: true,
    riskAssessment: {
      level: riskLevel,
      volatilityForecast,
      drawdown: {
        probability: drawdownProbability,
        expectedSize: expectedDrawdown
      },
      timeframe: data.timeframe || '1D'
    },
    timestamp: new Date().toISOString()
  };
}
