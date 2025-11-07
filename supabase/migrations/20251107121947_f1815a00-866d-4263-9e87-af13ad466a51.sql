-- Add missing RLS policies for conversations table
CREATE POLICY "Users can create conversations"
ON conversations FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their conversations"
ON conversations FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their conversations"
ON conversations FOR DELETE
USING (auth.uid() = created_by);

-- Add missing RLS policies for conversation_participants table
CREATE POLICY "Conversation creators can add participants"
ON conversation_participants FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = conversation_id
    AND conversations.created_by = auth.uid()
  )
);

CREATE POLICY "Users can manage conversation participants"
ON conversation_participants FOR DELETE
USING (
  user_id = auth.uid()  -- Can remove self
  OR
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = conversation_id
    AND conversations.created_by = auth.uid()  -- Creator can remove anyone
  )
);