import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, password } = await req.json();

    if (!userId || !password) {
      console.error("Missing userId or password");
      return new Response(
        JSON.stringify({ error: "User ID and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Login attempt with User ID:", userId.substring(0, 8) + "...");

    // Create admin client to lookup email from user_id
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Look up the user's email from profiles table using user_id
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      console.error("Profile lookup failed:", profileError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid User ID. Please check and try again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the user's email from auth.users using admin client
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (userError || !userData?.user?.email) {
      console.error("User lookup failed:", userError?.message);
      return new Response(
        JSON.stringify({ error: "User not found. Please check your User ID." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const email = userData.user.email;
    console.log("Found email for user, attempting sign in...");

    // Now sign in with the email and password
    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.error("Sign in failed:", signInError.message);
      return new Response(
        JSON.stringify({ error: "Invalid password. Please try again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Login successful for user:", userId.substring(0, 8) + "...");

    return new Response(
      JSON.stringify({
        session: signInData.session,
        user: signInData.user,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
