
-- Truth or Dare game sessions
CREATE TABLE public.truth_dare_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id uuid NOT NULL,
  player2_id uuid NOT NULL,
  current_turn uuid NOT NULL,
  status text NOT NULL DEFAULT 'waiting',
  round integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('waiting', 'active', 'paused', 'completed')),
  CONSTRAINT different_players CHECK (player1_id <> player2_id)
);

-- Game rounds (questions and answers)
CREATE TABLE public.truth_dare_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.truth_dare_games(id) ON DELETE CASCADE,
  round_number integer NOT NULL,
  chooser_id uuid NOT NULL,
  asker_id uuid NOT NULL,
  choice_type text,
  question text,
  answer text,
  status text NOT NULL DEFAULT 'choosing',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_choice CHECK (choice_type IS NULL OR choice_type IN ('truth', 'dare')),
  CONSTRAINT valid_round_status CHECK (status IN ('choosing', 'asking', 'answering', 'completed'))
);

-- Enable RLS
ALTER TABLE public.truth_dare_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.truth_dare_rounds ENABLE ROW LEVEL SECURITY;

-- RLS: Only players can see/manage their games
CREATE POLICY "Players can view own games"
  ON public.truth_dare_games FOR SELECT
  TO authenticated
  USING (auth.uid() IN (player1_id, player2_id));

CREATE POLICY "Players can create games"
  ON public.truth_dare_games FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = player1_id AND are_linked_lovers(player1_id, player2_id));

CREATE POLICY "Players can update own games"
  ON public.truth_dare_games FOR UPDATE
  TO authenticated
  USING (auth.uid() IN (player1_id, player2_id));

CREATE POLICY "Players can delete own games"
  ON public.truth_dare_games FOR DELETE
  TO authenticated
  USING (auth.uid() IN (player1_id, player2_id));

-- RLS for rounds
CREATE POLICY "Players can view game rounds"
  ON public.truth_dare_rounds FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.truth_dare_games g
    WHERE g.id = game_id AND auth.uid() IN (g.player1_id, g.player2_id)
  ));

CREATE POLICY "Players can insert game rounds"
  ON public.truth_dare_rounds FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.truth_dare_games g
    WHERE g.id = game_id AND auth.uid() IN (g.player1_id, g.player2_id)
  ));

CREATE POLICY "Players can update game rounds"
  ON public.truth_dare_rounds FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.truth_dare_games g
    WHERE g.id = game_id AND auth.uid() IN (g.player1_id, g.player2_id)
  ));

-- Updated_at trigger
CREATE TRIGGER update_truth_dare_games_updated_at
  BEFORE UPDATE ON public.truth_dare_games
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.truth_dare_games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.truth_dare_rounds;
