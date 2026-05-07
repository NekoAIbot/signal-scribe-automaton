
CREATE TABLE public.execution_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  broker_account_id uuid,
  broker_account_name text,
  broker_account_type text,
  symbol text,
  trade_type text,
  lot_size numeric,
  entry_price numeric,
  stop_loss numeric,
  take_profit numeric,
  strategy_id uuid,
  model_id uuid,
  trade_id uuid,
  retry_of uuid,
  success boolean NOT NULL DEFAULT false,
  status text,
  error_message text,
  execution_timeline jsonb NOT NULL DEFAULT '[]'::jsonb,
  request_params jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_eal_user_created ON public.execution_audit_log(user_id, created_at DESC);
CREATE INDEX idx_eal_broker ON public.execution_audit_log(broker_account_id);

ALTER TABLE public.execution_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own audit log" ON public.execution_audit_log
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own audit log" ON public.execution_audit_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all audit log" ON public.execution_audit_log
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.execution_audit_log REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.execution_audit_log;
