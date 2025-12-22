-- Create push_subscriptions table for Web Push notifications
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Enable RLS on push_subscriptions
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own push subscriptions
CREATE POLICY "Users can manage own push subscriptions"
ON public.push_subscriptions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create blocked_users table for block/mute functionality
CREATE TABLE public.blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  blocked_user_id uuid NOT NULL,
  block_type text DEFAULT 'block' CHECK (block_type IN ('block', 'mute')),
  reason text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, blocked_user_id)
);

-- Enable RLS on blocked_users
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- Users can manage their own blocks
CREATE POLICY "Users can manage own blocks"
ON public.blocked_users
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create function to get friend suggestions based on mutual friends
CREATE OR REPLACE FUNCTION public.get_friend_suggestions(requesting_user_id uuid, suggestion_limit integer DEFAULT 10)
RETURNS TABLE (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  mutual_friend_count bigint,
  is_online boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH my_friends AS (
    -- Get all accepted friends of the requesting user
    SELECT 
      CASE 
        WHEN c.user_id = requesting_user_id THEN c.contact_user_id
        ELSE c.user_id
      END as friend_id
    FROM contacts c
    WHERE (c.user_id = requesting_user_id OR c.contact_user_id = requesting_user_id)
      AND c.status = 'accepted'
  ),
  friends_of_friends AS (
    -- Get friends of my friends (potential suggestions)
    SELECT 
      CASE 
        WHEN c.user_id = mf.friend_id THEN c.contact_user_id
        ELSE c.user_id
      END as potential_friend_id,
      mf.friend_id as mutual_friend_id
    FROM contacts c
    JOIN my_friends mf ON (c.user_id = mf.friend_id OR c.contact_user_id = mf.friend_id)
    WHERE c.status = 'accepted'
      AND (
        CASE 
          WHEN c.user_id = mf.friend_id THEN c.contact_user_id
          ELSE c.user_id
        END
      ) != requesting_user_id
  ),
  suggestions AS (
    SELECT 
      fof.potential_friend_id,
      COUNT(DISTINCT fof.mutual_friend_id) as mutual_count
    FROM friends_of_friends fof
    -- Exclude users who are already my friends
    WHERE fof.potential_friend_id NOT IN (SELECT friend_id FROM my_friends)
    -- Exclude users I've already sent/received requests from
    AND fof.potential_friend_id NOT IN (
      SELECT CASE 
        WHEN c.user_id = requesting_user_id THEN c.contact_user_id
        ELSE c.user_id
      END
      FROM contacts c
      WHERE c.user_id = requesting_user_id OR c.contact_user_id = requesting_user_id
    )
    -- Exclude blocked users
    AND fof.potential_friend_id NOT IN (
      SELECT blocked_user_id FROM blocked_users WHERE user_id = requesting_user_id
    )
    -- Exclude users who blocked me
    AND fof.potential_friend_id NOT IN (
      SELECT user_id FROM blocked_users WHERE blocked_user_id = requesting_user_id
    )
    GROUP BY fof.potential_friend_id
  )
  SELECT 
    p.user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    s.mutual_count,
    p.is_online
  FROM suggestions s
  JOIN profiles p ON p.user_id = s.potential_friend_id
  ORDER BY s.mutual_count DESC, p.display_name
  LIMIT suggestion_limit;
END;
$$;

-- Create function to check if a user is blocked
CREATE OR REPLACE FUNCTION public.is_user_blocked(checker_id uuid, target_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM blocked_users
    WHERE (user_id = checker_id AND blocked_user_id = target_id)
       OR (user_id = target_id AND blocked_user_id = checker_id AND block_type = 'block')
  )
$$;

-- Enable realtime for blocked_users
ALTER TABLE public.blocked_users REPLICA IDENTITY FULL;

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.blocked_users;