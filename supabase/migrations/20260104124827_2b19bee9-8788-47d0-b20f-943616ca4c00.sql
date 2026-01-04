-- Add custom_user_id column for user-created IDs
ALTER TABLE public.profiles 
ADD COLUMN custom_user_id VARCHAR(32) UNIQUE;

-- Create index for faster lookups
CREATE INDEX idx_profiles_custom_user_id ON public.profiles(custom_user_id);

-- Create user_game_stats table for real game data
CREATE TABLE public.user_game_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  game_type TEXT NOT NULL,
  high_score INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  total_xp_earned INTEGER DEFAULT 0,
  last_played_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, game_type)
);

-- Enable RLS on user_game_stats
ALTER TABLE public.user_game_stats ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_game_stats
CREATE POLICY "Users can manage own game stats"
ON public.user_game_stats
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);