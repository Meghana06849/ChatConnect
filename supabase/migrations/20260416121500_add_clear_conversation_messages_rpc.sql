-- Allow participants to clear full conversation history via RPC.
-- This avoids broad DELETE policies while still enabling "clear chat" for both sides.

CREATE OR REPLACE FUNCTION public.clear_conversation_messages(_conversation_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _deleted_count integer := 0;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = _conversation_id
      AND cp.user_id = _uid
  ) THEN
    RAISE EXCEPTION 'Not a participant of this conversation';
  END IF;

  DELETE FROM public.messages
  WHERE conversation_id = _conversation_id;

  GET DIAGNOSTICS _deleted_count = ROW_COUNT;
  RETURN _deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.clear_conversation_messages(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clear_conversation_messages(uuid) TO authenticated;
