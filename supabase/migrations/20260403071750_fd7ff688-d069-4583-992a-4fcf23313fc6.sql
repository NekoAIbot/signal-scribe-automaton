
-- Add status column to trading_signals
ALTER TABLE public.trading_signals ADD COLUMN IF NOT EXISTS status text DEFAULT 'new';

-- Allow users to update their own signals
CREATE POLICY "Users can update their own signals"
ON public.trading_signals
FOR UPDATE
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own signals
CREATE POLICY "Users can delete their own signals"
ON public.trading_signals
FOR DELETE
TO public
USING (auth.uid() = user_id);
