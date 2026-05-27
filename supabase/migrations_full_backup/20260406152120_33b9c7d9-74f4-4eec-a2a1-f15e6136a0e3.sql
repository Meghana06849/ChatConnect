-- Block all direct access to lovers_mode_secrets; only SECURITY DEFINER functions can touch it
CREATE POLICY "No direct access to lovers_mode_secrets"
ON public.lovers_mode_secrets
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);