// Supabase client configuration using environment variables
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Read from environment variables (never hardcode sensitive data!)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

// Validate that required environment variables are set
if (!SUPABASE_URL) {
  console.error('❌ SUPABASE_URL environment variable is not set. Check your .env file.');
}
if (!SUPABASE_PUBLISHABLE_KEY) {
  console.error('❌ SUPABASE_PUBLISHABLE_KEY environment variable is not set. Check your .env file.');
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});