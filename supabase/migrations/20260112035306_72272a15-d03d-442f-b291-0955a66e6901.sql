-- Drop the existing restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;

-- Create new SELECT policy that allows viewing if user is creator OR participant
CREATE POLICY "Users can view their conversations"
ON public.conversations
FOR SELECT
USING (
  auth.uid() = created_by 
  OR public.is_conversation_participant(id, auth.uid())
);