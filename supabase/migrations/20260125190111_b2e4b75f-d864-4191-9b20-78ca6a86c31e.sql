-- Create trades table for real-time monitoring
CREATE TABLE public.trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  symbol text NOT NULL,
  trade_type text NOT NULL CHECK (trade_type IN ('BUY', 'SELL')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'partially_closed', 'pending', 'cancelled')),
  entry_price numeric NOT NULL,
  current_price numeric,
  close_price numeric,
  lot_size numeric NOT NULL DEFAULT 0.01,
  stop_loss numeric,
  take_profit numeric,
  profit numeric DEFAULT 0,
  commission numeric DEFAULT 0,
  swap numeric DEFAULT 0,
  ticket_number text,
  broker_account_id uuid,
  strategy_id uuid,
  model_id uuid,
  open_time timestamp with time zone NOT NULL DEFAULT now(),
  close_time timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own trades"
ON public.trades
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trades"
ON public.trades
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trades"
ON public.trades
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all trades"
ON public.trades
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.trades;

-- Create index for faster queries
CREATE INDEX idx_trades_user_status ON public.trades(user_id, status);
CREATE INDEX idx_trades_open_time ON public.trades(open_time DESC);