-- Add model_ids array column for multi-model support
ALTER TABLE public.trading_strategies 
ADD COLUMN IF NOT EXISTS model_ids uuid[] DEFAULT '{}';

-- Add ai_auto_select column for AI-powered strategy selection
ALTER TABLE public.trading_strategies 
ADD COLUMN IF NOT EXISTS ai_auto_select boolean DEFAULT false;

-- Add market_conditions column to track when to use the strategy
ALTER TABLE public.trading_strategies 
ADD COLUMN IF NOT EXISTS market_conditions jsonb DEFAULT '{}';

-- Create table for AI strategy recommendations
CREATE TABLE IF NOT EXISTS public.ai_strategy_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  strategy_id uuid REFERENCES public.trading_strategies(id) ON DELETE CASCADE,
  market_analysis jsonb NOT NULL DEFAULT '{}',
  recommended_models uuid[] DEFAULT '{}',
  confidence_score numeric DEFAULT 0,
  reasoning text,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + interval '1 hour')
);

-- Enable RLS
ALTER TABLE public.ai_strategy_recommendations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own recommendations"
ON public.ai_strategy_recommendations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recommendations"
ON public.ai_strategy_recommendations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recommendations"
ON public.ai_strategy_recommendations
FOR DELETE
USING (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_user_id ON public.ai_strategy_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_strategy_id ON public.ai_strategy_recommendations(strategy_id);