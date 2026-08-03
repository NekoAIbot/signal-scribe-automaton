
ALTER TABLE public.broker_oauth_states
  ADD COLUMN IF NOT EXISTS code_challenge text,
  ADD COLUMN IF NOT EXISTS code_challenge_method text DEFAULT 'S256';

ALTER TABLE public.broker_credentials
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS balance numeric,
  ADD COLUMN IF NOT EXISTS currency text,
  ADD COLUMN IF NOT EXISTS landing_company text,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

CREATE TABLE IF NOT EXISTS public.broker_oauth_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broker_type text NOT NULL,
  state text,
  step text NOT NULL,
  status text NOT NULL DEFAULT 'info',
  message text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS broker_oauth_events_user_idx ON public.broker_oauth_events (user_id, created_at DESC);

GRANT SELECT ON public.broker_oauth_events TO authenticated;
GRANT ALL ON public.broker_oauth_events TO service_role;

ALTER TABLE public.broker_oauth_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read their own broker oauth events" ON public.broker_oauth_events;
CREATE POLICY "Users read their own broker oauth events"
  ON public.broker_oauth_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
