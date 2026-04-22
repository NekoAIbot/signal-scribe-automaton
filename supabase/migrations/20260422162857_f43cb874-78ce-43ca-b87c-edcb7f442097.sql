ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS execution_timeline jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS last_execution_status text;

-- Make sure trades is in the realtime publication (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'trades'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.trades';
  END IF;
END$$;

-- Ensure full row payloads for UPDATE events (needed for timeline streaming)
ALTER TABLE public.trades REPLICA IDENTITY FULL;