-- Create storage buckets for profile pictures and media
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('profiles', 'profiles', true),
  ('media', 'media', false),
  ('songs', 'songs', false);

-- Create policies for profile uploads
CREATE POLICY "Anyone can view profile images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'profiles');

CREATE POLICY "Users can upload their own profile image" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own profile image" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policies for media uploads
CREATE POLICY "Users can view their own media" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own media" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policies for songs
CREATE POLICY "Users can view their own songs" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'songs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own songs" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'songs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add groups table for group chats
CREATE TABLE public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on groups
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Create policies for groups
CREATE POLICY "Users can view groups they're part of" 
ON public.groups 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.group_members 
  WHERE group_members.group_id = groups.id 
  AND group_members.user_id = auth.uid()
));

CREATE POLICY "Users can create groups" 
ON public.groups 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group creators can update their groups" 
ON public.groups 
FOR UPDATE 
USING (auth.uid() = created_by);

-- Create group members table
CREATE TABLE public.group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Enable RLS on group_members
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Create policies for group_members
CREATE POLICY "Users can view group members of their groups" 
ON public.group_members 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.group_members gm2 
  WHERE gm2.group_id = group_members.group_id 
  AND gm2.user_id = auth.uid()
));

CREATE POLICY "Group admins can manage members" 
ON public.group_members 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.group_members gm 
  WHERE gm.group_id = group_members.group_id 
  AND gm.user_id = auth.uid() 
  AND gm.role = 'admin'
));

-- Create user_songs table for song collection
CREATE TABLE public.user_songs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  file_url TEXT,
  duration INTEGER,
  genre TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user_songs
ALTER TABLE public.user_songs ENABLE ROW LEVEL SECURITY;

-- Create policies for user_songs
CREATE POLICY "Users can manage their own songs" 
ON public.user_songs 
FOR ALL 
USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update conversations table to support groups
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.groups(id);

-- Update existing conversations policies to handle groups
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;

CREATE POLICY "Users can view conversations they participate in" 
ON public.conversations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants 
    WHERE conversation_participants.conversation_id = conversations.id 
    AND conversation_participants.user_id = auth.uid()
  )
  OR 
  (
    group_id IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM public.group_members 
      WHERE group_members.group_id = conversations.group_id 
      AND group_members.user_id = auth.uid()
    )
  )
);