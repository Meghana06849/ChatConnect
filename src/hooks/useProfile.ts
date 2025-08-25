import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  user_id: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  is_online: boolean;
  lovers_mode_enabled: boolean;
  lovers_partner_id?: string;
  dream_room_pin?: string;
  love_coins: number;
}

export const useProfile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      setProfile(profileData);
    } catch (error: any) {
      toast({
        title: "Error loading profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      
      setProfile(data);
      toast({
        title: "Profile updated",
        description: "Your changes have been saved.",
      });
      
      return data;
    } catch (error: any) {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const toggleLoversMode = async (enabled: boolean, pin?: string) => {
    try {
      const updates: any = { lovers_mode_enabled: enabled };
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
    } catch (error: any) {
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
  }, []);

  return {
    profile,
    loading,
    updateProfile,
    toggleLoversMode,
    loadProfile
  };
};