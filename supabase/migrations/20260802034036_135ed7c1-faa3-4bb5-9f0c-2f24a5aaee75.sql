CREATE TABLE IF NOT EXISTS public.broker_oauth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broker_type text NOT NULL,
  environment text,
  account_name text,
  redirect_uri text NOT NULL,
  return_to text,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes')
);

GRANT ALL ON public.broker_oauth_states TO service_role;
ALTER TABLE public.broker_oauth_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own oauth states"
  ON public.broker_oauth_states FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
GRANT SELECT ON public.broker_oauth_states TO authenticated;

CREATE INDEX IF NOT EXISTS broker_oauth_states_state_idx ON public.broker_oauth_states(state);

ALTER TABLE public.broker_credentials
  ADD COLUMN IF NOT EXISTS auth_method text NOT NULL DEFAULT 'api_key',
  ADD COLUMN IF NOT EXISTS oauth_refresh_token text,
  ADD COLUMN IF NOT EXISTS oauth_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS oauth_scopes text[],
  ADD COLUMN IF NOT EXISTS secrets_encrypted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_connected_at timestamptz;