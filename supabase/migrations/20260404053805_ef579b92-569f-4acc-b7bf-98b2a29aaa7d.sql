
-- Love Quiz Questions (reusable pool)
CREATE TABLE public.love_quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.love_quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read quiz questions" ON public.love_quiz_questions FOR SELECT TO authenticated USING (true);

-- Love Quiz Games
CREATE TABLE public.love_quiz_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id UUID NOT NULL,
  player2_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  compatibility_score INTEGER,
  total_questions INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.love_quiz_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lovers can create quiz games" ON public.love_quiz_games FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = player1_id AND are_linked_lovers(player1_id, player2_id));
CREATE POLICY "Players can view own quiz games" ON public.love_quiz_games FOR SELECT TO authenticated
  USING (auth.uid() = player1_id OR auth.uid() = player2_id);
CREATE POLICY "Players can update own quiz games" ON public.love_quiz_games FOR UPDATE TO authenticated
  USING (auth.uid() = player1_id OR auth.uid() = player2_id);
CREATE POLICY "Players can delete own quiz games" ON public.love_quiz_games FOR DELETE TO authenticated
  USING (auth.uid() = player1_id OR auth.uid() = player2_id);

CREATE TRIGGER update_love_quiz_games_updated_at BEFORE UPDATE ON public.love_quiz_games
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Love Quiz Answers
CREATE TABLE public.love_quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.love_quiz_games(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.love_quiz_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(game_id, question_id, user_id)
);
ALTER TABLE public.love_quiz_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view quiz answers" ON public.love_quiz_answers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.love_quiz_games g WHERE g.id = game_id AND (auth.uid() = g.player1_id OR auth.uid() = g.player2_id)));
CREATE POLICY "Players can submit quiz answers" ON public.love_quiz_answers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.love_quiz_games g WHERE g.id = game_id AND (auth.uid() = g.player1_id OR auth.uid() = g.player2_id)));

-- Seed quiz questions with options
INSERT INTO public.love_quiz_questions (question_text, category, options) VALUES
('What''s your ideal date night?', 'preferences', '["Cozy movie night at home", "Fancy dinner out", "Adventure outdoors", "Cooking together"]'),
('What love language speaks to you most?', 'personality', '["Words of affirmation", "Quality time", "Physical touch", "Acts of service"]'),
('Where would you most want to travel together?', 'dreams', '["Paris, France", "Bali, Indonesia", "Tokyo, Japan", "Santorini, Greece"]'),
('What''s the best way to spend a lazy Sunday?', 'preferences', '["Sleeping in & cuddling", "Brunch date", "Binge-watching a series", "Going for a walk"]'),
('What surprised you most when we first met?', 'memories', '["Your smile", "Your sense of humor", "Your kindness", "Your confidence"]'),
('What''s your favorite season to be romantic in?', 'preferences', '["Spring — fresh starts", "Summer — warm nights", "Autumn — cozy vibes", "Winter — holiday magic"]'),
('How do you prefer to resolve disagreements?', 'personality', '["Talk it out immediately", "Take space then discuss", "Write it down", "Hug it out first"]'),
('What pet name do you secretly love?', 'preferences', '["Babe", "Love", "Sweetheart", "Something unique to us"]'),
('What''s your dream home together?', 'dreams', '["City apartment with a view", "Cozy countryside cottage", "Beach house", "Mountain cabin"]'),
('What first attracted you to your partner?', 'memories', '["Their looks", "Their personality", "Their voice", "Their energy"]'),
('How do you show love best?', 'personality', '["Surprise gifts", "Planning quality time", "Physical affection", "Helping with tasks"]'),
('What''s your ideal anniversary celebration?', 'preferences', '["Recreate our first date", "Surprise trip", "Heartfelt letters", "A grand gesture"]'),
('What song reminds you of us?', 'memories', '["A romantic ballad", "An upbeat love song", "Our first dance song", "Something unexpected"]'),
('What scares you most about love?', 'personality', '["Growing apart", "Not being enough", "Losing the spark", "Being too vulnerable"]'),
('What''s one thing you want us to try together?', 'dreams', '["Learn a new hobby", "Travel somewhere exotic", "Start a project together", "Take a dance class"]'),
('Morning person or night owl in love?', 'preferences', '["Morning — sunrise cuddles", "Night — stargazing together", "Both!", "Neither — anytime works"]'),
('What''s your favorite way to say I love you?', 'personality', '["Say it out loud", "Show it through actions", "A look that says it all", "Write it in a note"]'),
('What memory of us makes you smile most?', 'memories', '["Our first kiss", "A silly moment together", "When we overcame something hard", "A random ordinary day"]'),
('Where do you see us in 5 years?', 'dreams', '["Traveling the world", "Building a home", "Growing our family", "Chasing dreams together"]'),
('What''s the most romantic thing someone could do?', 'preferences', '["Plan a surprise date", "Write a love letter", "Learn something for them", "Simply be present"]');
