import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TypingUser {
  userId: string;
  displayName: string;
  isTyping: boolean;
}

interface TypingIndicatorRow {
  user_id: string;
  is_typing: boolean;
}

interface TypingBroadcastPayload {
  user_id?: string;
  conversation_id?: string;
  typing?: boolean;
  display_name?: string;
}

export const useTypingIndicator = (conversationId: string | null, currentUserId: string | null) => {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastDbTypingUpdateRef = useRef<number>(0);
  const displayNameCacheRef = useRef<Map<string, string>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const upsertTypingIndicator = useCallback(async (isTyping: boolean) => {
    if (!conversationId || !currentUserId) return;

    try {
      await supabase
        .from('typing_indicators')
        .upsert({
          conversation_id: conversationId,
          user_id: currentUserId,
          is_typing: isTyping,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'conversation_id,user_id',
        });
    } catch (error) {
      console.error('Error updating typing indicator:', error);
    }
  }, [conversationId, currentUserId]);

  // Listen for typing indicators from other users
  useEffect(() => {
    if (!conversationId || !currentUserId) {
      setTypingUsers([]);
      return;
    }

    let isActive = true;

    const applyTypingState = (userId: string, isTyping: boolean, displayName?: string) => {
      if (isTyping) {
        setTypingUsers(prev => {
          const existing = prev.find(u => u.userId === userId);
          if (existing) {
            return prev.map(u =>
              u.userId === userId
                ? { ...u, isTyping: true, displayName: displayName || u.displayName }
                : u
            );
          }
          return [...prev, {
            userId,
            displayName: displayName || 'Someone',
            isTyping: true,
          }];
        });
      } else {
        setTypingUsers(prev => prev.filter(u => u.userId !== userId));
      }
    };

    const getDisplayName = async (userId: string) => {
      const cached = displayNameCacheRef.current.get(userId);
      if (cached) return cached;

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', userId)
        .maybeSingle();

      const displayName = profile?.display_name || 'Someone';
      displayNameCacheRef.current.set(userId, displayName);
      return displayName;
    };

    // Subscribe to typing indicator changes
    const channel = supabase
      .channel(`typing-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const data = (payload.eventType === 'DELETE' ? payload.old : payload.new) as TypingIndicatorRow | undefined;

          if (!isActive || !data?.user_id) return;
          
          // Ignore our own typing
          if (data?.user_id === currentUserId) return;

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            if (data?.is_typing) {
              const displayName = await getDisplayName(data.user_id);
              if (!isActive) return;
              applyTypingState(data.user_id, true, displayName);
            } else {
              applyTypingState(data.user_id, false);
            }
          } else if (payload.eventType === 'DELETE') {
            const oldData = payload.old as TypingIndicatorRow | undefined;
            if (oldData?.user_id) {
              applyTypingState(oldData.user_id, false);
            }
          }
        }
      )
      .on('broadcast', { event: 'typing' }, async (payload) => {
        const data = payload.payload as TypingBroadcastPayload;

        if (
          !isActive ||
          !data?.user_id ||
          data.user_id === currentUserId ||
          data.conversation_id !== conversationId
        ) {
          return;
        }

        let displayName = data.display_name;
        if (!displayName && data.typing) {
          displayName = await getDisplayName(data.user_id);
          if (!isActive) return;
        }

        applyTypingState(data.user_id, Boolean(data.typing), displayName);
      })
      .subscribe();

    channelRef.current = channel;

    // Load initial typing state
    const loadTypingState = async () => {
      const { data } = await supabase
        .from('typing_indicators')
        .select('user_id, is_typing')
        .eq('conversation_id', conversationId)
        .eq('is_typing', true)
        .neq('user_id', currentUserId);

      if (!isActive) return;

      if (data && data.length > 0) {
        const usersWithNames = await Promise.all(
          data.map(async (indicator) => {
            const displayName = await getDisplayName(indicator.user_id);
            return {
              userId: indicator.user_id,
              displayName,
              isTyping: true,
            };
          })
        );
        if (!isActive) return;
        setTypingUsers(usersWithNames);
      } else {
        setTypingUsers([]);
      }
    };

    loadTypingState();

    return () => {
      isActive = false;
      supabase.removeChannel(channel);
      if (channelRef.current === channel) {
        channelRef.current = null;
      }
      setTypingUsers([]);
    };
  }, [conversationId, currentUserId]);

  // Broadcast typing immediately and persist to DB on a controlled cadence.
  const setTyping = useCallback(async (isTyping: boolean) => {
    if (!conversationId || !currentUserId) return;

    channelRef.current?.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        user_id: currentUserId,
        conversation_id: conversationId,
        typing: isTyping,
      },
    });

    // Throttle DB writes to prevent churn while still providing fallback state.
    const now = Date.now();
    const shouldPersist = !isTyping || now - lastDbTypingUpdateRef.current >= 1000;
    if (shouldPersist) {
      lastDbTypingUpdateRef.current = now;
      await upsertTypingIndicator(isTyping);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    // Auto-stop typing after 3 seconds of no input
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        void setTyping(false);
      }, 3000);
    }
  }, [conversationId, currentUserId, upsertTypingIndicator]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      // Set typing to false when leaving
      if (conversationId && currentUserId) {
        channelRef.current?.send({
          type: 'broadcast',
          event: 'typing',
          payload: {
            user_id: currentUserId,
            conversation_id: conversationId,
            typing: false,
          },
        });
        void upsertTypingIndicator(false);
      }
    };
  }, [conversationId, currentUserId, upsertTypingIndicator]);

  return {
    typingUsers: typingUsers.filter(u => u.isTyping),
    setTyping,
    isPartnerTyping: typingUsers.some(u => u.isTyping),
  };
};
