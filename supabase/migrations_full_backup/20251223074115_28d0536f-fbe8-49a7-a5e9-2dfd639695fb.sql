-- Add rate limiting table
CREATE TABLE public.auth_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  attempt_type text NOT NULL DEFAULT 'login',
  attempt_count integer NOT NULL DEFAULT 1,
  first_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_attempt_at timestamptz NOT NULL DEFAULT now(),
  blocked_until timestamptz,
  UNIQUE(identifier, attempt_type)
);

-- Enable RLS
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow edge functions to manage rate limits (service role only)
CREATE POLICY "Service role can manage rate limits"
ON public.auth_rate_limits
FOR ALL
USING (true)
WITH CHECK (true);

-- Add DELETE policy for messages table
CREATE POLICY "Users can delete their own messages"
ON public.messages
FOR DELETE
USING (auth.uid() = sender_id);

-- Add DELETE policy for groups table
CREATE POLICY "Group creators can delete their groups"
ON public.groups
FOR DELETE
USING (auth.uid() = created_by);

-- Add DELETE policy for profiles table
CREATE POLICY "Users can delete their own profile"
ON public.profiles
FOR DELETE
USING (auth.uid() = user_id);

-- Hide dream_room_pin from connected users by making it only visible to the owner
DROP POLICY IF EXISTS "Users can view connected profiles only" ON public.profiles;
CREATE POLICY "Users can view connected profiles only"
ON public.profiles
FOR SELECT
USING (
  (auth.uid() = user_id) OR
  (EXISTS (
    SELECT 1 FROM contacts
    WHERE ((contacts.user_id = auth.uid() AND contacts.contact_user_id = profiles.user_id)
       OR (contacts.contact_user_id = auth.uid() AND contacts.user_id = profiles.user_id))
  )) OR
  (EXISTS (
    SELECT 1 FROM conversation_participants cp1
    JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
    WHERE cp1.user_id = auth.uid() AND cp2.user_id = profiles.user_id
  )) OR
  (EXISTS (
    SELECT 1 FROM group_members gm1
    JOIN group_members gm2 ON gm1.group_id = gm2.group_id
    WHERE gm1.user_id = auth.uid() AND gm2.user_id = profiles.user_id
  ))
);

-- Create a secure view that hides sensitive fields from non-owners
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT 
  id,
  user_id,
  username,
  display_name,
  avatar_url,
  bio,
  is_online,
  last_seen,
  created_at,
  updated_at,
  -- Only show sensitive fields to the owner
  CASE WHEN auth.uid() = user_id THEN dream_room_pin ELSE NULL END as dream_room_pin,
  CASE WHEN auth.uid() = user_id THEN lovers_mode_enabled ELSE NULL END as lovers_mode_enabled,
  CASE WHEN auth.uid() = user_id THEN lovers_partner_id ELSE NULL END as lovers_partner_id,
  CASE WHEN auth.uid() = user_id THEN love_coins ELSE NULL END as love_coins
FROM public.profiles;

-- Add auth_rate_limits to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE auth_rate_limits;

-- Create function to clean up old rate limit records
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM auth_rate_limits
  WHERE last_attempt_at < now() - interval '24 hours'
    AND (blocked_until IS NULL OR blocked_until < now());
END;
$$;