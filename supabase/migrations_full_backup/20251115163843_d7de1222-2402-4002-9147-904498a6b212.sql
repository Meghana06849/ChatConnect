-- Create storage bucket for wallpapers
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'wallpapers',
  'wallpapers',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
);

-- Create user wallpapers table
CREATE TABLE IF NOT EXISTS public.user_wallpapers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_wallpaper_url TEXT,
  night_wallpaper_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_wallpapers ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_wallpapers table
CREATE POLICY "Users can view own wallpapers"
  ON public.user_wallpapers
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallpapers"
  ON public.user_wallpapers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wallpapers"
  ON public.user_wallpapers
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own wallpapers"
  ON public.user_wallpapers
  FOR DELETE
  USING (auth.uid() = user_id);

-- Storage policies for wallpapers bucket
CREATE POLICY "Users can view all wallpapers"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'wallpapers');

CREATE POLICY "Users can upload own wallpapers"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'wallpapers' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own wallpapers"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'wallpapers' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own wallpapers"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'wallpapers' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Trigger for updated_at
CREATE TRIGGER update_user_wallpapers_updated_at
  BEFORE UPDATE ON public.user_wallpapers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();