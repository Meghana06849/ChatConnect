
-- 1. Fix moment_reactions SELECT policy
DROP POLICY IF EXISTS "Anyone who can see the moment can see its reactions" ON public.moment_reactions;
DROP POLICY IF EXISTS "Users can see reactions on visible moments" ON public.moment_reactions;

CREATE POLICY "Users can see reactions on visible moments"
ON public.moment_reactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.moments m
    WHERE m.id = moment_reactions.moment_id
    AND (
      m.user_id = auth.uid()
      OR (
        m.expires_at > now()
        AND (
          (m.privacy_type = 'everyone')
          OR (m.privacy_type = 'all_friends' AND NOT (auth.uid() = ANY(m.excluded_users))
              AND EXISTS (
                SELECT 1 FROM public.contacts c
                WHERE ((c.user_id = m.user_id AND c.contact_user_id = auth.uid()) 
                    OR (c.contact_user_id = m.user_id AND c.user_id = auth.uid()))
                  AND c.status = 'accepted'
              ))
          OR (m.privacy_type = 'selected' AND auth.uid() = ANY(m.included_users))
        )
      )
    )
  )
);

-- 2. Add verification-documents SELECT policy
CREATE POLICY "Users can view own verification documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'verification-documents' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 3. Fix group_call_participants: allow seeing co-participants
CREATE POLICY "Users can see co-participants in group calls"
ON public.group_call_participants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_call_participants p2
    WHERE p2.room_id = group_call_participants.room_id
    AND p2.user_id = auth.uid()
  )
);

-- 4. Add media bucket DELETE/UPDATE policies
CREATE POLICY "Users can delete own media files"
ON storage.objects FOR DELETE
USING (bucket_id = 'media' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own media files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'media' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 5. Add songs bucket DELETE/UPDATE policies
CREATE POLICY "Users can delete own song files"
ON storage.objects FOR DELETE
USING (bucket_id = 'songs' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own song files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'songs' AND (auth.uid())::text = (storage.foldername(name))[1]);
