-- Fix critical security vulnerability: Restrict profile visibility to legitimate connections only

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a secure policy that only allows users to view:
-- 1. Their own profile
-- 2. Profiles of their contacts 
-- 3. Profiles of users they share conversations with
-- 4. Profiles of users in their groups
CREATE POLICY "Users can view connected profiles only" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  -- Users can always view their own profile
  auth.uid() = user_id
  OR
  -- Users can view profiles of their contacts
  EXISTS (
    SELECT 1 FROM public.contacts 
    WHERE (contacts.user_id = auth.uid() AND contacts.contact_user_id = profiles.user_id)
       OR (contacts.contact_user_id = auth.uid() AND contacts.user_id = profiles.user_id)
  )
  OR
  -- Users can view profiles of people in their conversations
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp1
    JOIN public.conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
    WHERE cp1.user_id = auth.uid() AND cp2.user_id = profiles.user_id
  )
  OR
  -- Users can view profiles of people in their groups
  EXISTS (
    SELECT 1 FROM public.group_members gm1
    JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
    WHERE gm1.user_id = auth.uid() AND gm2.user_id = profiles.user_id
  )
);