-- Fix conversation_participants INSERT policy to allow creators to add themselves and others
DROP POLICY IF EXISTS "Conversation creators can add participants" ON public.conversation_participants;

CREATE POLICY "Users can add participants to their conversations"
ON public.conversation_participants
FOR INSERT
WITH CHECK (
  -- User can add themselves to any conversation OR
  -- User is the creator of the conversation
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = conversation_participants.conversation_id 
    AND conversations.created_by = auth.uid()
  )
);

-- Add last_seen column to profiles if not exists (already exists, just ensuring index)
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON public.profiles(last_seen);
CREATE INDEX IF NOT EXISTS idx_profiles_is_online ON public.profiles(is_online);

-- Add message status column for delivery tracking
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent';
-- status values: 'sent', 'delivered', 'read'

-- Add delivered_at column
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

-- Create function to update online status and last_seen
CREATE OR REPLACE FUNCTION public.update_user_presence(is_online_status boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles 
  SET 
    is_online = is_online_status,
    last_seen = CASE WHEN is_online_status = false THEN now() ELSE last_seen END,
    updated_at = now()
  WHERE user_id = auth.uid();
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.update_user_presence(boolean) TO authenticated;

-- Enable realtime for messages status updates
ALTER TABLE public.messages REPLICA IDENTITY FULL;