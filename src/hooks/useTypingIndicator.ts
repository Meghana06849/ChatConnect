import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TypingUser {
  userId: string;
  displayName: string;
  isTyping: boolean;
}

export const useTypingIndicator = (conversationId: string | null, currentUserId: string | null) => {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingUpdate = useRef<number>(0);

  // Listen for typing indicators from other users
  useEffect(() => {
    if (!conversationId || !currentUserId) return;

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
          const data = payload.new as any;
          
          // Ignore our own typing
          if (data?.user_id === currentUserId) return;

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            if (data?.is_typing) {
              // Get user display name
              const { data: profile } = await supabase
                .from('profiles')
                .select('display_name')
                .eq('user_id', data.user_id)
                .maybeSingle();

              setTypingUsers(prev => {
                const existing = prev.find(u => u.userId === data.user_id);
                if (existing) {
                  return prev.map(u => 
                    u.userId === data.user_id 
                      ? { ...u, isTyping: true }
                      : u
                  );
                }
                return [...prev, {
                  userId: data.user_id,
                  displayName: profile?.display_name || 'Someone',
                  isTyping: true,
                }];
              });
            } else {
              setTypingUsers(prev => prev.filter(u => u.userId !== data.user_id));
            }
          } else if (payload.eventType === 'DELETE') {
            const oldData = payload.old as any;
            setTypingUsers(prev => prev.filter(u => u.userId !== oldData?.user_id));
          }
        }
      )
      .subscribe();

    // Load initial typing state
    const loadTypingState = async () => {
      const { data } = await supabase
        .from('typing_indicators')
        .select('user_id, is_typing')
        .eq('conversation_id', conversationId)
        .eq('is_typing', true)
        .neq('user_id', currentUserId);

      if (data && data.length > 0) {
        const usersWithNames = await Promise.all(
          data.map(async (indicator) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('display_name')
              .eq('user_id', indicator.user_id)
              .maybeSingle();
            
            return {
              userId: indicator.user_id,
              displayName: profile?.display_name || 'Someone',
              isTyping: true,
            };
          })
        );
        setTypingUsers(usersWithNames);
      }
    };

    loadTypingState();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId]);

  // Update typing status in database
  const setTyping = useCallback(async (isTyping: boolean) => {
    if (!conversationId || !currentUserId) return;

    // Throttle updates to prevent spam
    const now = Date.now();
    if (isTyping && now - lastTypingUpdate.current < 1000) return;
    lastTypingUpdate.current = now;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
      // Upsert typing indicator
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

      // Auto-stop typing after 3 seconds of no input
      if (isTyping) {
        typingTimeoutRef.current = setTimeout(() => {
          setTyping(false);
        }, 3000);
      }
    } catch (error) {
      console.error('Error updating typing indicator:', error);
    }
  }, [conversationId, currentUserId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Set typing to false when leaving
      if (conversationId && currentUserId) {
        supabase
          .from('typing_indicators')
          .upsert({
            conversation_id: conversationId,
            user_id: currentUserId,
            is_typing: false,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'conversation_id,user_id',
          })
          .then(() => {});
      }
    };
  }, [conversationId, currentUserId]);

  return {
    typingUsers: typingUsers.filter(u => u.isTyping),
    setTyping,
    isPartnerTyping: typingUsers.some(u => u.isTyping),
  };
};
