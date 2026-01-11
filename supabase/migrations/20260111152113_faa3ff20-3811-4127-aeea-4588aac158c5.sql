-- Fix conversation_participants RLS policy to be more permissive
-- Drop existing policy and recreate with better logic
DROP POLICY IF EXISTS "Users can add participants to their conversations" ON public.conversation_participants;

CREATE POLICY "Users can add participants to conversations"
ON public.conversation_participants
FOR INSERT
WITH CHECK (
  -- User can add themselves OR user is the conversation creator
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = conversation_id 
    AND conversations.created_by = auth.uid()
  )
);

-- Create a database function to search messages across conversations
CREATE OR REPLACE FUNCTION public.search_messages(
  search_query text,
  result_limit integer DEFAULT 50
)
RETURNS TABLE (
  message_id uuid,
  conversation_id uuid,
  sender_id uuid,
  content text,
  message_type text,
  created_at timestamptz,
  sender_name text,
  sender_avatar text,
  conversation_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id as message_id,
    m.conversation_id,
    m.sender_id,
    m.content,
    m.message_type,
    m.created_at,
    p.display_name as sender_name,
    p.avatar_url as sender_avatar,
    c.name as conversation_name
  FROM messages m
  JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
  JOIN profiles p ON p.user_id = m.sender_id
  JOIN conversations c ON c.id = m.conversation_id
  WHERE cp.user_id = auth.uid()
    AND m.content ILIKE '%' || search_query || '%'
    AND m.message_type = 'text'
  ORDER BY m.created_at DESC
  LIMIT result_limit;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.search_messages(text, integer) TO authenticated;