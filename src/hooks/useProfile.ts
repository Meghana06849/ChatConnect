import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

export interface Profile {
  id: string;
  user_id: string;
  username?: string;
  custom_user_id?: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  is_online: boolean;
  is_verified?: boolean;
  verification_type?: string;
  lovers_mode_enabled: boolean;
  lovers_partner_id?: string;
  dream_room_pin?: string;
  love_coins: number;
  privacy_settings?: Json | null;
}

type ProfileUpsert = Partial<Pick<Profile, 'lovers_mode_enabled' | 'dream_room_pin' | 'lovers_partner_id'>>;

export const useProfile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Profile loading error:', error);
        throw error;
      }
      
      // If no profile exists, create one
      if (!profileData) {
        const customId = user.user_metadata?.custom_user_id || `user_${user.id.substring(0, 8)}`;
        const newProfile = {
          user_id: user.id,
          username: customId.toLowerCase(),
          custom_user_id: customId,
          display_name: user.user_metadata?.display_name || customId,
          is_online: true,
          lovers_mode_enabled: false,
          love_coins: 100
        };
        
        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();
          
        if (createError) throw createError;
        setProfile(createdProfile);
      } else {
        setProfile(profileData);
      }
    } catch (error) {
      console.error('Profile error:', error);
      toast({
        title: "Error loading profile",
        description: error instanceof Error ? error.message : "Failed to load profile data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .maybeSingle();

      if (error) throw error;
      
      setProfile(data);
      toast({
        title: "Profile updated",
        description: "Your changes have been saved.",
      });
      
      return data;
    } catch (error) {
      toast({
        title: "Error updating profile",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      });
      throw error;
    }
  };

  const toggleLoversMode = async (enabled: boolean, pin?: string) => {
    try {
      const updates: ProfileUpsert = { lovers_mode_enabled: enabled };
      if (enabled && pin) {
        updates.dream_room_pin = pin;
      } else if (!enabled) {
        updates.dream_room_pin = null;
        updates.lovers_partner_id = null;
      }

      await updateProfile(updates);
      return true;
    } catch (error) {
      return false;
    }
  };

  const linkLoversPartner = async (partnerId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Ensure current user is marked as Lovers Mode enabled before linking.
      await supabase
        .from('profiles')
        .update({ lovers_mode_enabled: true })
        .eq('user_id', user.id);

      const { data, error } = await supabase.rpc('link_lovers_partner', {
        _partner_id: partnerId,
      });

      if (error) {
        // Fallback: save pending partner link on current profile so user can continue,
        // even if partner has not completed their side yet.
        const { error: fallbackError } = await supabase
          .from('profiles')
          .update({ lovers_partner_id: partnerId, lovers_mode_enabled: true })
          .eq('user_id', user.id);

        if (fallbackError) throw error;

        await loadProfile();
        toast({
          title: 'Partner link pending 💌',
          description: 'Your request is saved. Ask your partner to enable Lovers Mode and link back.',
        });
        return true;
      }

      await loadProfile();
      toast({
        title: 'Partner linked 💕',
        description: 'Dream Room chat and calls are now available for your linked partner.',
      });

      return Boolean(data);
    } catch (error) {
      toast({
        title: 'Could not link partner',
        description: error instanceof Error ? error.message : 'Please make sure both users enabled Lovers Mode and are accepted friends.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const setOnlineStatus = async (isOnline: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('profiles')
        .update({ 
          is_online: isOnline,
          last_seen: new Date().toISOString()
        })
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error updating online status:', error);
    }
  };

  useEffect(() => {
    loadProfile();

    // Set online status
    setOnlineStatus(true);

    // Set offline when page unloads
    const handleBeforeUnload = () => setOnlineStatus(false);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Set up periodic online status updates
    const interval = setInterval(() => setOnlineStatus(true), 30000);

    return () => {
      setOnlineStatus(false);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(interval);
    };
  }, [loadProfile]);

  return {
    profile,
    loading,
    updateProfile,
    toggleLoversMode,
    linkLoversPartner,
    loadProfile
  };
};
