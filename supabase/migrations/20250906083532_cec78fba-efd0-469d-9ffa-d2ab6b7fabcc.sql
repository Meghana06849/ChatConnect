-- Create or update the trigger for handling new user profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved function to handle new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id, 
    username, 
    display_name,
    is_online,
    lovers_mode_enabled,
    love_coins
  )
  VALUES (
    NEW.id, 
    COALESCE(NEW.email, 'user_' || substring(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(COALESCE(NEW.email, 'user'), '@', 1)),
    true,
    false,
    100
  );
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update existing profiles that might be missing data
UPDATE public.profiles 
SET 
  username = COALESCE(username, 'user_' || substring(user_id::text, 1, 8)),
  display_name = COALESCE(display_name, 'User'),
  love_coins = COALESCE(love_coins, 100),
  is_online = COALESCE(is_online, false),
  lovers_mode_enabled = COALESCE(lovers_mode_enabled, false)
WHERE username IS NULL OR display_name IS NULL OR love_coins IS NULL;