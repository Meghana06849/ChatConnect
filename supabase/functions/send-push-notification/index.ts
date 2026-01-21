import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  userId: string;
  title: string;
  body: string;
  tag?: string;
  data?: Record<string, any>;
}

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; tag?: string; data?: Record<string, any> }
): Promise<boolean> {
  try {
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: payload.tag || 'notification',
      data: payload.data || { url: '/dashboard' },
      actions: [
        { action: 'open', title: 'View' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    });

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'TTL': '86400'
      },
      body: notificationPayload
    });

    console.log('Push response status:', response.status);
    return response.ok || response.status === 201;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
}

// Check if caller has a valid relationship with target user (conversation, contact, or group)
async function hasRelationshipWithUser(
  supabase: any,
  callerId: string,
  targetUserId: string
): Promise<boolean> {
  // Check if they share a conversation
  const { data: sharedConversation } = await supabase.rpc('is_conversation_participant', {
    _conversation_id: null, // We need to check if they share ANY conversation
    _user_id: callerId
  });

  // Check if they're in contacts (friends)
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id')
    .or(`and(user_id.eq.${callerId},contact_user_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},contact_user_id.eq.${callerId})`)
    .eq('status', 'accepted')
    .limit(1);

  if (contacts && contacts.length > 0) {
    return true;
  }

  // Check if they share a conversation via conversation_participants
  const { data: callerConversations } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', callerId);

  if (callerConversations && callerConversations.length > 0) {
    const conversationIds = callerConversations.map((c: any) => c.conversation_id);
    
    const { data: sharedParticipant } = await supabase
      .from('conversation_participants')
      .select('id')
      .eq('user_id', targetUserId)
      .in('conversation_id', conversationIds)
      .limit(1);

    if (sharedParticipant && sharedParticipant.length > 0) {
      return true;
    }
  }

  // Check if they share a group
  const { data: callerGroups } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', callerId);

  if (callerGroups && callerGroups.length > 0) {
    const groupIds = callerGroups.map((g: any) => g.group_id);
    
    const { data: sharedGroup } = await supabase
      .from('group_members')
      .select('id')
      .eq('user_id', targetUserId)
      .in('group_id', groupIds)
      .limit(1);

    if (sharedGroup && sharedGroup.length > 0) {
      return true;
    }
  }

  return false;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify caller's authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing or invalid authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create client with caller's auth context for verification
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify the JWT and get claims
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('Auth error:', claimsError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const callerId = claimsData.claims.sub;
    if (!callerId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Could not identify caller' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const payload: PushPayload = await req.json();
    console.log('Received push notification request from:', callerId, 'for:', payload.userId);

    const { userId, title, body, tag, data } = payload;

    if (!userId || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, title, body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create service role client for checking relationships and sending notifications
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Authorization check: caller must have a relationship with target user
    // Allow sending to self (for testing) or to users with an established relationship
    if (callerId !== userId) {
      const hasRelationship = await hasRelationshipWithUser(supabaseService, callerId, userId);
      
      if (!hasRelationship) {
        console.warn('Authorization denied: No relationship between', callerId, 'and', userId);
        return new Response(
          JSON.stringify({ error: 'Forbidden: You can only send notifications to your contacts or conversation participants' }),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Get user's push subscriptions
    const { data: subscriptions, error: subError } = await supabaseService
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No push subscriptions found for user:', userId);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No push subscriptions found for user' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Found ${subscriptions.length} subscription(s) for user`);

    // Send push to all subscribed devices
    const results = await Promise.allSettled(
      subscriptions.map((sub: any) =>
        sendWebPush(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          { title, body, tag, data }
        )
      )
    );

    const successCount = results.filter(
      r => r.status === 'fulfilled' && r.value === true
    ).length;

    console.log(`Successfully sent ${successCount}/${subscriptions.length} push notifications`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        total: subscriptions.length 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in send-push-notification:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
