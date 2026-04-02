
CREATE TABLE public.moment_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  moment_id UUID NOT NULL REFERENCES public.moments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (moment_id, user_id, emoji)
);

ALTER TABLE public.moment_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reactions on visible moments"
ON public.moment_reactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.moments m
    WHERE m.id = moment_reactions.moment_id
      AND (m.user_id = auth.uid() OR auth.uid() = moment_reactions.user_id)
  )
);

CREATE POLICY "Users can add their own reactions"
ON public.moment_reactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own reactions"
ON public.moment_reactions FOR DELETE
USING (auth.uid() = user_id);
