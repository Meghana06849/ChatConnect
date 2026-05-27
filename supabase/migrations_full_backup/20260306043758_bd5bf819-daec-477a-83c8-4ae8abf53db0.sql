-- Ensure linked lovers are mutually paired and both in Lovers Mode
CREATE OR REPLACE FUNCTION public.are_linked_lovers(_user_a uuid, _user_b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p1
    JOIN public.profiles p2 ON p2.user_id = _user_b
    WHERE p1.user_id = _user_a
      AND p1.lovers_mode_enabled = true
      AND p2.lovers_mode_enabled = true
      AND p1.lovers_partner_id = _user_b
      AND p2.lovers_partner_id = _user_a
  );
$function$;

-- Secure helper to mutually link two accepted friends as Dream Room partners
CREATE OR REPLACE FUNCTION public.link_lovers_partner(_partner_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _self uuid := auth.uid();
  _partner_profile_exists boolean;
  _friendship_exists boolean;
BEGIN
  IF _self IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _partner_id IS NULL THEN
    RAISE EXCEPTION 'Partner is required';
  END IF;

  IF _self = _partner_id THEN
    RAISE EXCEPTION 'You cannot link yourself as partner';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = _partner_id
  ) INTO _partner_profile_exists;

  IF NOT _partner_profile_exists THEN
    RAISE EXCEPTION 'Partner profile not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = _self
      AND p.lovers_mode_enabled = true
  ) THEN
    RAISE EXCEPTION 'Enable Lovers Mode first';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = _partner_id
      AND p.lovers_mode_enabled = true
  ) THEN
    RAISE EXCEPTION 'Selected friend has not enabled Lovers Mode yet';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.contacts c
    WHERE c.status = 'accepted'
      AND (
        (c.user_id = _self AND c.contact_user_id = _partner_id)
        OR
        (c.user_id = _partner_id AND c.contact_user_id = _self)
      )
  ) INTO _friendship_exists;

  IF NOT _friendship_exists THEN
    RAISE EXCEPTION 'You can only link accepted friends';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = _self
      AND p.lovers_partner_id IS NOT NULL
      AND p.lovers_partner_id <> _partner_id
  ) THEN
    RAISE EXCEPTION 'Unlink your current partner first';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = _partner_id
      AND p.lovers_partner_id IS NOT NULL
      AND p.lovers_partner_id <> _self
  ) THEN
    RAISE EXCEPTION 'Selected friend is already linked with another partner';
  END IF;

  UPDATE public.profiles
  SET lovers_partner_id = CASE
    WHEN user_id = _self THEN _partner_id
    ELSE _self
  END,
  updated_at = now()
  WHERE user_id IN (_self, _partner_id);

  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.link_lovers_partner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_lovers_partner(uuid) TO authenticated;