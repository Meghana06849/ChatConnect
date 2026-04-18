import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useUserPresence = () => {
  const heartbeatRef = useRef<NodeJS.Timeout>();
  const blurTimeoutRef = useRef<NodeJS.Timeout>();
  const isActiveRef = useRef(true);
  const lastStatusRef = useRef<boolean | null>(null);

  // Update presence status
  const updatePresence = useCallback(async (isOnline: boolean, force: boolean = false) => {
    if (!force && lastStatusRef.current === isOnline) {
      return;
    }

    try {
      await supabase.rpc('update_user_presence', { is_online_status: isOnline });
      lastStatusRef.current = isOnline;
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  }, []);

  // Set user online
  const setOnline = useCallback(() => {
    isActiveRef.current = true;
    updatePresence(true);
  }, [updatePresence]);

  // Set user offline
  const setOffline = useCallback(() => {
    isActiveRef.current = false;
    updatePresence(false);
  }, [updatePresence]);

  useEffect(() => {
    // Initial online status
    setOnline();

    // Heartbeat to maintain online status
    heartbeatRef.current = setInterval(() => {
      if (isActiveRef.current) {
        updatePresence(true, true);
      }
    }, 30000); // Every 30 seconds

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = undefined;
      }

      if (document.hidden) {
        setOffline();
      } else {
        setOnline();
      }
    };

    // Handle before unload
    const handleBeforeUnload = () => {
      setOffline();
    };

    // Handle focus/blur
    const handleFocus = () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = undefined;
      }
      setOnline();
    };

    const handleBlur = () => {
      // Delay offline status in case user switches tabs briefly
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }

      blurTimeoutRef.current = setTimeout(() => {
        if (document.hidden) {
          setOffline();
        }
        blurTimeoutRef.current = undefined;
      }, 5000);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = undefined;
      }
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = undefined;
      }
      setOffline();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [setOnline, setOffline, updatePresence]);

  return { setOnline, setOffline };
};

// Format last seen time
export const formatLastSeen = (lastSeen: string | null | undefined): string => {
  if (!lastSeen) return 'Unknown';
  
  const now = new Date();
  const lastSeenDate = new Date(lastSeen);
  const diffMs = now.getTime() - lastSeenDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return lastSeenDate.toLocaleDateString();
};
