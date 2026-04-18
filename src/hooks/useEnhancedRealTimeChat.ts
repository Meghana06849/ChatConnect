import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json, Tables } from '@/integrations/supabase/types';
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
  reactions?: Reaction[] | null;
  metadata?: Record<string, unknown> | null;
}

type MessageRow = Tables<'messages'>;

interface TypingUser {
  user_id: string;
  display_name: string;
}

interface TypingBroadcastPayload {
  user_id: string;
  conversation_id: string;
  typing: boolean;
}

const MESSAGES_PER_PAGE = 50;

const toReactionList = (value: Json | null | undefined): Reaction[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
      const item = entry as Record<string, unknown>;
      if (typeof item.emoji !== 'string' || typeof item.user_id !== 'string') return null;
      return { emoji: item.emoji, user_id: item.user_id } as Reaction;
    })
    .filter((entry): entry is Reaction => entry !== null);
};

const toMetadata = (value: Json | null | undefined): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const toMessage = (row: MessageRow): Message => ({
  id: row.id,
  content: row.content,
  sender_id: row.sender_id,
  conversation_id: row.conversation_id,
  message_type: row.message_type || 'text',
  created_at: row.created_at,
  read_at: row.read_at,
  reactions: toReactionList(row.reactions),
  metadata: toMetadata(row.metadata),
});

export const useEnhancedRealTimeChat = (conversationId: string | null, disappearingMode?: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const { toast } = useToast();
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const typingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
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
      
      const messagesData = ((data || []) as MessageRow[]).map(toMessage);
      setMessages(messagesData.reverse());
      setHasMore(messagesData.length === MESSAGES_PER_PAGE);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Error loading messages",
        description: message,
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
      
      const olderMessages = ((data || []) as MessageRow[]).map(toMessage);
      if (olderMessages.length < MESSAGES_PER_PAGE) {
        setHasMore(false);
      }
      
      setMessages(prev => [...olderMessages.reverse(), ...prev]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Error loading older messages",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoadingMore(false);
    }
  }, [conversationId, loadingMore, hasMore, messages, toast]);

  // Send message
  const sendMessage = useCallback(async (content: string, messageType: string = 'text', metadata?: Record<string, unknown>) => {
    if (!conversationId || !currentUserIdRef.current || !content.trim()) return;

    try {
      const insertData: {
        conversation_id: string;
        sender_id: string;
        content: string;
        message_type: string;
        metadata?: Json;
      } = {
        conversation_id: conversationId,
        sender_id: currentUserIdRef.current,
        content: content.trim(),
        message_type: messageType,
      };
      if (metadata && Object.keys(metadata).length > 0) {
        insertData.metadata = metadata as Json;
      }

      const { error } = await supabase
        .from('messages')
        .insert(insertData);

      if (error) throw error;

      // Stop typing indicator
      if (channelRef.current && currentUserIdRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'typing',
          payload: {
            user_id: currentUserIdRef.current,
            conversation_id: conversationId,
            typing: false,
          },
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Error sending message",
        description: message,
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
    } catch (error: unknown) {
      console.error('Error marking message as read:', error);
    }
  }, [disappearingMode, scheduleDisappear]);

  // Mark all messages in conversation as read
  const markAllAsRead = useCallback(async () => {
    if (!conversationId || !currentUserIdRef.current) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('sender_id', currentUserIdRef.current)
        .is('read_at', null)
        .select('id');

      if (error) throw error;

      // Schedule disappear for newly read messages if mode is active
      if (disappearingMode && disappearingMode !== 'off') {
        (data || []).forEach((msg: { id: string }) => {
          scheduleDisappear(msg.id, disappearingMode);
        });
      }
    } catch (error: unknown) {
      console.error('Error marking messages as read:', error);
    }
  }, [conversationId, disappearingMode, scheduleDisappear]);

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

      const currentReactions = toReactionList((message?.reactions as Json) || null);
      
      const existingIndex = currentReactions.findIndex(
        (r) => r.user_id === currentUserIdRef.current && r.emoji === emoji
      );

      const updatedReactions: Reaction[] = existingIndex >= 0
        ? currentReactions.filter((_, i) => i !== existingIndex)
        : [...currentReactions, { emoji, user_id: currentUserIdRef.current! }];

      const { error } = await supabase
        .from('messages')
        .update({ reactions: updatedReactions as unknown as Json })
        .eq('id', messageId);

      if (error) throw error;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Error adding reaction",
        description: message,
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
        conversation_id: conversationId,
        typing: isTyping,
      },
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = undefined;
    }

    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => setTyping(false), 3000);
    }
  }, [conversationId]);

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
          const newMsg = toMessage(payload.new as MessageRow);
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
          const updated = toMessage(payload.new as MessageRow);
          const previous = toMessage(payload.old as MessageRow);

          setMessages((prev) =>
            prev.map((msg) => (msg.id === updated.id ? updated : msg))
          );

          // Schedule deletion only when message transitions from unread -> read.
          if (
            disappearingMode &&
            disappearingMode !== 'off' &&
            !previous?.read_at &&
            !!updated?.read_at
          ) {
            scheduleDisappear(updated.id, disappearingMode);
          }
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
      .on('broadcast', { event: 'typing' }, (payload) => {
        const data = payload.payload as TypingBroadcastPayload | undefined;
        if (!data || data.user_id === currentUserIdRef.current || data.conversation_id !== conversationId) return;

        const existingTimeout = typingTimeoutsRef.current.get(data.user_id);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
          typingTimeoutsRef.current.delete(data.user_id);
        }

        if (data.typing) {
          setTypingUsers(prev => {
            if (prev.some(u => u.user_id === data.user_id)) return prev;
            return [...prev, { user_id: data.user_id, display_name: 'Someone' }];
          });
          // Auto-clear typing after 4s
          const timeout = setTimeout(() => {
            setTypingUsers(prev => prev.filter(u => u.user_id !== data.user_id));
            typingTimeoutsRef.current.delete(data.user_id);
          }, 4000);
          typingTimeoutsRef.current.set(data.user_id, timeout);
        } else {
          setTypingUsers(prev => prev.filter(u => u.user_id !== data.user_id));
          typingTimeoutsRef.current.delete(data.user_id);
        }
      })
      .subscribe();

    channelRef.current = channel;
    const typingTimeouts = typingTimeoutsRef.current;
    const disappearTimeouts = disappearTimeoutsRef.current;

    return () => {
      channel.unsubscribe();
      channelRef.current = undefined;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = undefined;
      }
      typingTimeouts.forEach(timeout => clearTimeout(timeout));
      typingTimeouts.clear();
      disappearTimeouts.forEach(t => clearTimeout(t));
      disappearTimeouts.clear();
      setTypingUsers([]);
    };
  }, [conversationId, loadMessages, markAsRead, disappearingMode, scheduleDisappear]);

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
