
-- Add FK from typing_indicators.user_id to profiles.user_id
ALTER TABLE public.typing_indicators
ADD CONSTRAINT typing_indicators_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
