-- Add chat settings table for per-chat customization
CREATE TABLE IF NOT EXISTS public.chat_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  is_muted BOOLEAN DEFAULT false,
  muted_until TIMESTAMP WITH TIME ZONE,
  wallpaper_url TEXT,
  disappearing_mode TEXT DEFAULT 'off', -- 'off', '30s', '1min', 'on_seen'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, conversation_id)
);

-- Enable RLS
ALTER TABLE public.chat_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for chat_settings
CREATE POLICY "Users can view own chat settings"
ON public.chat_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat settings"
ON public.chat_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat settings"
ON public.chat_settings FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat settings"
ON public.chat_settings FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_chat_settings_updated_at
BEFORE UPDATE ON public.chat_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add disappear_at column to messages for disappearing messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS disappear_at TIMESTAMP WITH TIME ZONE;

-- Add delivered_at update trigger - when message is first fetched by recipient
-- The delivered_at column already exists from previous migration

-- Create screenshot notifications table
CREATE TABLE IF NOT EXISTS public.screenshot_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  screenshot_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notified BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE public.screenshot_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Participants can view screenshot notifications"
ON public.screenshot_notifications FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = screenshot_notifications.conversation_id
    AND conversation_participants.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own screenshot notifications"
ON public.screenshot_notifications FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_chat_settings_user_conversation ON public.chat_settings(user_id, conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_disappear_at ON public.messages(disappear_at) WHERE disappear_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_screenshot_notifications_conversation ON public.screenshot_notifications(conversation_id);