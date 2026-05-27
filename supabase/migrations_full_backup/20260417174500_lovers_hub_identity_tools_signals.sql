-- Lovers Hub expansion:
-- - Dual identity (public vs private lovers identity)
-- - Shared life tools (todos, events, budgets, challenges)
-- - Silent communication signals + status sync

CREATE TABLE IF NOT EXISTS public.lovers_private_profiles (
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname text NOT NULL,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_user_id, partner_user_id),
  CHECK (owner_user_id <> partner_user_id),
  CHECK (length(trim(nickname)) BETWEEN 1 AND 64)
);

ALTER TABLE public.lovers_private_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lovers can view private identities" ON public.lovers_private_profiles;
CREATE POLICY "Lovers can view private identities"
ON public.lovers_private_profiles
FOR SELECT
USING (auth.uid() IN (owner_user_id, partner_user_id));

DROP POLICY IF EXISTS "Owners can manage own private identity" ON public.lovers_private_profiles;
CREATE POLICY "Owners can manage own private identity"
ON public.lovers_private_profiles
FOR ALL
USING (auth.uid() = owner_user_id)
WITH CHECK (auth.uid() = owner_user_id);

DROP TRIGGER IF EXISTS update_lovers_private_profiles_updated_at ON public.lovers_private_profiles;
CREATE TRIGGER update_lovers_private_profiles_updated_at
BEFORE UPDATE ON public.lovers_private_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.couple_shared_tools (
  conversation_id uuid PRIMARY KEY REFERENCES public.conversations(id) ON DELETE CASCADE,
  todos jsonb NOT NULL DEFAULT '[]'::jsonb,
  events jsonb NOT NULL DEFAULT '[]'::jsonb,
  budgets jsonb NOT NULL DEFAULT '[]'::jsonb,
  challenges jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.couple_shared_tools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view couple tools" ON public.couple_shared_tools;
CREATE POLICY "Participants can view couple tools"
ON public.couple_shared_tools
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = couple_shared_tools.conversation_id
      AND cp.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Participants can edit couple tools" ON public.couple_shared_tools;
CREATE POLICY "Participants can edit couple tools"
ON public.couple_shared_tools
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = couple_shared_tools.conversation_id
      AND cp.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = couple_shared_tools.conversation_id
      AND cp.user_id = auth.uid()
  )
);

DROP TRIGGER IF EXISTS update_couple_shared_tools_updated_at ON public.couple_shared_tools;
CREATE TRIGGER update_couple_shared_tools_updated_at
BEFORE UPDATE ON public.couple_shared_tools
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.couple_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_type text NOT NULL CHECK (signal_type IN ('miss_you', 'thinking', 'busy', 'tap_sync', 'location_ping')),
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.couple_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view couple signals" ON public.couple_signals;
CREATE POLICY "Participants can view couple signals"
ON public.couple_signals
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = couple_signals.conversation_id
      AND cp.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Participants can send couple signals" ON public.couple_signals;
CREATE POLICY "Participants can send couple signals"
ON public.couple_signals
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = couple_signals.conversation_id
      AND cp.user_id = auth.uid()
  )
);

CREATE INDEX IF NOT EXISTS idx_couple_signals_conversation_created
ON public.couple_signals (conversation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.couple_status_presence (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'thinking', 'busy', 'offline')),
  attention smallint NOT NULL DEFAULT 50 CHECK (attention BETWEEN 0 AND 100),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

ALTER TABLE public.couple_status_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view couple status" ON public.couple_status_presence;
CREATE POLICY "Participants can view couple status"
ON public.couple_status_presence
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = couple_status_presence.conversation_id
      AND cp.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can upsert own couple status" ON public.couple_status_presence;
