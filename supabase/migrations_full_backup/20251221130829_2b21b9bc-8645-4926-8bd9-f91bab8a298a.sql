-- Add policy to allow users to update messages (for read receipts and reactions)
CREATE POLICY "Users can update messages in their conversations" 
ON public.messages 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = messages.conversation_id
    AND conversation_participants.user_id = auth.uid()
  )
);

-- Enable realtime for messages table
ALTER TABLE public.messages REPLICA IDENTITY FULL;