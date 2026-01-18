import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Minimum response time in milliseconds to prevent timing attacks
const MIN_RESPONSE_TIME_MS = 500;

// Generic error message that doesn't reveal whether user exists
const GENERIC_AUTH_ERROR = "Invalid credentials. Please check your User ID and password.";

// Constant-time string comparison to prevent timing attacks
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do the comparison to maintain constant time
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ (b.charCodeAt(i % b.length) || 0);
    }
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// Ensure response takes at least MIN_RESPONSE_TIME_MS
async function delayedResponse(
  startTime: number,
  response: Response
): Promise<Response> {
  const elapsed = Date.now() - startTime;
  const remainingDelay = Math.max(0, MIN_RESPONSE_TIME_MS - elapsed);
  
  if (remainingDelay > 0) {
    await new Promise(resolve => setTimeout(resolve, remainingDelay));
  }
  
  return response;
}

serve(async (req) => {
  const startTime = Date.now();
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, password } = await req.json();

    if (!userId || !password) {
      console.error("Missing userId or password");
      return delayedResponse(
        startTime,
        new Response(
          JSON.stringify({ error: GENERIC_AUTH_ERROR }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      );
    }

    console.log("Login attempt with User ID (redacted):", userId.substring(0, 3) + "***");

    // Create admin client to lookup email from user_id
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Check if userId is a UUID or custom_user_id
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    
    // Always perform ALL lookups to maintain constant time, regardless of which one succeeds
    // This prevents attackers from determining which lookup method found the user
    
    let uuidLookupResult: string | null = null;
    let customIdResult: string | null = null;
    let usernameResult: string | null = null;
    let displayNameResult: string | null = null;
    let partialMatchResult: string | null = null;

    // Perform all lookups in parallel to normalize timing
    const lookupPromises = await Promise.allSettled([
      // UUID lookup
      isUUID 
        ? supabaseAdmin.from("profiles").select("user_id").eq("user_id", userId).maybeSingle()
        : Promise.resolve({ data: null }),
      
      // Custom user ID lookup
      supabaseAdmin.from("profiles").select("user_id").eq("custom_user_id", userId).maybeSingle(),
      
      // Username lookup (case-insensitive)
      supabaseAdmin.from("profiles").select("user_id").ilike("username", userId).maybeSingle(),
      
      // Display name lookup (case-insensitive)
      supabaseAdmin.from("profiles").select("user_id").ilike("display_name", userId).maybeSingle(),
      
      // Partial username match
      supabaseAdmin.from("profiles").select("user_id, username").ilike("username", `${userId}%`).limit(1).maybeSingle()
    ]);

    // Extract results from settled promises
    if (lookupPromises[0].status === 'fulfilled' && lookupPromises[0].value?.data?.user_id) {
      uuidLookupResult = lookupPromises[0].value.data.user_id;
    }
    if (lookupPromises[1].status === 'fulfilled' && lookupPromises[1].value?.data?.user_id) {
      customIdResult = lookupPromises[1].value.data.user_id;
    }
    if (lookupPromises[2].status === 'fulfilled' && lookupPromises[2].value?.data?.user_id) {
      usernameResult = lookupPromises[2].value.data.user_id;
    }
    if (lookupPromises[3].status === 'fulfilled' && lookupPromises[3].value?.data?.user_id) {
      displayNameResult = lookupPromises[3].value.data.user_id;
    }
    if (lookupPromises[4].status === 'fulfilled' && lookupPromises[4].value?.data?.user_id) {
      partialMatchResult = lookupPromises[4].value.data.user_id;
    }

    // Determine the auth user ID with priority order
    // UUID match > custom_user_id > exact username > display_name > partial username
    let authUserId: string | null = null;
    
    if (isUUID && uuidLookupResult) {
      authUserId = uuidLookupResult;
    } else if (customIdResult) {
      authUserId = customIdResult;
    } else if (usernameResult) {
      authUserId = usernameResult;
    } else if (displayNameResult) {
      authUserId = displayNameResult;
    } else if (partialMatchResult) {
      authUserId = partialMatchResult;
    }

    // Always attempt to get user data and sign in, even with null userId
    // This prevents timing differences from revealing user existence
    let email: string | null = null;
    
    if (authUserId) {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(authUserId);
      email = userData?.user?.email ?? null;
    } else {
      // Simulate the same database call timing even when user not found
      await supabaseAdmin.auth.admin.getUserById("00000000-0000-0000-0000-000000000000");
    }

    // Create anon client for sign in attempt
    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Always attempt sign in to maintain constant timing
    // Use a dummy email if user wasn't found to still perform the operation
    const signInEmail = email || `nonexistent_${Date.now()}@invalid.local`;
    
    const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
      email: signInEmail,
      password,
    });

    // Check for success - user was found AND password was correct
    if (email && signInData?.session && !signInError) {
      console.log("Login successful");
      
      return delayedResponse(
        startTime,
        new Response(
          JSON.stringify({
            session: signInData.session,
            user: signInData.user,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      );
    }

    // Return generic error for any failure (user not found OR wrong password)
    console.log("Login failed - invalid credentials");
    
    return delayedResponse(
      startTime,
      new Response(
        JSON.stringify({ error: GENERIC_AUTH_ERROR }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    
    return delayedResponse(
      startTime,
      new Response(
        JSON.stringify({ error: "An unexpected error occurred. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    );
  }
});
