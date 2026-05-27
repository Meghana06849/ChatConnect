-- Add read_at column to messages for read receipts
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at timestamp with time zone;

-- Add reactions column to messages (stores JSON array of reactions)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT '[]'::jsonb;

-- Create typing_indicators table for real-time typing status
CREATE TABLE IF NOT EXISTS typing_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  is_typing boolean DEFAULT false,
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Enable RLS on typing_indicators
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own typing indicators
CREATE POLICY "Users can manage own typing indicators"
ON typing_indicators
FOR ALL
USING (auth.uid() = user_id);

-- Allow users to view typing indicators in their conversations
CREATE POLICY "Users can view typing indicators in conversations"
ON typing_indicators
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = typing_indicators.conversation_id
    AND conversation_participants.user_id = auth.uid()
  )
);

-- Enable realtime for typing indicators
ALTER TABLE typing_indicators REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE typing_indicators;

-- Enable realtime for messages (for read receipts and reactions)
ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;