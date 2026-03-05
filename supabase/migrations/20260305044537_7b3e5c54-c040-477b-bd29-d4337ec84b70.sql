-- Add shared dream_room_id to enforce strict Lovers Mode room isolation
CREATE OR REPLACE FUNCTION public.generate_dream_room_id(_user_a uuid, _user_b uuid)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT 'dreamroom_' || LEAST(_user_a, _user_b)::text || '_' || GREATEST(_user_a, _user_b)::text;
$$;

CREATE OR REPLACE FUNCTION public.are_linked_lovers(_user_a uuid, _user_b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p1
    JOIN public.profiles p2 ON p2.user_id = _user_b
    WHERE p1.user_id = _user_a
      AND p1.lovers_mode_enabled = true
      AND p2.lovers_mode_enabled = true
      AND p1.lovers_partner_id = _user_b
      AND p2.lovers_partner_id = _user_a
  );
$$;

ALTER TABLE public.dream_messages
ADD COLUMN IF NOT EXISTS dream_room_id text;

UPDATE public.dream_messages
SET dream_room_id = public.generate_dream_room_id(sender_id, partner_id)
WHERE dream_room_id IS NULL;

ALTER TABLE public.dream_messages
ALTER COLUMN dream_room_id SET NOT NULL;

ALTER TABLE public.dream_messages
ADD CONSTRAINT dream_messages_sender_partner_diff CHECK (sender_id <> partner_id);

DROP INDEX IF EXISTS public.idx_dream_messages_pair;
CREATE INDEX IF NOT EXISTS idx_dream_messages_room_created
ON public.dream_messages (dream_room_id, created_at DESC);

DROP POLICY IF EXISTS "Lovers can view own dream messages" ON public.dream_messages;
DROP POLICY IF EXISTS "Lovers can insert dream messages" ON public.dream_messages;
DROP POLICY IF EXISTS "Lovers can update dream messages" ON public.dream_messages;
DROP POLICY IF EXISTS "Lovers can delete own dream messages" ON public.dream_messages;

CREATE POLICY "Lovers can view dream room messages"
ON public.dream_messages
FOR SELECT
TO authenticated
USING (
  (auth.uid() = sender_id OR auth.uid() = partner_id)
  AND public.are_linked_lovers(sender_id, partner_id)
  AND dream_room_id = public.generate_dream_room_id(sender_id, partner_id)
);

CREATE POLICY "Lovers can insert dream room messages"
ON public.dream_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND public.are_linked_lovers(sender_id, partner_id)
  AND dream_room_id = public.generate_dream_room_id(sender_id, partner_id)
);

CREATE POLICY "Lovers can update dream room messages"
ON public.dream_messages
FOR UPDATE
TO authenticated
USING (
  auth.uid() = sender_id OR auth.uid() = partner_id
)
WITH CHECK (
  public.are_linked_lovers(sender_id, partner_id)
  AND dream_room_id = public.generate_dream_room_id(sender_id, partner_id)
);

CREATE POLICY "Lovers can delete own dream room messages"
ON public.dream_messages
FOR DELETE
TO authenticated
USING (
  auth.uid() = sender_id
  AND public.are_linked_lovers(sender_id, partner_id)
  AND dream_room_id = public.generate_dream_room_id(sender_id, partner_id)
);