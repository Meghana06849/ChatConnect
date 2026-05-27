-- Allow custom call channels and realtime call history updates

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.call_history;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.call_history REPLICA IDENTITY FULL;

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
  _channel_user_id uuid;
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

  -- Direct call channels: user:<uuid>:calls
  IF _channel ~ '^user:[0-9a-f\-]{36}:calls$' THEN
    RETURN true;
  END IF;

  -- Call history live updates
  IF _channel = 'call-history-changes' THEN
    RETURN true;
  END IF;

  -- Messages channel (legacy): allow authenticated users
  IF _channel = 'messages' OR _channel = 'conversations' THEN
    RETURN true;
  END IF;

  -- Default: deny unknown channels
  RETURN false;
END;
$$;