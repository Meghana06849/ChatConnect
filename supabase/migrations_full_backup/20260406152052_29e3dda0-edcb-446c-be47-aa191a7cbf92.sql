-- Fix dream_messages: recreate all RLS policies that were dropped by the failed migration

DROP POLICY IF EXISTS "Linked lovers can read dream messages" ON public.dream_messages;
DROP POLICY IF EXISTS "Linked lovers can send dream messages" ON public.dream_messages;
DROP POLICY IF EXISTS "Senders can update their own dream messages" ON public.dream_messages;
DROP POLICY IF EXISTS "Senders can delete their own dream messages" ON public.dream_messages;
DROP POLICY IF EXISTS "Lovers can view dream messages" ON public.dream_messages;
DROP POLICY IF EXISTS "Lovers can send dream messages" ON public.dream_messages;
DROP POLICY IF EXISTS "Lovers can update dream messages" ON public.dream_messages;
DROP POLICY IF EXISTS "Lovers can delete dream messages" ON public.dream_messages;

CREATE POLICY "Lovers can view dream messages"
ON public.dream_messages
FOR SELECT
TO authenticated
USING (
  auth.uid() IN (sender_id, partner_id)
  AND are_linked_lovers(sender_id, partner_id)
);

CREATE POLICY "Lovers can send dream messages"
ON public.dream_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND sender_id <> partner_id
  AND are_linked_lovers(sender_id, partner_id)
  AND dream_room_id = public.generate_dream_room_id(sender_id, partner_id)
);

CREATE POLICY "Lovers can update dream messages"
ON public.dream_messages
FOR UPDATE
TO authenticated
USING (
  auth.uid() IN (sender_id, partner_id)
  AND are_linked_lovers(sender_id, partner_id)
);

CREATE POLICY "Lovers can delete dream messages"
ON public.dream_messages
FOR DELETE
TO authenticated
USING (
  auth.uid() = sender_id
  AND are_linked_lovers(sender_id, partner_id)
);

-- Now fix the hashed PIN system using extensions schema for pgcrypto

DROP TABLE IF EXISTS public.lovers_mode_secrets;

CREATE TABLE public.lovers_mode_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  pin_hash TEXT NOT NULL,
  pin_version INTEGER NOT NULL DEFAULT 1,
  pin_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lovers_mode_secrets ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_lovers_mode_secrets_updated_at
BEFORE UPDATE ON public.lovers_mode_secrets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Secure functions using extensions.crypt / extensions.gen_salt

CREATE OR REPLACE FUNCTION public.has_lovers_pin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.lovers_mode_secrets WHERE user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.verify_lovers_pin(_pin text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.lovers_mode_secrets s
    WHERE s.user_id = auth.uid()
      AND s.pin_hash = extensions.crypt(_pin, s.pin_hash)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_lovers_pin(_pin text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _new_version integer;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _pin IS NULL OR length(_pin) < 4 OR length(_pin) > 6 THEN
    RAISE EXCEPTION 'PIN must be 4-6 characters';
  END IF;

  INSERT INTO public.lovers_mode_secrets (user_id, pin_hash, pin_version, pin_updated_at)
  VALUES (_uid, extensions.crypt(_pin, extensions.gen_salt('bf', 10)), 1, now())
  ON CONFLICT (user_id) DO UPDATE SET
    pin_hash = extensions.crypt(_pin, extensions.gen_salt('bf', 10)),
    pin_version = public.lovers_mode_secrets.pin_version + 1,
    pin_updated_at = now(),
    updated_at = now()
  RETURNING pin_version INTO _new_version;

  RETURN _new_version;
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_lovers_pin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  DELETE FROM public.lovers_mode_secrets WHERE user_id = auth.uid();
  RETURN true;
END;
$$;

-- Drop leftover functions from failed migration
DROP FUNCTION IF EXISTS public.get_lovers_pin_state();

REVOKE ALL ON FUNCTION public.has_lovers_pin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_lovers_pin(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_lovers_pin(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clear_lovers_pin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_lovers_pin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_lovers_pin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_lovers_pin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_lovers_pin() TO authenticated;