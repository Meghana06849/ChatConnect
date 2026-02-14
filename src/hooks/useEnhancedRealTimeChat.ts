import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Reaction {
  emoji: string;
  user_id: string;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  conversation_id: string;
  message_type: string;
  created_at: string;
  read_at?: string | null;
  reactions?: any;
  metadata?: any;
}

interface TypingUser {
  user_id: string;
  display_name: string;
}

const MESSAGES_PER_PAGE = 50;

export const useEnhancedRealTimeChat = (conversationId: string | null, disappearingMode?: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const { toast } = useToast();
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const channelRef = useRef<RealtimeChannel>();
  const currentUserIdRef = useRef<string>();
  const disappearTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Load current user
  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) currentUserIdRef.current = user.id;
    };
    loadUser();
  }, []);

  // Load initial messages for conversation (most recent)
  const loadMessages = useCallback(async () => {
    if (!conversationId) return;

    setLoading(true);
    setHasMore(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(MESSAGES_PER_PAGE);

      if (error) throw error;
      
      const messagesData = (data || []) as Message[];
      // Reverse to show oldest first in the list
      setMessages(messagesData.reverse());
      setHasMore(messagesData.length === MESSAGES_PER_PAGE);
    } catch (error: any) {
      toast({
        title: "Error loading messages",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [conversationId, toast]);

  // Load older messages (for infinite scroll)
  const loadOlderMessages = useCallback(async () => {
    if (!conversationId || loadingMore || !hasMore || messages.length === 0) return;

    setLoadingMore(true);
    try {
      const oldestMessage = messages[0];
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .lt('created_at', oldestMessage.created_at)
        .order('created_at', { ascending: false })
        .limit(MESSAGES_PER_PAGE);

      if (error) throw error;
      
      const olderMessages = (data || []) as Message[];
      if (olderMessages.length < MESSAGES_PER_PAGE) {
        setHasMore(false);
      }
      
      // Prepend older messages (reversed to maintain chronological order)
      setMessages(prev => [...olderMessages.reverse(), ...prev]);
    } catch (error: any) {
      toast({
        title: "Error loading older messages",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingMore(false);
    }
  }, [conversationId, loadingMore, hasMore, messages, toast]);

  // Send message
  const sendMessage = useCallback(async (content: string, messageType: string = 'text', metadata?: Record<string, any>) => {
    if (!conversationId || !currentUserIdRef.current) return;

    try {
      const insertData: any = {
        conversation_id: conversationId,
        sender_id: currentUserIdRef.current,
        content,
        message_type: messageType,
      };
      if (metadata && Object.keys(metadata).length > 0) {
        insertData.metadata = metadata;
      }

      const { error } = await supabase
        .from('messages')
        .insert([insertData]);

      if (error) throw error;

      // Stop typing indicator
      await setTyping(false);
    } catch (error: any) {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [conversationId, toast]);

  // Schedule disappearing message deletion
  const scheduleDisappear = useCallback(async (messageId: string, mode: string) => {
    if (!mode || mode === 'off') return;

    let delayMs = 0;
    if (mode === '30s') delayMs = 30_000;
    else if (mode === '1min') delayMs = 60_000;
    else if (mode === 'on_seen') delayMs = 2000; // small delay so user sees "read" status

    // Clear any existing timeout for this message
    const existing = disappearTimeoutsRef.current.get(messageId);
    if (existing) clearTimeout(existing);

    const timeout = setTimeout(async () => {
      try {
        await supabase.from('messages').delete().eq('id', messageId);
        setMessages(prev => prev.filter(m => m.id !== messageId));
      } catch (e) {
        console.error('Failed to delete disappearing message:', e);
      }
      disappearTimeoutsRef.current.delete(messageId);
    }, delayMs);

    disappearTimeoutsRef.current.set(messageId, timeout);
  }, []);

  // Mark message as read
  const markAsRead = useCallback(async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', messageId)
        .is('read_at', null);

      if (error) throw error;

      // If disappearing mode is active, schedule deletion
      if (disappearingMode && disappearingMode !== 'off') {
        scheduleDisappear(messageId, disappearingMode);
      }
    } catch (error: any) {
      console.error('Error marking message as read:', error);
    }
  }, [disappearingMode, scheduleDisappear]);

  // Mark all messages in conversation as read
  const markAllAsRead = useCallback(async () => {
    if (!conversationId || !currentUserIdRef.current) return;

    try {
      const { error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('sender_id', currentUserIdRef.current)
        .is('read_at', null);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error marking messages as read:', error);
    }
  }, [conversationId]);

  // Add reaction to message
  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!currentUserIdRef.current) return;

    try {
      // Get current message
      const { data: message, error: fetchError } = await supabase
        .from('messages')
        .select('reactions')
        .eq('id', messageId)
        .single();

      if (fetchError) throw fetchError;

      const currentReactions: Reaction[] = Array.isArray(message?.reactions) 
        ? (message.reactions as unknown as Reaction[])
        : [];
      
      const existingReactionIndex = currentReactions.findIndex(
        (r) => r.user_id === currentUserIdRef.current && r.emoji === emoji
      );

      let updatedReactions: Reaction[];
      if (existingReactionIndex >= 0) {
        // Remove reaction if it already exists
        updatedReactions = currentReactions.filter((_, i) => i !== existingReactionIndex);
      } else {
        // Add new reaction
        updatedReactions = [...currentReactions, { emoji, user_id: currentUserIdRef.current! }];
      }

      const { error } = await supabase
        .from('messages')
        .update({ reactions: updatedReactions as any })
        .eq('id', messageId);

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Error adding reaction",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [toast]);

  // Set typing indicator
  const setTyping = useCallback(async (isTyping: boolean) => {
    if (!conversationId || !currentUserIdRef.current) return;

    try {
      if (isTyping) {
        // Upsert typing indicator
        const { error } = await supabase
          .from('typing_indicators')
          .upsert({
            conversation_id: conversationId,
            user_id: currentUserIdRef.current,
            is_typing: true,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'conversation_id,user_id'
          });

        if (error) throw error;

        // Clear existing timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        // Auto-clear after 3 seconds
        typingTimeoutRef.current = setTimeout(() => {
          setTyping(false);
        }, 3000);
      } else {
        // Remove typing indicator
        await supabase
          .from('typing_indicators')
          .delete()
          .eq('conversation_id', conversationId)
          .eq('user_id', currentUserIdRef.current);
      }
    } catch (error: any) {
      console.error('Error setting typing indicator:', error);
    }
  }, [conversationId]);

  // Real-time subscriptions
  useEffect(() => {
    if (!conversationId) return;

    loadMessages();

    // Subscribe to messages, typing indicators, and presence
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('New message:', payload);
          setMessages((prev) => [...prev, payload.new as Message]);
          
          // Mark as read if not from current user
          if (payload.new.sender_id !== currentUserIdRef.current) {
            setTimeout(() => markAsRead(payload.new.id), 500);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('Message updated:', payload);
          setMessages((prev) =>
            prev.map((msg) => (msg.id === payload.new.id ? payload.new as Message : msg))
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('Message deleted:', payload);
          setMessages((prev) => prev.filter((msg) => msg.id !== payload.old.id));
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          console.log('Typing indicator update:', payload);
          
          // Fetch all typing users
          const { data, error } = await supabase
            .from('typing_indicators')
            .select(`
              user_id,
              profiles!typing_indicators_user_id_fkey(display_name)
            `)
            .eq('conversation_id', conversationId)
            .eq('is_typing', true)
            .neq('user_id', currentUserIdRef.current || '');

          if (!error && data) {
            setTypingUsers(
              data.map((item: any) => ({
                user_id: item.user_id,
                display_name: item.profiles?.display_name || 'Someone'
              }))
            );
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Clean up disappearing message timeouts
      disappearTimeoutsRef.current.forEach(t => clearTimeout(t));
      disappearTimeoutsRef.current.clear();
    };
  }, [conversationId, loadMessages, markAsRead]);

  // Mark messages as read when conversation opens
  useEffect(() => {
    if (conversationId) {
      markAllAsRead();
    }
  }, [conversationId, markAllAsRead]);

  return {
    messages,
    typingUsers,
    loading,
    loadingMore,
    hasMore,
    sendMessage,
    addReaction,
    markAsRead,
    setTyping,
    loadOlderMessages,
  };
};
