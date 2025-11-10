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
        const newProfile = {
          user_id: user.id,
          username: user.user_metadata?.username || user.email || `user_${user.id.substring(0, 8)}`,
          display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
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
    } catch (error: any) {
      console.error('Profile error:', error);
      toast({
        title: "Error loading profile",
        description: error.message || "Failed to load profile data",
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
        .maybeSingle();

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