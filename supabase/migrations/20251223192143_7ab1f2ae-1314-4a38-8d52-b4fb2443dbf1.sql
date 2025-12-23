-- Create a table for storing encrypted broker credentials
CREATE TABLE public.broker_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broker_type TEXT NOT NULL DEFAULT 'mt5',
  account_name TEXT NOT NULL,
  login TEXT NOT NULL,
  encrypted_password TEXT NOT NULL,
  server TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'demo',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, broker_type, login, server)
);

-- Enable Row Level Security
ALTER TABLE public.broker_credentials ENABLE ROW LEVEL SECURITY;

-- Users can only access their own credentials
CREATE POLICY "Users can view their own credentials"
ON public.broker_credentials
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own credentials"
ON public.broker_credentials
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credentials"
ON public.broker_credentials
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credentials"
ON public.broker_credentials
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_broker_credentials_updated_at
BEFORE UPDATE ON public.broker_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();