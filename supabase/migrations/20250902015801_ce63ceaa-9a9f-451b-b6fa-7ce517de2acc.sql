-- Update default love_coins to exactly 100 for all users
ALTER TABLE public.profiles ALTER COLUMN love_coins SET DEFAULT 100;

-- Update existing users who have more than 100 coins to exactly 100
UPDATE public.profiles SET love_coins = 100 WHERE love_coins != 100;