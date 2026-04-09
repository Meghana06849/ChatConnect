
-- Ensure key tables are in the realtime publication
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.dream_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.truth_dare_games;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.truth_dare_rounds;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Set REPLICA IDENTITY FULL on tables that need UPDATE/DELETE realtime events
ALTER TABLE public.dream_messages REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.truth_dare_games REPLICA IDENTITY FULL;
ALTER TABLE public.truth_dare_rounds REPLICA IDENTITY FULL;

-- Create Realtime authorization function
-- This controls which channels authenticated users can subscribe to
CREATE OR REPLACE FUNCTION public.authorize_realtime_channel(_channel text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _conv_id uuid;
  _dream_room text;
  _game_id uuid;
BEGIN
  -- Must be authenticated
  IF _uid IS NULL THEN
    RETURN false;
  END IF;

  -- Conversation channels: conversation:<uuid>
  IF _channel ~ '^conversation:[0-9a-f\-]{36}$' THEN
    _conv_id := substring(_channel FROM 14)::uuid;
    RETURN is_conversation_participant(_conv_id, _uid);
  END IF;

  -- Dream chat channels: dream-chat:dreamroom_<uuid>_<uuid>
  IF _channel ~ '^dream-chat:dreamroom_' THEN
    _dream_room := substring(_channel FROM 12);
    -- Extract both UUIDs from the room ID
    RETURN EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = _uid
        AND p.lovers_partner_id IS NOT NULL
        AND generate_dream_room_id(_uid, p.lovers_partner_id) = _dream_room
    );
  END IF;

  -- Game channels: game-<uuid>
  IF _channel ~ '^game-[0-9a-f\-]{36}$' THEN
    _game_id := substring(_channel FROM 6)::uuid;
    RETURN EXISTS (
      SELECT 1 FROM truth_dare_games
      WHERE id = _game_id
        AND (_uid = player1_id OR _uid = player2_id)
    );
  END IF;

  -- Messages channel (legacy): allow authenticated users
  IF _channel = 'messages' OR _channel = 'conversations' THEN
    RETURN true;
  END IF;

  -- Default: deny unknown channels
  RETURN false;
END;
$$;
