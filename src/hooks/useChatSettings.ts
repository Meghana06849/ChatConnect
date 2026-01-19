import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ChatSettings {
  id?: string;
  user_id: string;
  conversation_id: string;
  is_muted: boolean;
  muted_until?: string | null;
  wallpaper_url?: string | null;
  disappearing_mode: 'off' | '30s' | '1min' | 'on_seen';
}

export const useChatSettings = (conversationId: string | null) => {
  const [settings, setSettings] = useState<ChatSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Load settings for conversation
  const loadSettings = useCallback(async () => {
    if (!conversationId) return;
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('chat_settings')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setSettings(data as ChatSettings);
      } else {
        // Return default settings
        setSettings({
          user_id: user.id,
          conversation_id: conversationId,
          is_muted: false,
          disappearing_mode: 'off'
        });
      }
    } catch (error: any) {
      console.error('Error loading chat settings:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Update or create settings
  const updateSettings = useCallback(async (updates: Partial<ChatSettings>) => {
    if (!conversationId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('chat_settings')
        .upsert({
          user_id: user.id,
          conversation_id: conversationId,
          ...settings,
          ...updates,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,conversation_id'
        });

      if (error) throw error;

      setSettings(prev => prev ? { ...prev, ...updates } : null);
      
      toast({
        title: "Settings updated",
        description: "Your chat settings have been saved.",
      });
    } catch (error: any) {
      toast({
        title: "Error updating settings",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [conversationId, settings, toast]);

  // Toggle mute
  const toggleMute = useCallback(async () => {
    await updateSettings({ is_muted: !settings?.is_muted });
  }, [settings?.is_muted, updateSettings]);

  // Set disappearing mode
  const setDisappearingMode = useCallback(async (mode: 'off' | '30s' | '1min' | 'on_seen') => {
    await updateSettings({ disappearing_mode: mode });
  }, [updateSettings]);

  // Set wallpaper
  const setWallpaper = useCallback(async (url: string | null) => {
    await updateSettings({ wallpaper_url: url });
  }, [updateSettings]);

  return {
    settings,
    loading,
    updateSettings,
    toggleMute,
    setDisappearingMode,
    setWallpaper,
    reload: loadSettings
  };
};
