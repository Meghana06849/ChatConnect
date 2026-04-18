import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';
import { RealtimeChannel } from '@supabase/supabase-js';
import { getDreamRoomId } from '@/lib/dreamRoom';

interface PresenceState {
  partnerOnline: boolean;
  partnerLastSeen: Date | null;
  partnerId: string | null;
  partnerName: string | null;
  partnerMood: string | null;
}

export const useDreamRoomPresence = () => {
  const { profile } = useProfile();
  const [presenceState, setPresenceState] = useState<PresenceState>({
    partnerOnline: false,
    partnerLastSeen: null,
    partnerId: null,
    partnerName: null,
    partnerMood: null,
  });
  const channelRef = useRef<RealtimeChannel | null>(null);
  const profileChannelRef = useRef<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const resetPartnerState = useCallback(() => {
    setPresenceState({
      partnerOnline: false,
      partnerLastSeen: null,
      partnerId: null,
      partnerName: null,
      partnerMood: null,
    });
  }, []);

  // Join the Dream Room presence channel
  useEffect(() => {
    if (!profile?.user_id || !profile?.lovers_partner_id) {
      setIsConnected(false);
      resetPartnerState();
      return;
    }

    let isActive = true;
    setIsConnected(false);
    resetPartnerState();

    // Shared dream_room_id for this linked couple
    const roomId = getDreamRoomId(profile.user_id, profile.lovers_partner_id);
    // Keep the channel name aligned with realtime authorization rules.
    const dreamChannelName = `dream-chat:${roomId}`;

    const dreamRoomChannel = supabase.channel(dreamChannelName, {
      config: {
        presence: {
          key: profile.user_id,
        },
      },
    });

    // Listen for presence sync events
    dreamRoomChannel
      .on('presence', { event: 'sync' }, () => {
        const state = dreamRoomChannel.presenceState();
        
        // Check if partner is in the presence state
        const partnerPresence = state[profile.lovers_partner_id!];
        
        if (partnerPresence && partnerPresence.length > 0) {
          const partnerData = partnerPresence[0] as { display_name?: string; mood?: string };
          setPresenceState(prev => ({
            ...prev,
            partnerOnline: true,
            partnerLastSeen: new Date(),
            partnerId: profile.lovers_partner_id!,
            partnerName: partnerData.display_name || prev.partnerName,
            partnerMood: partnerData.mood || null,
          }));
        } else {
          setPresenceState(prev => ({
            ...prev,
            // Keep profile-based online status if available and only clear dream-specific mood.
            partnerMood: null,
          }));
        }
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (key === profile.lovers_partner_id) {
          const partnerData = newPresences[0] as { display_name?: string; mood?: string };
          setPresenceState(prev => ({
            ...prev,
            partnerOnline: true,
            partnerLastSeen: new Date(),
            partnerId: profile.lovers_partner_id!,
            partnerName: partnerData.display_name || prev.partnerName,
            partnerMood: partnerData.mood || null,
          }));
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (key === profile.lovers_partner_id) {
          setPresenceState(prev => ({
            ...prev,
            // Partner may still be online in Lovers mode, just not in DreamRoom presence.
            partnerMood: null,
            partnerLastSeen: new Date(),
          }));
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && isActive) {
          setIsConnected(true);
          
          // Track our presence with user info
          await dreamRoomChannel.track({
            user_id: profile.user_id,
            display_name: profile.display_name || 'Love',
            online_at: new Date().toISOString(),
            mood: '💕',
          });
        }
      });

    channelRef.current = dreamRoomChannel;

    // Subscribe to partner profile updates for live online/offline fallback when partner
    // is active in Lovers mode chat but not currently tracked in DreamRoom presence.
    const partnerProfileChannel = supabase
      .channel(`dreamroom-profile:${profile.user_id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `user_id=eq.${profile.lovers_partner_id}`,
      }, (payload) => {
        const next = payload.new as { is_online?: boolean | null; display_name?: string | null; last_seen?: string | null };
        setPresenceState(prev => ({
          ...prev,
          partnerOnline: Boolean(next.is_online),
          partnerName: next.display_name || prev.partnerName,
          partnerLastSeen: next.last_seen ? new Date(next.last_seen) : prev.partnerLastSeen,
          partnerId: profile.lovers_partner_id!,
        }));
      })
      .subscribe();

    profileChannelRef.current = partnerProfileChannel;

    // Load partner profile info
    const loadPartnerInfo = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name, is_online')
        .eq('user_id', profile.lovers_partner_id!)
        .maybeSingle();
      
      if (data && isActive) {
        setPresenceState(prev => ({
          ...prev,
          partnerId: profile.lovers_partner_id!,
          partnerName: data.display_name,
          partnerOnline: Boolean(data.is_online),
        }));
      }
    };

    loadPartnerInfo();

    return () => {
      isActive = false;
      setIsConnected(false);
      if (channelRef.current === dreamRoomChannel) {
        channelRef.current = null;
      }
      if (profileChannelRef.current === partnerProfileChannel) {
        profileChannelRef.current = null;
      }
      void dreamRoomChannel.untrack();
      dreamRoomChannel.unsubscribe();
      partnerProfileChannel.unsubscribe();
      resetPartnerState();
    };
  }, [profile?.user_id, profile?.lovers_partner_id, profile?.display_name, resetPartnerState]);

  // Update mood
  const updateMood = useCallback(async (mood: string) => {
    if (!channelRef.current || !profile) return;
    
    await channelRef.current.track({
      user_id: profile.user_id,
      display_name: profile.display_name || 'Love',
      online_at: new Date().toISOString(),
      mood,
    });
  }, [profile]);

  // Leave presence (call when leaving Dream Room)
  const leavePresence = useCallback(async () => {
    if (channelRef.current) {
      await channelRef.current.untrack();
      setIsConnected(false);
      resetPartnerState();
    }
  }, [resetPartnerState]);

  return {
    ...presenceState,
    isConnected,
    updateMood,
    leavePresence,
  };
};
