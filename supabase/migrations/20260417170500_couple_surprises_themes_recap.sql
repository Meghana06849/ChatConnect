-- Lovers Mode upgrades:
-- 1) Secure scheduled surprise messages with unlock timestamps and reveal RPC
-- 2) Shared couple theme presets with persisted selection
-- 3) Weekly relationship recap from server-side analytics

-- Shared couple theme selection per lovers conversation.
CREATE TABLE IF NOT EXISTS public.couple_shared_themes (
  conversation_id uuid PRIMARY KEY REFERENCES public.conversations(id) ON DELETE CASCADE,
  theme_name text NOT NULL DEFAULT 'galaxy' CHECK (theme_name IN ('galaxy', 'rainy_night', 'sunset')),
  updated_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.couple_shared_themes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view shared couple themes" ON public.couple_shared_themes;
CREATE POLICY "Participants can view shared couple themes"
ON public.couple_shared_themes
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = couple_shared_themes.conversation_id
      AND cp.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Participants can modify shared couple themes" ON public.couple_shared_themes;
CREATE POLICY "Participants can modify shared couple themes"
ON public.couple_shared_themes
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = couple_shared_themes.conversation_id
      AND cp.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = couple_shared_themes.conversation_id
      AND cp.user_id = auth.uid()
  )
);

DROP TRIGGER IF EXISTS update_couple_shared_themes_updated_at ON public.couple_shared_themes;
CREATE TRIGGER update_couple_shared_themes_updated_at
BEFORE UPDATE ON public.couple_shared_themes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Secure store for surprise contents before unlock.
CREATE TABLE IF NOT EXISTS public.couple_surprise_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  placeholder_message_id uuid NOT NULL UNIQUE REFERENCES public.messages(id) ON DELETE CASCADE,
  content text NOT NULL,
  unlock_at timestamptz NOT NULL,
  revealed_at timestamptz,
  revealed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (length(trim(content)) > 0),
  CHECK (unlock_at > created_at)
);

ALTER TABLE public.couple_surprise_messages ENABLE ROW LEVEL SECURITY;

-- Do not expose unrevealed surprise payloads directly.
DROP POLICY IF EXISTS "Participants can view revealed couple surprises" ON public.couple_surprise_messages;
CREATE POLICY "Participants can view revealed couple surprises"
ON public.couple_surprise_messages
FOR SELECT
USING (
  revealed_at IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = couple_surprise_messages.conversation_id
      AND cp.user_id = auth.uid()
  )
);

-- Inserts are intentionally handled via SECURITY DEFINER function.

CREATE INDEX IF NOT EXISTS idx_couple_surprise_due
ON public.couple_surprise_messages (conversation_id, unlock_at)
WHERE revealed_at IS NULL;

