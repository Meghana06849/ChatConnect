
-- Drop old constraint and add correct one (one reaction per user per moment)
ALTER TABLE public.moment_reactions DROP CONSTRAINT IF EXISTS moment_reactions_moment_id_user_id_emoji_key;
ALTER TABLE public.moment_reactions ADD CONSTRAINT moment_reactions_moment_id_user_id_key UNIQUE (moment_id, user_id);

-- Replace overly restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view reactions on visible moments" ON public.moment_reactions;

CREATE POLICY "Anyone who can see the moment can see its reactions"
ON public.moment_reactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.moments m
    WHERE m.id = moment_reactions.moment_id
  )
);
