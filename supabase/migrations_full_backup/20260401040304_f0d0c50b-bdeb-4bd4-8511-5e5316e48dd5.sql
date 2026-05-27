
-- Drop existing overly-strict policies
DROP POLICY IF EXISTS "Lovers can insert dream room messages" ON public.dream_messages;
DROP POLICY IF EXISTS "Lovers can view dream room messages" ON public.dream_messages;
DROP POLICY IF EXISTS "Lovers can update dream room messages" ON public.dream_messages;
DROP POLICY IF EXISTS "Lovers can delete own dream room messages" ON public.dream_messages;

-- Simpler, working policies
CREATE POLICY "Users can insert own dream messages"
  ON public.dream_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can view own dream messages"
  ON public.dream_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = partner_id);

CREATE POLICY "Users can update own dream messages"
  ON public.dream_messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = partner_id);

CREATE POLICY "Users can delete own dream messages"
  ON public.dream_messages FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_id);
