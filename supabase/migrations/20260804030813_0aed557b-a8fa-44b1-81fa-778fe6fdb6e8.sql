CREATE TABLE public.system_health_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  component TEXT NOT NULL,
  status TEXT NOT NULL,
  healthy BOOLEAN NOT NULL DEFAULT true,
  recovery_attempted BOOLEAN NOT NULL DEFAULT false,
  recovery_succeeded BOOLEAN,
  alerted BOOLEAN NOT NULL DEFAULT false,
  message TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.system_health_events TO authenticated;
GRANT ALL ON public.system_health_events TO service_role;

ALTER TABLE public.system_health_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own health events"
ON public.system_health_events FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE INDEX idx_system_health_events_user_time
  ON public.system_health_events (user_id, created_at DESC);
CREATE INDEX idx_system_health_events_component
  ON public.system_health_events (component, created_at DESC);