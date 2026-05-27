-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role can manage rate limits" ON public.auth_rate_limits;

-- The edge function uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS entirely.
-- We don't need any policies for regular users - only service role should access this table.
-- By having RLS enabled with NO policies, regular users cannot access the table at all,
-- while service role (used by edge function) bypasses RLS and has full access.

-- Note: RLS is already enabled on auth_rate_limits table.
-- With no policies and RLS enabled, the table is completely inaccessible to regular users,
-- but the service role key used in the edge function bypasses RLS.