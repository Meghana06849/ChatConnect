
-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert own dream messages" ON public.dream_messages;
DROP POLICY IF EXISTS "Users can view own dream messages" ON public.dream_messages;
DROP POLICY IF EXISTS "Users can update own dream messages" ON public.dream_messages;
DROP POLICY IF EXISTS "Users can delete own dream messages" ON public.dream_messages;

-- INSERT: sender must be auth.uid() AND partner must be linked lover
CREATE POLICY "Lovers can send dream messages"
ON public.dream_messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND are_linked_lovers(sender_id, partner_id)
);

-- SELECT: both sender and partner can read
CREATE POLICY "Lovers can view dream messages"
ON public.dream_messages FOR SELECT TO authenticated
USING (
  (auth.uid() = sender_id OR auth.uid() = partner_id)
  AND are_linked_lovers(sender_id, partner_id)
);

-- UPDATE: both can update (mark read, etc.)
CREATE POLICY "Lovers can update dream messages"
ON public.dream_messages FOR UPDATE TO authenticated
USING (
  (auth.uid() = sender_id OR auth.uid() = partner_id)
  AND are_linked_lovers(sender_id, partner_id)
);

-- DELETE: only sender, and only if linked
CREATE POLICY "Lovers can delete dream messages"
ON public.dream_messages FOR DELETE TO authenticated
USING (
  auth.uid() = sender_id
  AND are_linked_lovers(sender_id, partner_id)
);
