
-- Fix contacts: the existing policy is RESTRICTIVE (Permissive: No) which blocks all access
-- since there are no permissive policies. Drop it and recreate as PERMISSIVE.
DROP POLICY IF EXISTS "Users can manage own contacts" ON public.contacts;

CREATE POLICY "Users can manage own contacts"
ON public.contacts
FOR ALL
USING ((auth.uid() = user_id) OR (auth.uid() = contact_user_id))
WITH CHECK ((auth.uid() = user_id) OR (auth.uid() = contact_user_id));

-- Fix blocked_users: same issue
DROP POLICY IF EXISTS "Users can manage own blocks" ON public.blocked_users;

CREATE POLICY "Users can manage own blocks"
ON public.blocked_users
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fix call_history: same issue
DROP POLICY IF EXISTS "Users can view own call history" ON public.call_history;

CREATE POLICY "Users can view own call history"
ON public.call_history
FOR ALL
USING ((auth.uid() = caller_id) OR (auth.uid() = callee_id))
WITH CHECK ((auth.uid() = caller_id) OR (auth.uid() = callee_id));
