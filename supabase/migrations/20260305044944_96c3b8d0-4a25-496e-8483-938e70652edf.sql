CREATE OR REPLACE FUNCTION public.are_linked_lovers(_user_a uuid, _user_b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p1
    JOIN public.profiles p2 ON p2.user_id = _user_b
    WHERE p1.user_id = _user_a
      AND p1.lovers_partner_id = _user_b
      AND p2.lovers_partner_id = _user_a
  );
$$;