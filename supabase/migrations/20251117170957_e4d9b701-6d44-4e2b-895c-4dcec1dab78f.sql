-- Create vault_items table for encrypted content metadata
CREATE TABLE IF NOT EXISTS public.vault_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  partner_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  item_type text NOT NULL, -- 'photo', 'video', 'message', 'document'
  file_url text,
  encrypted_content text, -- For text messages
  thumbnail_url text,
  file_size bigint,
  mime_type text,
  is_favorite boolean DEFAULT false,
  tags text[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vault_items ENABLE ROW LEVEL SECURITY;

-- Create policies for vault items
CREATE POLICY "Users can view own vault items"
  ON public.vault_items
  FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = partner_id);

CREATE POLICY "Users can create vault items"
  ON public.vault_items
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vault items"
  ON public.vault_items
  FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = partner_id);

CREATE POLICY "Users can delete own vault items"
  ON public.vault_items
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_vault_items_updated_at
  BEFORE UPDATE ON public.vault_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for vault files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vault',
  'vault',
  false,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'application/pdf', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for vault bucket
CREATE POLICY "Users can upload own vault files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'vault' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own vault files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'vault' AND
    (
      auth.uid()::text = (storage.foldername(name))[1] OR
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.lovers_partner_id::text = (storage.foldername(name))[1]
      )
    )
  );

CREATE POLICY "Users can update own vault files"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'vault' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own vault files"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'vault' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );