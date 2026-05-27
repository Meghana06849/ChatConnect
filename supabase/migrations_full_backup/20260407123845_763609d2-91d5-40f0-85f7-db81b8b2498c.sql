
-- Remove sensitive tables from Realtime publication (no IF EXISTS for DROP TABLE in ALTER PUBLICATION)
-- Use individual DO blocks with proper error handling

DO $$ BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.auth_rate_limits';
EXCEPTION WHEN undefined_object THEN NULL;
          WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.push_subscriptions';
EXCEPTION WHEN undefined_object THEN NULL;
          WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.blocked_users';
EXCEPTION WHEN undefined_object THEN NULL;
          WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.lovers_mode_secrets';
EXCEPTION WHEN undefined_object THEN NULL;
          WHEN OTHERS THEN NULL;
END $$;