CREATE POLICY "Users can upsert own couple status"
ON public.couple_status_presence
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.assert_lovers_participant(p_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _is_participant boolean;
  _is_lovers boolean;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants cp
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
    RAISE EXCEPTION 'This action is available only in Lovers conversations';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_lovers_identity_for_conversation(
  p_conversation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _partner_id uuid;
  _self_identity jsonb;
  _partner_identity jsonb;
BEGIN
  PERFORM public.assert_lovers_participant(p_conversation_id);

  SELECT cp.user_id
  INTO _partner_id
  FROM public.conversation_participants cp
  WHERE cp.conversation_id = p_conversation_id
    AND cp.user_id <> _uid
  LIMIT 1;

  SELECT jsonb_build_object(
    'nickname', lp.nickname,
    'avatar_url', lp.avatar_url
  )
  INTO _self_identity
  FROM public.lovers_private_profiles lp
  WHERE lp.owner_user_id = _uid
    AND lp.partner_user_id = _partner_id;

  SELECT jsonb_build_object(
    'nickname', lp.nickname,
    'avatar_url', lp.avatar_url
  )
  INTO _partner_identity
  FROM public.lovers_private_profiles lp
  WHERE lp.owner_user_id = _partner_id
    AND lp.partner_user_id = _uid;

  RETURN jsonb_build_object(
    'partner_id', _partner_id,
    'self', COALESCE(_self_identity, '{}'::jsonb),
    'partner', COALESCE(_partner_identity, '{}'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_lovers_identity(
  p_partner_user_id uuid,
  p_nickname text,
  p_avatar_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _linked_partner uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_partner_user_id IS NULL OR p_partner_user_id = _uid THEN
    RAISE EXCEPTION 'Invalid partner';
  END IF;

  SELECT p.lovers_partner_id
  INTO _linked_partner
  FROM public.profiles p
  WHERE p.user_id = _uid;

  IF _linked_partner IS DISTINCT FROM p_partner_user_id THEN
    RAISE EXCEPTION 'You can only set Lovers identity for your linked partner';
  END IF;

  INSERT INTO public.lovers_private_profiles (
    owner_user_id,
    partner_user_id,
    nickname,
    avatar_url
  )
  VALUES (
    _uid,
    p_partner_user_id,
    trim(p_nickname),
    p_avatar_url
  )
  ON CONFLICT (owner_user_id, partner_user_id)
  DO UPDATE SET
    nickname = EXCLUDED.nickname,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = now();

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_couple_tools(
  p_conversation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tools record;
BEGIN
  PERFORM public.assert_lovers_participant(p_conversation_id);

  SELECT t.todos, t.events, t.budgets, t.challenges
  INTO _tools
  FROM public.couple_shared_tools t
  WHERE t.conversation_id = p_conversation_id;

  RETURN jsonb_build_object(
    'todos', COALESCE(_tools.todos, '[]'::jsonb),
    'events', COALESCE(_tools.events, '[]'::jsonb),
    'budgets', COALESCE(_tools.budgets, '[]'::jsonb),
    'challenges', COALESCE(_tools.challenges, '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_couple_tools(
  p_conversation_id uuid,
  p_todos jsonb DEFAULT NULL,
  p_events jsonb DEFAULT NULL,
  p_budgets jsonb DEFAULT NULL,
  p_challenges jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  PERFORM public.assert_lovers_participant(p_conversation_id);

  INSERT INTO public.couple_shared_tools (
    conversation_id,
    todos,
    events,
    budgets,
    challenges,
    updated_by
  )
  VALUES (
    p_conversation_id,
    COALESCE(p_todos, '[]'::jsonb),
    COALESCE(p_events, '[]'::jsonb),
    COALESCE(p_budgets, '[]'::jsonb),
    COALESCE(p_challenges, '[]'::jsonb),
    _uid
  )
  ON CONFLICT (conversation_id)
  DO UPDATE SET
    todos = COALESCE(p_todos, couple_shared_tools.todos),
    events = COALESCE(p_events, couple_shared_tools.events),
    budgets = COALESCE(p_budgets, couple_shared_tools.budgets),
    challenges = COALESCE(p_challenges, couple_shared_tools.challenges),
    updated_by = _uid,
    updated_at = now();

  RETURN public.get_couple_tools(p_conversation_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.send_couple_signal(
  p_conversation_id uuid,
  p_signal_type text,
  p_metadata jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _signal_id uuid;
BEGIN
  PERFORM public.assert_lovers_participant(p_conversation_id);

  INSERT INTO public.couple_signals (
    conversation_id,
    sender_id,
    signal_type,
    metadata
  )
  VALUES (
    p_conversation_id,
    _uid,
    p_signal_type,
    p_metadata
  )
  RETURNING id INTO _signal_id;

  RETURN _signal_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_recent_couple_signals(
  p_conversation_id uuid,
  p_limit integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_lovers_participant(p_conversation_id);

  RETURN COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'sender_id', s.sender_id,
          'signal_type', s.signal_type,
          'metadata', s.metadata,
          'created_at', s.created_at
        )
        ORDER BY s.created_at DESC
      )
      FROM (
        SELECT *
        FROM public.couple_signals
        WHERE conversation_id = p_conversation_id
        ORDER BY created_at DESC
        LIMIT GREATEST(1, LEAST(p_limit, 100))
      ) s
    ),
    '[]'::jsonb
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_couple_status(
  p_conversation_id uuid,
  p_status text,
  p_attention integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  PERFORM public.assert_lovers_participant(p_conversation_id);

  INSERT INTO public.couple_status_presence (
    conversation_id,
    user_id,
    status,
    attention,
    updated_at
  )
  VALUES (
    p_conversation_id,
    _uid,
    p_status,
    GREATEST(0, LEAST(p_attention, 100)),
    now()
  )
  ON CONFLICT (conversation_id, user_id)
  DO UPDATE SET
    status = EXCLUDED.status,
    attention = EXCLUDED.attention,
    updated_at = now();

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_couple_status(
  p_conversation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_lovers_participant(p_conversation_id);

  RETURN COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'user_id', csp.user_id,
          'status', csp.status,
          'attention', csp.attention,
          'updated_at', csp.updated_at
        )
      )
      FROM public.couple_status_presence csp
      WHERE csp.conversation_id = p_conversation_id
    ),
    '[]'::jsonb
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.assert_lovers_participant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_lovers_identity_for_conversation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_lovers_identity(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_couple_tools(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_couple_tools(uuid, jsonb, jsonb, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_couple_signal(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_recent_couple_signals(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_couple_status(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_couple_status(uuid) TO authenticated;
