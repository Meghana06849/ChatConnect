-- Add privacy settings columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT jsonb_build_object(
  'show_profile_photo', 'everyone',
  'show_last_seen', 'everyone', 
  'show_online_status', 'everyone',
  'show_moments', 'everyone'
);

-- Add comment explaining privacy_settings values
-- 'everyone' = visible to all
-- 'contacts' = visible to contacts only
-- 'nobody' = hidden from everyone

-- Add friends_count virtual column via computed (or we'll calculate it in app)
-- Create index for faster privacy checks
CREATE INDEX IF NOT EXISTS idx_profiles_privacy ON public.profiles USING GIN (privacy_settings);