-- Create moments/stories table
CREATE TABLE public.moments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT,
  media_url TEXT,
  media_type TEXT DEFAULT 'text',
  music_id UUID REFERENCES public.user_songs(id) ON DELETE SET NULL,
  music_start_time INTEGER DEFAULT 0,
  privacy_type TEXT DEFAULT 'all_friends',
  excluded_users UUID[] DEFAULT '{}',
  included_users UUID[] DEFAULT '{}',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create moment views tracking table
CREATE TABLE public.moment_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  moment_id UUID NOT NULL REFERENCES public.moments(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(moment_id, viewer_id)
);

-- Enable RLS
ALTER TABLE public.moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moment_views ENABLE ROW LEVEL SECURITY;

-- Moments policies
CREATE POLICY "Users can create their own moments"
ON public.moments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own moments"
ON public.moments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own moments"
ON public.moments FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can view moments based on privacy settings"
ON public.moments FOR SELECT
USING (
  auth.uid() = user_id OR
  (
    expires_at > now() AND
    (
      (privacy_type = 'all_friends' AND NOT (auth.uid() = ANY(excluded_users))) OR
      (privacy_type = 'selected' AND auth.uid() = ANY(included_users)) OR
      privacy_type = 'everyone'
    ) AND
    EXISTS (
      SELECT 1 FROM contacts
      WHERE (contacts.user_id = moments.user_id AND contacts.contact_user_id = auth.uid() AND contacts.status = 'accepted')
      OR (contacts.contact_user_id = moments.user_id AND contacts.user_id = auth.uid() AND contacts.status = 'accepted')
    )
  )
);

-- Moment views policies
CREATE POLICY "Users can record their own views"
ON public.moment_views FOR INSERT
WITH CHECK (auth.uid() = viewer_id);

CREATE POLICY "Moment owners can see who viewed their moments"
ON public.moment_views FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM moments
    WHERE moments.id = moment_views.moment_id AND moments.user_id = auth.uid()
  ) OR auth.uid() = viewer_id
);

-- Create index for performance
CREATE INDEX idx_moments_user_id ON public.moments(user_id);
CREATE INDEX idx_moments_expires_at ON public.moments(expires_at);
CREATE INDEX idx_moment_views_moment_id ON public.moment_views(moment_id);

-- Trigger for updated_at
CREATE TRIGGER update_moments_updated_at
BEFORE UPDATE ON public.moments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();