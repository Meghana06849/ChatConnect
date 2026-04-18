-- One-time historical separation for moments data between General and Lovers modes.
-- Adds an explicit mode bucket and backfills existing rows.

ALTER TABLE public.moments
ADD COLUMN IF NOT EXISTS audience_mode text NOT NULL DEFAULT 'general';

ALTER TABLE public.moments
DROP CONSTRAINT IF EXISTS moments_audience_mode_check;

ALTER TABLE public.moments
ADD CONSTRAINT moments_audience_mode_check
CHECK (audience_mode IN ('general', 'lovers'));

-- Ensure all rows start from a known baseline.
UPDATE public.moments
SET audience_mode = 'general'
WHERE audience_mode IS DISTINCT FROM 'general';

-- Reshape and tag lovers moments for users currently in Lovers mode with a linked partner.
-- This normalizes ambiguous historical rows into partner-only visibility.
UPDATE public.moments m
SET
  audience_mode = 'lovers',
  privacy_type = 'selected',
  included_users = ARRAY[p.lovers_partner_id],
  excluded_users = ARRAY[]::uuid[]
FROM public.profiles p
WHERE p.user_id = m.user_id
  AND p.lovers_mode_enabled = true
  AND p.lovers_partner_id IS NOT NULL
  AND (
    m.privacy_type IS NULL
    OR m.privacy_type IN ('everyone', 'all_friends')
    OR (
      m.privacy_type = 'selected'
      AND (
        m.included_users IS NULL
        OR cardinality(m.included_users) = 0
        OR (
          cardinality(m.included_users) = 1
          AND m.included_users[1] = p.lovers_partner_id
        )
      )
    )
  );

CREATE INDEX IF NOT EXISTS idx_moments_audience_mode
ON public.moments (audience_mode, created_at DESC);
