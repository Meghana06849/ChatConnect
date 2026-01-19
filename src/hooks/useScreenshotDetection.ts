import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useScreenshotDetection = (conversationId: string | null, enabled: boolean = true) => {
  const { toast } = useToast();
  const lastNotificationRef = useRef<string | null>(null);

  // Detect screenshot (keyboard shortcut based)
  const handleScreenshotDetection = useCallback(async () => {
    if (!conversationId || !enabled) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Insert screenshot notification
      await supabase
        .from('screenshot_notifications')
        .insert({
          conversation_id: conversationId,
          user_id: user.id,
          screenshot_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error recording screenshot:', error);
    }
  }, [conversationId, enabled]);

  // Listen for screenshot keyboard shortcuts
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Common screenshot shortcuts
      const isScreenshot = 
        e.key === 'PrintScreen' || 
        (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5')) || // Mac
        (e.ctrlKey && e.shiftKey && e.key === 's') || // Some apps
        (e.metaKey && e.shiftKey && e.key === 's'); // Mac apps
      
      if (isScreenshot) {
        handleScreenshotDetection();
      }
    };

    // Visibility change detection (some screenshot tools minimize/restore)
    const handleVisibilityChange = () => {
      // This is a heuristic - not all visibility changes are screenshots
      // We only detect if very quick hide/show pattern
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, handleScreenshotDetection]);

  // Subscribe to screenshot notifications from others
  useEffect(() => {
    if (!conversationId || !enabled) return;

    const channel = supabase
      .channel(`screenshots:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'screenshot_notifications',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user || payload.new.user_id === user.id) return;
          
          // Prevent duplicate notifications
          if (lastNotificationRef.current === payload.new.id) return;
          lastNotificationRef.current = payload.new.id;

          // Get the username of who took screenshot
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('user_id', payload.new.user_id)
            .single();

          toast({
            title: "📸 Screenshot Detected",
            description: `${profile?.display_name || 'Someone'} took a screenshot of this chat`,
            variant: "destructive",
          });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [conversationId, enabled, toast]);

  return {
    reportScreenshot: handleScreenshotDetection
  };
};