CREATE OR REPLACE FUNCTION public.schedule_couple_surprise_message(
  p_conversation_id uuid,
  p_content text,
  p_unlock_at timestamptz
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _placeholder_id uuid;
  _is_participant boolean;
  _is_lovers boolean;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_content IS NULL OR length(trim(p_content)) = 0 THEN
    RAISE EXCEPTION 'Surprise content cannot be empty';
  END IF;

  IF length(p_content) > 1500 THEN
    RAISE EXCEPTION 'Surprise content is too long';
  END IF;

  IF p_unlock_at IS NULL OR p_unlock_at <= now() THEN
    RAISE EXCEPTION 'Unlock time must be in the future';
  END IF;

  IF p_unlock_at > now() + interval '30 days' THEN
    RAISE EXCEPTION 'Unlock time is too far in the future';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = p_conversation_id
      AND cp.user_id = _uid
  ) INTO _is_participant;

  IF NOT _is_participant THEN
    RAISE EXCEPTION 'Not a participant of this conversation';
  END IF;

  SELECT c.is_lovers_conversation
  FROM public.conversations c
  WHERE c.id = p_conversation_id
  INTO _is_lovers;

  IF COALESCE(_is_lovers, false) = false THEN
    RAISE EXCEPTION 'Surprises are available only in Lovers conversations';
  END IF;

  INSERT INTO public.messages (
    conversation_id,
    sender_id,
    content,
    message_type,
    metadata
  )
  VALUES (
    p_conversation_id,
    _uid,
    'A secret love note is waiting 💌',
    'surprise_locked',
    jsonb_build_object('unlockAt', p_unlock_at, 'locked', true, 'isSurprise', true)
  )
  RETURNING id INTO _placeholder_id;

  INSERT INTO public.couple_surprise_messages (
    conversation_id,
    sender_id,
    placeholder_message_id,
    content,
    unlock_at
  )
  VALUES (
    p_conversation_id,
    _uid,
    _placeholder_id,
    p_content,
    p_unlock_at
  );

  RETURN _placeholder_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reveal_due_couple_surprises(
  p_conversation_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _is_participant boolean;
  _is_lovers boolean;
  _revealed_count integer := 0;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = p_conversation_id
      AND cp.user_id = _uid
  ) INTO _is_participant;

  IF NOT _is_participant THEN
    RAISE EXCEPTION 'Not a participant of this conversation';
  END IF;

  SELECT c.is_lovers_conversation
  FROM public.conversations c
  WHERE c.id = p_conversation_id
  INTO _is_lovers;

  IF COALESCE(_is_lovers, false) = false THEN
    RETURN 0;
  END IF;

  WITH due AS (
    SELECT s.id, s.placeholder_message_id, s.content, s.unlock_at
    FROM public.couple_surprise_messages s
    WHERE s.conversation_id = p_conversation_id
      AND s.revealed_at IS NULL
      AND s.unlock_at <= now()
    FOR UPDATE
  ),
  updated_messages AS (
    UPDATE public.messages m
    SET
      content = d.content,
      message_type = 'surprise_revealed',
      metadata = COALESCE(m.metadata, '{}'::jsonb) || jsonb_build_object(
        'isSurprise', true,
        'locked', false,
        'unlockAt', d.unlock_at,
        'revealedAt', now()
      )
    FROM due d
    WHERE m.id = d.placeholder_message_id
    RETURNING m.id
  ),
  updated_surprises AS (
    UPDATE public.couple_surprise_messages s
    SET
      revealed_at = now(),
      revealed_by = _uid
    FROM due d
    WHERE s.id = d.id
    RETURNING s.id
  )
  SELECT count(*)
  INTO _revealed_count
  FROM updated_surprises;

  RETURN COALESCE(_revealed_count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_couple_theme(
  p_conversation_id uuid,
  p_theme_name text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _is_participant boolean;
  _is_lovers boolean;
  _normalized_theme text := lower(trim(p_theme_name));
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _normalized_theme NOT IN ('galaxy', 'rainy_night', 'sunset') THEN
    RAISE EXCEPTION 'Invalid theme preset';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = p_conversation_id
      AND cp.user_id = _uid
  ) INTO _is_participant;

  IF NOT _is_participant THEN
    RAISE EXCEPTION 'Not a participant of this conversation';
  END IF;

  SELECT c.is_lovers_conversation
  FROM public.conversations c
  WHERE c.id = p_conversation_id
  INTO _is_lovers;

  IF COALESCE(_is_lovers, false) = false THEN
    RAISE EXCEPTION 'Shared couple themes are available only in Lovers conversations';
  END IF;

  INSERT INTO public.couple_shared_themes (conversation_id, theme_name, updated_by)
  VALUES (p_conversation_id, _normalized_theme, _uid)
  ON CONFLICT (conversation_id)
  DO UPDATE SET
    theme_name = EXCLUDED.theme_name,
    updated_by = EXCLUDED.updated_by,
    updated_at = now();

  RETURN _normalized_theme;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_couple_theme(
  p_conversation_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _is_participant boolean;
  _is_lovers boolean;
  _theme text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = p_conversation_id
      AND cp.user_id = _uid
  ) INTO _is_participant;

  IF NOT _is_participant THEN
    RAISE EXCEPTION 'Not a participant of this conversation';
  END IF;

  SELECT c.is_lovers_conversation
  FROM public.conversations c
  WHERE c.id = p_conversation_id
  INTO _is_lovers;

  IF COALESCE(_is_lovers, false) = false THEN
    RETURN 'galaxy';
  END IF;

  SELECT theme_name
  INTO _theme
  FROM public.couple_shared_themes
  WHERE conversation_id = p_conversation_id;

  RETURN COALESCE(_theme, 'galaxy');
END;
$$;

CREATE OR REPLACE FUNCTION public.get_weekly_relationship_recap(
  p_conversation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _is_participant boolean;
  _is_lovers boolean;
  _participant_a uuid;
  _participant_b uuid;
  _week_start timestamptz := date_trunc('day', now()) - interval '7 days';
  _message_count integer := 0;
  _active_chat_minutes integer := 0;
  _call_minutes integer := 0;
  _first_chat timestamptz;
  _first_call timestamptz;
  _first_moment timestamptz;
  _surprises_unlocked integer := 0;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = p_conversation_id
      AND cp.user_id = _uid
  ) INTO _is_participant;

  IF NOT _is_participant THEN
    RAISE EXCEPTION 'Not a participant of this conversation';
  END IF;

  SELECT c.is_lovers_conversation
  FROM public.conversations c
  WHERE c.id = p_conversation_id
  INTO _is_lovers;

  IF COALESCE(_is_lovers, false) = false THEN
    RETURN jsonb_build_object(
      'message_count', 0,
      'active_chat_minutes', 0,
      'call_minutes', 0,
      'total_time_minutes', 0,
      'milestones', jsonb_build_object(),
      'surprises_unlocked', 0
    );
  END IF;

  SELECT cp.user_id
  INTO _participant_a
  FROM public.conversation_participants cp
  WHERE cp.conversation_id = p_conversation_id
  ORDER BY cp.joined_at
  LIMIT 1;

  SELECT cp.user_id
  INTO _participant_b
  FROM public.conversation_participants cp
  WHERE cp.conversation_id = p_conversation_id
    AND cp.user_id <> _participant_a
  ORDER BY cp.joined_at
  LIMIT 1;

  SELECT count(*)
  INTO _message_count
  FROM public.messages m
  WHERE m.conversation_id = p_conversation_id
    AND m.created_at >= _week_start;

  WITH ordered AS (
    SELECT m.created_at,
           lag(m.created_at) OVER (ORDER BY m.created_at) AS prev_created_at
    FROM public.messages m
    WHERE m.conversation_id = p_conversation_id
      AND m.created_at >= _week_start
  ),
  sessionized AS (
    SELECT created_at,
           sum(
             CASE
               WHEN prev_created_at IS NULL OR created_at - prev_created_at > interval '10 minutes' THEN 1
               ELSE 0
             END
           ) OVER (ORDER BY created_at) AS session_id
    FROM ordered
  ),
  spans AS (
    SELECT session_id,
           min(created_at) AS session_start,
           max(created_at) AS session_end
    FROM sessionized
    GROUP BY session_id
  )
  SELECT COALESCE(sum(GREATEST(1, ceil(extract(epoch FROM (session_end - session_start)) / 60.0)))::int, 0)
  INTO _active_chat_minutes
  FROM spans;

  IF _participant_a IS NOT NULL AND _participant_b IS NOT NULL THEN
    SELECT COALESCE(sum(ch.duration_seconds), 0) / 60
    INTO _call_minutes
    FROM public.call_history ch
    WHERE ch.created_at >= _week_start
      AND (
        (ch.caller_id = _participant_a AND ch.callee_id = _participant_b)
        OR
        (ch.caller_id = _participant_b AND ch.callee_id = _participant_a)
      );
  END IF;

  SELECT min(m.created_at)
  INTO _first_chat
  FROM public.messages m
  WHERE m.conversation_id = p_conversation_id;

  IF _participant_a IS NOT NULL AND _participant_b IS NOT NULL THEN
    SELECT min(ch.created_at)
    INTO _first_call
    FROM public.call_history ch
    WHERE (ch.caller_id = _participant_a AND ch.callee_id = _participant_b)
       OR (ch.caller_id = _participant_b AND ch.callee_id = _participant_a);

    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'moments'
    ) THEN
      EXECUTE $$
        SELECT min(created_at)
        FROM public.moments
        WHERE audience_mode = 'lovers'
          AND user_id IN ($1, $2)
      $$
      INTO _first_moment
      USING _participant_a, _participant_b;
    END IF;
  END IF;

  SELECT count(*)
  INTO _surprises_unlocked
  FROM public.couple_surprise_messages s
  WHERE s.conversation_id = p_conversation_id
    AND s.revealed_at >= _week_start;

  RETURN jsonb_build_object(
    'message_count', COALESCE(_message_count, 0),
    'active_chat_minutes', COALESCE(_active_chat_minutes, 0),
    'call_minutes', COALESCE(_call_minutes, 0),
    'total_time_minutes', COALESCE(_active_chat_minutes, 0) + COALESCE(_call_minutes, 0),
    'surprises_unlocked', COALESCE(_surprises_unlocked, 0),
    'milestones', jsonb_build_object(
      'first_chat', _first_chat,
      'first_call', _first_call,
      'first_moment', _first_moment,
      'days_since_first_chat', CASE WHEN _first_chat IS NULL THEN NULL ELSE floor(extract(epoch FROM (now() - _first_chat)) / 86400)::int END
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.schedule_couple_surprise_message(uuid, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reveal_due_couple_surprises(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_couple_theme(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_couple_theme(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_weekly_relationship_recap(uuid) TO authenticated;
