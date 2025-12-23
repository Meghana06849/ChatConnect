import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limit configuration
const RATE_LIMITS = {
  login: { maxAttempts: 5, windowMinutes: 15, blockMinutes: 30 },
  signup: { maxAttempts: 3, windowMinutes: 60, blockMinutes: 60 },
  password_reset: { maxAttempts: 3, windowMinutes: 60, blockMinutes: 120 },
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, identifier, attemptType = 'login' } = await req.json();
    
    if (!identifier) {
      console.error('Missing identifier in request');
      return new Response(
        JSON.stringify({ error: 'Missing identifier' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const config = RATE_LIMITS[attemptType as keyof typeof RATE_LIMITS] || RATE_LIMITS.login;
    const hashedIdentifier = await hashIdentifier(identifier);
    
    console.log(`Rate limit action: ${action}, type: ${attemptType}, identifier hash: ${hashedIdentifier.slice(0, 8)}...`);

    if (action === 'check') {
      // Check if the identifier is blocked
      const { data: rateLimit, error } = await supabase
        .from('auth_rate_limits')
        .select('*')
        .eq('identifier', hashedIdentifier)
        .eq('attempt_type', attemptType)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Database error:', error);
        throw error;
      }

      if (!rateLimit) {
        console.log('No rate limit record found, allowing request');
        return new Response(
          JSON.stringify({ allowed: true, remainingAttempts: config.maxAttempts }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const now = new Date();
      
      // Check if currently blocked
      if (rateLimit.blocked_until && new Date(rateLimit.blocked_until) > now) {
        const blockedUntil = new Date(rateLimit.blocked_until);
        const remainingMinutes = Math.ceil((blockedUntil.getTime() - now.getTime()) / 60000);
        console.log(`Identifier is blocked for ${remainingMinutes} more minutes`);
        return new Response(
          JSON.stringify({ 
            allowed: false, 
            blocked: true,
            blockedUntil: rateLimit.blocked_until,
            remainingMinutes,
            message: `Too many attempts. Please try again in ${remainingMinutes} minutes.`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if window has expired
      const windowStart = new Date(rateLimit.first_attempt_at);
      const windowEnd = new Date(windowStart.getTime() + config.windowMinutes * 60000);
      
      if (now > windowEnd) {
        // Window expired, reset counter
        console.log('Window expired, resetting counter');
        await supabase
          .from('auth_rate_limits')
          .delete()
          .eq('id', rateLimit.id);
        
        return new Response(
          JSON.stringify({ allowed: true, remainingAttempts: config.maxAttempts }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const remainingAttempts = Math.max(0, config.maxAttempts - rateLimit.attempt_count);
      console.log(`Remaining attempts: ${remainingAttempts}`);
      
      return new Response(
        JSON.stringify({ 
          allowed: remainingAttempts > 0, 
          remainingAttempts,
          message: remainingAttempts === 0 ? 'No attempts remaining' : undefined
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'record') {
      // Record a failed attempt
      const { data: existing, error: fetchError } = await supabase
        .from('auth_rate_limits')
        .select('*')
        .eq('identifier', hashedIdentifier)
        .eq('attempt_type', attemptType)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Database error:', fetchError);
        throw fetchError;
      }

      const now = new Date();

      if (!existing) {
        // Create new record
        console.log('Creating new rate limit record');
        await supabase
          .from('auth_rate_limits')
          .insert({
            identifier: hashedIdentifier,
            attempt_type: attemptType,
            attempt_count: 1,
            first_attempt_at: now.toISOString(),
            last_attempt_at: now.toISOString(),
          });
        
        return new Response(
          JSON.stringify({ recorded: true, remainingAttempts: config.maxAttempts - 1 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if window expired
      const windowStart = new Date(existing.first_attempt_at);
      const windowEnd = new Date(windowStart.getTime() + config.windowMinutes * 60000);

      if (now > windowEnd) {
        // Reset the counter
        console.log('Window expired, resetting and recording new attempt');
        await supabase
          .from('auth_rate_limits')
          .update({
            attempt_count: 1,
            first_attempt_at: now.toISOString(),
            last_attempt_at: now.toISOString(),
            blocked_until: null,
          })
          .eq('id', existing.id);
        
        return new Response(
          JSON.stringify({ recorded: true, remainingAttempts: config.maxAttempts - 1 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const newCount = existing.attempt_count + 1;
      const shouldBlock = newCount >= config.maxAttempts;
      const blockedUntil = shouldBlock 
        ? new Date(now.getTime() + config.blockMinutes * 60000).toISOString()
        : null;

      console.log(`Recording attempt ${newCount}/${config.maxAttempts}, blocking: ${shouldBlock}`);

      await supabase
        .from('auth_rate_limits')
        .update({
          attempt_count: newCount,
          last_attempt_at: now.toISOString(),
          blocked_until: blockedUntil,
        })
        .eq('id', existing.id);

      return new Response(
        JSON.stringify({ 
          recorded: true, 
          remainingAttempts: Math.max(0, config.maxAttempts - newCount),
          blocked: shouldBlock,
          blockedUntil,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'reset') {
      // Reset rate limit on successful auth
      console.log('Resetting rate limit after successful auth');
      await supabase
        .from('auth_rate_limits')
        .delete()
        .eq('identifier', hashedIdentifier)
        .eq('attempt_type', attemptType);

      return new Response(
        JSON.stringify({ reset: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Rate limit error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Hash the identifier to avoid storing plain emails
async function hashIdentifier(identifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(identifier.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}