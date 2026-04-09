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
    if (!conversationId || !currentUserIdRef.current || !content.trim()) return;

    try {
      const insertData: any = {
        conversation_id: conversationId,
        sender_id: currentUserIdRef.current,
        content: content.trim(),
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
      setTyping(false);
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
    else if (mode === 'on_seen') delayMs = 2000;

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

  // Add reaction to message (toggle)
  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!currentUserIdRef.current) return;

    try {
      const { data: message, error: fetchError } = await supabase
        .from('messages')
        .select('reactions')
        .eq('id', messageId)
        .single();

      if (fetchError) throw fetchError;

      const currentReactions: Reaction[] = Array.isArray(message?.reactions) 
        ? (message.reactions as unknown as Reaction[])
        : [];
      
      const existingIndex = currentReactions.findIndex(
        (r) => r.user_id === currentUserIdRef.current && r.emoji === emoji
      );

      const updatedReactions: Reaction[] = existingIndex >= 0
        ? currentReactions.filter((_, i) => i !== existingIndex)
        : [...currentReactions, { emoji, user_id: currentUserIdRef.current! }];

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

  // Set typing indicator via broadcast (no DB writes for speed)
  const setTyping = useCallback((isTyping: boolean) => {
    if (!channelRef.current || !currentUserIdRef.current) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        user_id: currentUserIdRef.current,
        typing: isTyping,
      },
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => setTyping(false), 3000);
    }
  }, []);

  // Real-time subscriptions
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setTypingUsers([]);
      return;
    }

    loadMessages();

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
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            // Prevent duplicates
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          
          // Mark as read if not from current user
          if (newMsg.sender_id !== currentUserIdRef.current) {
            setTimeout(() => markAsRead(newMsg.id), 500);
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
          setMessages((prev) => prev.filter((msg) => msg.id !== payload.old.id));
        }
      )
      // Use broadcast for typing instead of DB writes (faster, no RLS issues)
      .on('broadcast', { event: 'typing' }, (payload: any) => {
        const data = payload.payload;
        if (!data || data.user_id === currentUserIdRef.current) return;

        if (data.typing) {
          setTypingUsers(prev => {
            if (prev.some(u => u.user_id === data.user_id)) return prev;
            return [...prev, { user_id: data.user_id, display_name: 'Someone' }];
          });
          // Auto-clear typing after 4s
          setTimeout(() => {
            setTypingUsers(prev => prev.filter(u => u.user_id !== data.user_id));
          }, 4000);
        } else {
          setTypingUsers(prev => prev.filter(u => u.user_id !== data.user_id));
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = undefined;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      disappearTimeoutsRef.current.forEach(t => clearTimeout(t));
      disappearTimeoutsRef.current.clear();
      setTypingUsers([]);
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
