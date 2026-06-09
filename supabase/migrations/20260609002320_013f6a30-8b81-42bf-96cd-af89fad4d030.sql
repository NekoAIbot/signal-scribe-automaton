
-- Add new tier enum values (must be committed before usage)
ALTER TYPE public.subscription_tier ADD VALUE IF NOT EXISTS 'starter';
ALTER TYPE public.subscription_tier ADD VALUE IF NOT EXISTS 'pro';
