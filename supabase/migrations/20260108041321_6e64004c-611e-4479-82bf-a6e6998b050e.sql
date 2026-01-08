-- Group call participants (for chat access control)
CREATE TABLE IF NOT EXISTS public.group_call_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id)
);

ALTER TABLE public.group_call_participants ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own group call participation"
  ON public.group_call_participants
  FOR SELECT
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can join group calls"
  ON public.group_call_participants
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can leave group calls"
  ON public.group_call_participants
  FOR DELETE
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Group call chat messages (persisted)
CREATE TABLE IF NOT EXISTS public.group_call_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL,
  user_id uuid NOT NULL,
  from_name text NULL,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_call_messages_room_created
  ON public.group_call_messages (room_id, created_at);

ALTER TABLE public.group_call_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Participants can read group call messages"
  ON public.group_call_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.group_call_participants p
      WHERE p.room_id = group_call_messages.room_id
        AND p.user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Participants can send group call messages"
  ON public.group_call_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.group_call_participants p
      WHERE p.room_id = group_call_messages.room_id
        AND p.user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Friend discovery/search RPC (bypasses profiles RLS but returns limited fields)
CREATE OR REPLACE FUNCTION public.search_profiles(_query text)
RETURNS TABLE (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  is_verified boolean,
  verification_type text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH q AS (
    SELECT regexp_replace(trim(coalesce(_query, '')), '^@', '') AS v
  )
  SELECT p.user_id, p.username, p.display_name, p.avatar_url, p.is_verified, p.verification_type
  FROM public.profiles p, q
  WHERE q.v <> ''
    AND (
      p.custom_user_id = q.v
      OR p.user_id::text = q.v
      OR p.username ILIKE q.v
      OR p.display_name ILIKE q.v
      OR p.username ILIKE (q.v || '%')
    )
  ORDER BY
    (p.custom_user_id = q.v) DESC,
    (p.user_id::text = q.v) DESC,
    (lower(p.username) = lower(q.v)) DESC,
    (lower(p.display_name) = lower(q.v)) DESC
  LIMIT 10;
$$;

REVOKE ALL ON FUNCTION public.search_profiles(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_profiles(text) TO authenticated;