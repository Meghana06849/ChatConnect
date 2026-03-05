
-- Dream Messages table: completely isolated from general messages
CREATE TABLE public.dream_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  partner_id uuid NOT NULL,
  content text NOT NULL,
  message_type text NOT NULL DEFAULT 'text',
  read_at timestamp with time zone,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dream_messages ENABLE ROW LEVEL SECURITY;

-- Only the two paired lovers can access their dream messages
CREATE POLICY "Lovers can view own dream messages"
ON public.dream_messages FOR SELECT
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = partner_id);

CREATE POLICY "Lovers can insert dream messages"
ON public.dream_messages FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND lovers_partner_id = dream_messages.partner_id
  )
);

CREATE POLICY "Lovers can update dream messages"
ON public.dream_messages FOR UPDATE
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = partner_id);

CREATE POLICY "Lovers can delete own dream messages"
ON public.dream_messages FOR DELETE
TO authenticated
USING (auth.uid() = sender_id);

-- Index for fast queries between partner pairs
CREATE INDEX idx_dream_messages_pair ON public.dream_messages (
  LEAST(sender_id, partner_id),
  GREATEST(sender_id, partner_id),
  created_at DESC
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.dream_messages;
