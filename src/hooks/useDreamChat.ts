import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { getDreamRoomId } from '@/lib/dreamRoom';

interface DreamMessage {
  id: string;
  dream_room_id: string;
  content: string;
  sender_id: string;
  partner_id: string;
  message_type: string;
  created_at: string;
  read_at?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface TypingUser {
  user_id: string;
  display_name: string;
}

type DreamChannelPayload =
  | { type: 'typing'; roomId: string; userId: string; partnerId: string; typing: boolean };

const mergeDreamMessages = (messages: DreamMessage[]) => {
  const byId = new Map<string, DreamMessage>();
  for (const message of messages) {
    byId.set(message.id, message);
  }

  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
};

const getErrorMessage = (error: unknown): string => {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const candidate = error as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    };

    const parts = [candidate.code, candidate.message, candidate.details, candidate.hint]
      .filter((part): part is string => typeof part === 'string' && part.trim().length > 0);

    if (parts.length > 0) {
      return parts.join(' | ');
    }

    try {
      return JSON.stringify(error);
    } catch {
      return 'Unknown error';
    }
  }

  return 'Unknown error';
};

export const useDreamChat = (partnerId: string | null) => {
  const [messages, setMessages] = useState<DreamMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [dreamRoomId, setDreamRoomId] = useState<string | null>(null);
  const { toast } = useToast();

  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const partnerTypingTimeoutRef = useRef<NodeJS.Timeout>();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const localChannelRef = useRef<BroadcastChannel | null>(null);

  interface TypingBroadcastPayload {
    user_id: string;
    partner_id: string;
    dream_room_id: string;
    typing: boolean;
  }

  // Load current user
  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    loadUser();
  }, []);

  // Compute shared dream room id
  useEffect(() => {
    if (!currentUserId || !partnerId) {
      setDreamRoomId(null);
      setMessages([]);
      setTypingUsers([]);
      return;
    }
    setDreamRoomId(getDreamRoomId(currentUserId, partnerId));
  }, [currentUserId, partnerId]);

  const loadMessages = useCallback(async () => {
    if (!dreamRoomId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('dream_messages')
        .select('*')
        .eq('dream_room_id', dreamRoomId)
        .order('created_at', { ascending: true })
        .limit(200);

      if (error) throw error;
      const remoteMessages = (data || []) as DreamMessage[];
      setMessages(remoteMessages);
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      toast({
        title: 'Error loading dream messages',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [dreamRoomId, toast]);

  const markAsRead = useCallback(async () => {
    if (!dreamRoomId || !currentUserId || !partnerId) return;

    try {
      await supabase
        .from('dream_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('dream_room_id', dreamRoomId)
        .eq('sender_id', partnerId)
        .eq('partner_id', currentUserId)
        .is('read_at', null);
    } catch (error) {
      console.error('Error marking dream messages as read:', error);
    }
  }, [dreamRoomId, currentUserId, partnerId]);

  const setTyping = useCallback((isTyping: boolean) => {
    if (!currentUserId || !partnerId || !dreamRoomId) return;

    const typingPayload: DreamChannelPayload = {
      type: 'typing',
      roomId: dreamRoomId,
      userId: currentUserId,
      partnerId,
      typing: isTyping,
    };

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          user_id: currentUserId,
          partner_id: partnerId,
          dream_room_id: dreamRoomId,
          typing: isTyping,
        },
      });
    }

    localChannelRef.current?.postMessage(typingPayload);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => setTyping(false), 3000);
    }
  }, [currentUserId, partnerId, dreamRoomId]);

  const sendMessage = useCallback(async (content: string, messageType: string = 'text', metadata?: Record<string, unknown>) => {
    if (!dreamRoomId || !currentUserId || !partnerId || !content.trim()) return false;

    const tempId = `temp-${Date.now()}`;
    const tempMessage: DreamMessage = {
      id: tempId,
      dream_room_id: dreamRoomId,
      content: content.trim(),
      sender_id: currentUserId,
      partner_id: partnerId,
      message_type: messageType,
      created_at: new Date().toISOString(),
      read_at: null,
      metadata: metadata || null,
    };

    // Optimistic insert
    setMessages(prev => [...prev, tempMessage]);

    try {
      const insertData: {
        dream_room_id: string;
        sender_id: string;
        partner_id: string;
        content: string;
        message_type: string;
        metadata?: Json;
      } = {
        dream_room_id: dreamRoomId,
        sender_id: currentUserId,
        partner_id: partnerId,
        content: content.trim(),
        message_type: messageType,
      };

      if (metadata && Object.keys(metadata).length > 0) {
        insertData.metadata = metadata as Json;
      }

      const { data, error } = await supabase
        .from('dream_messages')
        .insert(insertData)
        .select('*')
        .single();

      if (error) throw error;

      if (data) {
        // Replace temp message with real one
        const confirmedMessage = data as DreamMessage;
        setMessages(prev => {
          const next = prev.map(msg => (msg.id === tempId ? confirmedMessage : msg));
          return next;
        });
      }

      setTyping(false);
      return true;
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      const errorObject = error as { code?: unknown; message?: unknown };
      const isRowLevelSecurityError =
        errorObject?.code === '42501' ||
        (typeof errorObject?.message === 'string' && /row-level security|rls/i.test(errorObject.message));

      // Remove temp message on failure
      console.error('Error sending dream message:', error);

      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      toast({
        title: 'Error sending dream message',
        description: isRowLevelSecurityError
          ? 'Dream messages are still blocked by the database policy. Apply the live Supabase migration so both partners can see the same message.'
          : message,
        variant: 'destructive',
      });
      return false;
    }
  }, [dreamRoomId, currentUserId, partnerId, setTyping, toast]);

  // Subscribe to realtime updates for this dream room only
  useEffect(() => {
    if (!dreamRoomId || !currentUserId || !partnerId) return;

    loadMessages();
    markAsRead();

    const channel = supabase
      .channel(`dream-chat:${dreamRoomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'dream_messages',
        filter: `dream_room_id=eq.${dreamRoomId}`,
      }, (payload) => {
        const msg = payload.new as DreamMessage;

        setMessages(prev => {
          // Skip if already exists (including temp messages replaced by real ones)
          if (prev.some(existing => existing.id === msg.id)) return prev;
          // Also remove any temp message from same sender at ~same time
          const filtered = prev.filter(existing => {
            if (!existing.id.startsWith('temp-')) return true;
            return existing.sender_id !== msg.sender_id;
          });
          return [...filtered, msg];
        });

        // Auto mark as read if from partner
        if (msg.sender_id === partnerId) {
          supabase
            .from('dream_messages')
            .update({ read_at: new Date().toISOString() })
            .eq('id', msg.id)
            .then();
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'dream_messages',
        filter: `dream_room_id=eq.${dreamRoomId}`,
      }, (payload) => {
        const msg = payload.new as DreamMessage;
        setMessages(prev => prev.map(m => (m.id === msg.id ? msg : m)));
      })
      .on('broadcast', { event: 'typing' }, (payload) => {
        const data = payload.payload as TypingBroadcastPayload | undefined;

        if (
          data?.dream_room_id !== dreamRoomId ||
          data?.user_id !== partnerId ||
          data?.partner_id !== currentUserId
        ) {
          return;
        }

        if (partnerTypingTimeoutRef.current) {
          clearTimeout(partnerTypingTimeoutRef.current);
        }

        if (data.typing) {
          setTypingUsers([{ user_id: partnerId, display_name: 'Partner' }]);
          // Auto-clear after 4s
          partnerTypingTimeoutRef.current = setTimeout(() => {
            setTypingUsers([]);
            partnerTypingTimeoutRef.current = undefined;
          }, 4000);
        } else {
          setTypingUsers([]);
          partnerTypingTimeoutRef.current = undefined;
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = undefined;
      }
      if (partnerTypingTimeoutRef.current) {
        clearTimeout(partnerTypingTimeoutRef.current);
        partnerTypingTimeoutRef.current = undefined;
      }
      setTypingUsers([]);
    };
  }, [dreamRoomId, currentUserId, partnerId, loadMessages, markAsRead]);

  return {
    messages,
    typingUsers,
    loading,
    sendMessage,
    setTyping,
    markAsRead,
    dreamRoomId,
  };
};
