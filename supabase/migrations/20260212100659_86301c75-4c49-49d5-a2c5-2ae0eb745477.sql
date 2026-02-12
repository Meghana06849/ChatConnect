
-- Make media bucket public so uploaded images/videos are accessible
UPDATE storage.buckets SET public = true WHERE id = 'media';

-- Add unique constraint on moment_views for upsert to work
ALTER TABLE public.moment_views ADD CONSTRAINT moment_views_moment_viewer_unique UNIQUE (moment_id, viewer_id);
