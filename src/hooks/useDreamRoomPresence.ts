import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';
import { RealtimeChannel } from '@supabase/supabase-js';

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
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Join the Dream Room presence channel
  useEffect(() => {
    if (!profile?.user_id || !profile?.lovers_partner_id) return;

    // Create a unique room ID for the couple (sorted to be consistent)
    const coupleIds = [profile.user_id, profile.lovers_partner_id].sort();
    const roomId = `dreamroom_${coupleIds.join('_')}`;

    const dreamRoomChannel = supabase.channel(roomId, {
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
          const partnerData = partnerPresence[0] as any;
          setPresenceState(prev => ({
            ...prev,
            partnerOnline: true,
            partnerLastSeen: new Date(),
            partnerName: partnerData.display_name || prev.partnerName,
            partnerMood: partnerData.mood || null,
          }));
        } else {
          setPresenceState(prev => ({
            ...prev,
            partnerOnline: false,
          }));
        }
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (key === profile.lovers_partner_id) {
          const partnerData = newPresences[0] as any;
          setPresenceState(prev => ({
            ...prev,
            partnerOnline: true,
            partnerLastSeen: new Date(),
            partnerName: partnerData.display_name || prev.partnerName,
            partnerMood: partnerData.mood || null,
          }));
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (key === profile.lovers_partner_id) {
          setPresenceState(prev => ({
            ...prev,
            partnerOnline: false,
            partnerLastSeen: new Date(),
          }));
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
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

    setChannel(dreamRoomChannel);

    // Load partner profile info
    const loadPartnerInfo = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name, is_online')
        .eq('user_id', profile.lovers_partner_id!)
        .maybeSingle();
      
      if (data) {
        setPresenceState(prev => ({
          ...prev,
          partnerId: profile.lovers_partner_id!,
          partnerName: data.display_name,
        }));
      }
    };

    loadPartnerInfo();

    return () => {
      dreamRoomChannel.unsubscribe();
    };
  }, [profile?.user_id, profile?.lovers_partner_id, profile?.display_name]);

  // Update mood
  const updateMood = useCallback(async (mood: string) => {
    if (!channel || !profile) return;
    
    await channel.track({
      user_id: profile.user_id,
      display_name: profile.display_name || 'Love',
      online_at: new Date().toISOString(),
      mood,
    });
  }, [channel, profile]);

  // Leave presence (call when leaving Dream Room)
  const leavePresence = useCallback(async () => {
    if (channel) {
      await channel.untrack();
    }
  }, [channel]);

  return {
    ...presenceState,
    isConnected,
    updateMood,
    leavePresence,
  };
};
