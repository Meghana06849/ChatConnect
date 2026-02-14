-- Add deleted_for column to messages table for "Delete for Me" functionality
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_for jsonb DEFAULT '[]'::jsonb;