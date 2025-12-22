-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create subscription_tier enum
CREATE TYPE public.subscription_tier AS ENUM ('free', 'basic', 'premium', 'enterprise');

-- Create strategy_status enum
CREATE TYPE public.strategy_status AS ENUM ('active', 'inactive', 'testing');

-- Create signal_type enum
CREATE TYPE public.signal_type AS ENUM ('buy', 'sell', 'hold');

-- Create model_type enum
CREATE TYPE public.model_type AS ENUM ('LSTM', 'Transformer', 'DQN', 'PPO', 'GRU', 'RandomForest', 'XGBoost');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  subscription_tier subscription_tier DEFAULT 'free',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create trading_strategies table
CREATE TABLE public.trading_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  assets TEXT[] DEFAULT '{}',
  indicator TEXT,
  timeframe TEXT DEFAULT '1h',
  status strategy_status DEFAULT 'active',
  win_rate DECIMAL(5,2) DEFAULT 0,
  risk_profile TEXT DEFAULT 'medium',
  is_active BOOLEAN DEFAULT true,
  indicators TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create ml_models table
CREATE TABLE public.ml_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type model_type NOT NULL,
  accuracy DECIMAL(5,2) DEFAULT 0,
  version TEXT DEFAULT '1.0',
  is_active BOOLEAN DEFAULT true,
  params JSONB DEFAULT '{}',
  indicators TEXT[] DEFAULT '{}',
  last_trained_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create trading_signals table
CREATE TABLE public.trading_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_id UUID REFERENCES public.trading_strategies(id) ON DELETE SET NULL,
  model_id UUID REFERENCES public.ml_models(id) ON DELETE SET NULL,
  symbol TEXT NOT NULL,
  signal_type signal_type NOT NULL,
  entry_price DECIMAL(20,8),
  target_price DECIMAL(20,8),
  stop_loss DECIMAL(20,8),
  confidence DECIMAL(5,2),
  timeframe TEXT,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create subscription_plans table
CREATE TABLE public.subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  features TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_subscriptions table
CREATE TABLE public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id TEXT REFERENCES public.subscription_plans(id),
  status TEXT DEFAULT 'active',
  starts_at TIMESTAMPTZ DEFAULT now(),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, name, email, subscription_tier)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'free'
  );
  
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_strategies_updated_at
  BEFORE UPDATE ON public.trading_strategies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_models_updated_at
  BEFORE UPDATE ON public.ml_models
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles (only admins can manage)
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for trading_strategies
CREATE POLICY "Users can view their own strategies"
  ON public.trading_strategies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own strategies"
  ON public.trading_strategies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own strategies"
  ON public.trading_strategies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own strategies"
  ON public.trading_strategies FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all strategies"
  ON public.trading_strategies FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for ml_models
CREATE POLICY "Users can view their own models"
  ON public.ml_models FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own models"
  ON public.ml_models FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own models"
  ON public.ml_models FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own models"
  ON public.ml_models FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for trading_signals
CREATE POLICY "Users can view their own signals"
  ON public.trading_signals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view public signals"
  ON public.trading_signals FOR SELECT
  USING (user_id IS NULL);

CREATE POLICY "Users can create their own signals"
  ON public.trading_signals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for subscription_plans (public read)
CREATE POLICY "Anyone can view active plans"
  ON public.subscription_plans FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage plans"
  ON public.subscription_plans FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_subscriptions
CREATE POLICY "Users can view their own subscriptions"
  ON public.user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subscriptions"
  ON public.user_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Insert default subscription plans
INSERT INTO public.subscription_plans (id, name, price, features) VALUES
  ('free', 'Free', 0, ARRAY['Basic market data', '2 trading strategies', 'Manual trading signals', 'Email support']),
  ('basic', 'Basic', 29.99, ARRAY['Real-time market data', '5 trading strategies', 'Automated trading signals', 'Technical indicators', 'Priority email support']),
  ('premium', 'Premium', 99.99, ARRAY['Advanced real-time data', 'Unlimited trading strategies', 'Custom ML models', 'API access', '24/7 support', 'Strategy backtesting']),
  ('enterprise', 'Enterprise', 499.99, ARRAY['All Premium features', 'Dedicated account manager', 'Custom development', 'White-label solution', 'Multi-user access']);