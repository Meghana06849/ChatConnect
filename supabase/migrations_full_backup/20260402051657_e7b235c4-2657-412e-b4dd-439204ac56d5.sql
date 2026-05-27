
-- Romantic prompts table (read-only seed data)
CREATE TABLE public.romantic_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'dare',
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.romantic_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read prompts"
ON public.romantic_prompts FOR SELECT
TO authenticated
USING (true);

-- Seed romantic prompts
INSERT INTO public.romantic_prompts (type, text) VALUES
  ('compliment', 'Say one thing you love most about your partner 💕'),
  ('compliment', 'Describe what makes your partner''s smile special ✨'),
  ('compliment', 'Tell your partner your favorite physical feature of theirs 😍'),
  ('compliment', 'Share what you admire most about your partner''s personality 💖'),
  ('dare', 'Send a cute voice note saying I love you 🎤'),
  ('dare', 'Write a 4-line love poem for your partner right now ✍️'),
  ('dare', 'Describe your perfect date together in detail 🌹'),
  ('dare', 'Record yourself singing your partner''s favorite song 🎵'),
  ('dare', 'Change your profile picture to a photo of you two for 24 hours 📸'),
  ('dare', 'Send your most romantic emoji sequence 💝'),
  ('question', 'What''s your favorite memory together? 🥰'),
  ('question', 'When did you first realize you were falling in love? 💘'),
  ('question', 'What song reminds you of your partner and why? 🎶'),
  ('question', 'What''s the sweetest thing your partner has ever done for you? 🌸'),
  ('question', 'If you could relive one moment together, which would it be? ⏳'),
  ('question', 'What''s one dream you want to fulfill together? 🌟');

-- Spin games table
CREATE TABLE public.spin_games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player1_id UUID NOT NULL,
  player2_id UUID NOT NULL,
  result_prompt_id UUID REFERENCES public.romantic_prompts(id),
  result_player_id UUID,
  status TEXT NOT NULL DEFAULT 'spinning',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.spin_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view own spin games"
ON public.spin_games FOR SELECT
TO authenticated
USING (auth.uid() = player1_id OR auth.uid() = player2_id);

CREATE POLICY "Players can create spin games with linked lover"
ON public.spin_games FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = player1_id
  AND are_linked_lovers(player1_id, player2_id)
);

CREATE POLICY "Players can update own spin games"
ON public.spin_games FOR UPDATE
TO authenticated
USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- Add UPDATE policy for moment_reactions
CREATE POLICY "Users can update their own reactions"
ON public.moment_reactions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- DB function to spin and get random result
CREATE OR REPLACE FUNCTION public.spin_bottle(_partner_id UUID)
RETURNS TABLE(game_id UUID, prompt_text TEXT, prompt_type TEXT, chosen_player_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _self UUID := auth.uid();
  _prompt RECORD;
  _chosen UUID;
  _game_id UUID;
BEGIN
  IF _self IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT are_linked_lovers(_self, _partner_id) THEN
    RAISE EXCEPTION 'Not linked lovers';
  END IF;

  -- Pick random prompt
  SELECT rp.id, rp.text, rp.type INTO _prompt
  FROM romantic_prompts rp
  ORDER BY random()
  LIMIT 1;

  -- Pick random player
  IF random() < 0.5 THEN _chosen := _self; ELSE _chosen := _partner_id; END IF;

  -- Insert game record
  INSERT INTO spin_games (player1_id, player2_id, result_prompt_id, result_player_id, status)
  VALUES (_self, _partner_id, _prompt.id, _chosen, 'completed')
  RETURNING id INTO _game_id;

  RETURN QUERY SELECT _game_id, _prompt.text, _prompt.type, _chosen;
END;
$$;
