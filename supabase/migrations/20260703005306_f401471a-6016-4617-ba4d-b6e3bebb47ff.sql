
CREATE TABLE public.asset_universe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  asset_class TEXT NOT NULL CHECK (asset_class IN ('fx','crypto','metals','indices','energy','stocks','etfs','agri')),
  quote_currency TEXT,
  tick_size NUMERIC,
  pip_value NUMERIC,
  contract_size NUMERIC,
  session TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 100,
  provider_hints JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.asset_universe TO authenticated;
GRANT ALL ON public.asset_universe TO service_role;

ALTER TABLE public.asset_universe ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read asset universe"
  ON public.asset_universe FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage asset universe"
  ON public.asset_universe FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_asset_universe_updated
  BEFORE UPDATE ON public.asset_universe
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX idx_asset_universe_class ON public.asset_universe(asset_class) WHERE is_enabled = true;
CREATE INDEX idx_asset_universe_priority ON public.asset_universe(priority DESC) WHERE is_enabled = true;

-- Seed: FX majors + top crypto + metals + major indices (enabled)
INSERT INTO public.asset_universe (symbol, display_name, asset_class, quote_currency, pip_value, session, priority, is_enabled) VALUES
  ('EUR/USD','Euro / US Dollar','fx','USD',0.0001,'london_ny',100,true),
  ('GBP/USD','British Pound / US Dollar','fx','USD',0.0001,'london_ny',95,true),
  ('USD/JPY','US Dollar / Japanese Yen','fx','JPY',0.01,'tokyo_ny',95,true),
  ('AUD/USD','Australian Dollar / US Dollar','fx','USD',0.0001,'sydney_ny',85,true),
  ('USD/CAD','US Dollar / Canadian Dollar','fx','CAD',0.0001,'ny',85,true),
  ('NZD/USD','New Zealand Dollar / US Dollar','fx','USD',0.0001,'sydney_ny',75,true),
  ('USD/CHF','US Dollar / Swiss Franc','fx','CHF',0.0001,'london_ny',80,true),
  ('EUR/GBP','Euro / British Pound','fx','GBP',0.0001,'london',75,true),
  ('EUR/JPY','Euro / Japanese Yen','fx','JPY',0.01,'london_tokyo',80,true),
  ('GBP/JPY','British Pound / Japanese Yen','fx','JPY',0.01,'london_tokyo',75,true),
  ('BTC/USD','Bitcoin / US Dollar','crypto','USD',0.01,'24/7',100,true),
  ('ETH/USD','Ethereum / US Dollar','crypto','USD',0.01,'24/7',95,true),
  ('SOL/USD','Solana / US Dollar','crypto','USD',0.001,'24/7',80,true),
  ('BNB/USD','BNB / US Dollar','crypto','USD',0.01,'24/7',75,true),
  ('XRP/USD','XRP / US Dollar','crypto','USD',0.0001,'24/7',70,true),
  ('XAU/USD','Gold / US Dollar','metals','USD',0.01,'london_ny',95,true),
  ('XAG/USD','Silver / US Dollar','metals','USD',0.001,'london_ny',80,true),
  ('SPX','S&P 500 Index','indices','USD',0.25,'ny',95,true),
  ('NDX','Nasdaq 100 Index','indices','USD',0.25,'ny',95,true),
  ('DJI','Dow Jones Industrial Average','indices','USD',1,'ny',85,true),
  ('USOIL','WTI Crude Oil','energy','USD',0.01,'ny',80,false),
  ('UKOIL','Brent Crude Oil','energy','USD',0.01,'london_ny',75,false),
  ('NATGAS','Natural Gas','energy','USD',0.001,'ny',60,false),
  ('AAPL','Apple Inc','stocks','USD',0.01,'ny',80,false),
  ('MSFT','Microsoft','stocks','USD',0.01,'ny',80,false),
  ('TSLA','Tesla','stocks','USD',0.01,'ny',75,false),
  ('SPY','SPDR S&P 500 ETF','etfs','USD',0.01,'ny',80,false),
  ('QQQ','Invesco QQQ Trust','etfs','USD',0.01,'ny',80,false),
  ('CORN','Corn Futures','agri','USD',0.25,'ny',50,false),
  ('WHEAT','Wheat Futures','agri','USD',0.25,'ny',50,false);
