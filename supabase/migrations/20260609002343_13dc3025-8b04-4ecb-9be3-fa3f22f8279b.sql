
ALTER TABLE public.broker_credentials
  ALTER COLUMN login DROP NOT NULL,
  ALTER COLUMN encrypted_password DROP NOT NULL,
  ALTER COLUMN server DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS api_token text,
  ADD COLUMN IF NOT EXISTS api_secret text,
  ADD COLUMN IF NOT EXISTS account_id text,
  ADD COLUMN IF NOT EXISTS environment text DEFAULT 'demo',
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS interval text DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS allowed_brokers text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS max_broker_accounts integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_signals_per_day integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS auto_execute boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS allowed_markets text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS paystack_plan_code text;

ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS paystack_customer_code text,
  ADD COLUMN IF NOT EXISTS paystack_subscription_code text,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD';

UPDATE public.user_subscriptions SET plan_id = 'starter' WHERE plan_id = 'basic';
UPDATE public.user_subscriptions SET plan_id = 'pro' WHERE plan_id = 'premium';
UPDATE public.profiles SET subscription_tier = 'starter'::public.subscription_tier WHERE subscription_tier::text = 'basic';
UPDATE public.profiles SET subscription_tier = 'pro'::public.subscription_tier WHERE subscription_tier::text = 'premium';

INSERT INTO public.subscription_plans (id, name, price, interval, features, allowed_brokers, max_broker_accounts, max_signals_per_day, auto_execute, allowed_markets, is_active)
VALUES
  ('free', 'Free', 0, 'monthly',
    ARRAY['Signals + Telegram alerts','Deriv demo account','Crypto + synthetics','5 signals/day','Manual execution only'],
    ARRAY['deriv'], 1, 5, false, ARRAY['crypto','synthetics'], true),
  ('starter', 'Starter', 9, 'monthly',
    ARRAY['Everything in Free','Binance live + Deriv live','Crypto live trading','25 signals/day','Auto-execute 1 symbol'],
    ARRAY['deriv','binance'], 1, 25, true, ARRAY['crypto','synthetics'], true),
  ('pro', 'Pro', 29, 'monthly',
    ARRAY['Everything in Starter','OANDA + Capital.com','Forex live trading','Unlimited signals','Auto-execute all symbols','Risk engine'],
    ARRAY['deriv','binance','oanda','capital'], 3, 999, true, ARRAY['crypto','synthetics','forex'], true),
  ('enterprise', 'Enterprise', 99, 'monthly',
    ARRAY['Everything in Pro','cTrader Open API','Custom MT5 bridge','Unlimited broker accounts','Prop-firm risk engine','Priority cron + support'],
    ARRAY['deriv','binance','oanda','capital','ctrader','mt5'], 999, 9999, true, ARRAY['crypto','synthetics','forex','indices','commodities'], true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, interval = EXCLUDED.interval,
  features = EXCLUDED.features, allowed_brokers = EXCLUDED.allowed_brokers,
  max_broker_accounts = EXCLUDED.max_broker_accounts,
  max_signals_per_day = EXCLUDED.max_signals_per_day,
  auto_execute = EXCLUDED.auto_execute, allowed_markets = EXCLUDED.allowed_markets,
  is_active = true;

DELETE FROM public.subscription_plans WHERE id IN ('basic','premium');

CREATE OR REPLACE FUNCTION public.get_user_tier(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT plan_id FROM public.user_subscriptions
      WHERE user_id = _user_id AND status = 'active'
        AND (current_period_end IS NULL OR current_period_end > now())
      ORDER BY created_at DESC LIMIT 1),
    (SELECT subscription_tier::text FROM public.profiles WHERE id = _user_id),
    'free'
  );
$$;
