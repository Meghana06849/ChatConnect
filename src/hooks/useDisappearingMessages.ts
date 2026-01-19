import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DisappearingMessageConfig {
  mode: 'off' | '30s' | '1min' | 'on_seen';
  conversationId: string | null;
}

export const useDisappearingMessages = ({ mode, conversationId }: DisappearingMessageConfig) => {
  const deleteTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Calculate disappear time based on mode
  const getDisappearDelay = useCallback((mode: string): number | null => {
    switch (mode) {
      case '30s': return 30 * 1000;
      case '1min': return 60 * 1000;
      case 'on_seen': return 0; // Delete immediately when seen
      default: return null;
    }
  }, []);

  // Schedule message for deletion
  const scheduleMessageDeletion = useCallback(async (messageId: string, delayMs: number) => {
    // Clear existing timeout if any
    const existingTimeout = deleteTimeoutsRef.current.get(messageId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    if (delayMs === 0) {
      // Delete immediately
      await deleteMessage(messageId);
    } else {
      // Schedule deletion
      const timeout = setTimeout(async () => {
        await deleteMessage(messageId);
        deleteTimeoutsRef.current.delete(messageId);
      }, delayMs);
      
      deleteTimeoutsRef.current.set(messageId, timeout);
    }
  }, []);

  // Delete a message
  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) {
        console.error('Error deleting disappearing message:', error);
      }
    } catch (error) {
      console.error('Error deleting disappearing message:', error);
    }
  };

  // Handle message being read - trigger disappearing if mode is 'on_seen'
  const handleMessageRead = useCallback(async (messageId: string, readAt: string) => {
    if (mode === 'off' || !conversationId) return;

    const delay = getDisappearDelay(mode);
    if (delay === null) return;

    // For 'on_seen', delete immediately after reading
    if (mode === 'on_seen') {
      // Small delay to let UI update
      await scheduleMessageDeletion(messageId, 2000);
    } else {
      // For timed modes, start countdown from when message was read
      await scheduleMessageDeletion(messageId, delay);
    }
  }, [mode, conversationId, getDisappearDelay, scheduleMessageDeletion]);

  // Set disappear_at when sending message
  const getDisappearAt = useCallback((): string | null => {
    if (mode === 'off') return null;
    
    const delay = getDisappearDelay(mode);
    if (delay === null || delay === 0) return null;
    
    // For timed modes, set disappear_at based on when it will be read (estimate)
    // This is primarily for tracking - actual deletion happens on read
    return null;
  }, [mode, getDisappearDelay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      deleteTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      deleteTimeoutsRef.current.clear();
    };
  }, []);

  return {
    handleMessageRead,
    getDisappearAt,
    mode
  };
};
