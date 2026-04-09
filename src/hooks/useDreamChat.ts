import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
  metadata?: any;
}

interface TypingUser {
  user_id: string;
  display_name: string;
}

export const useDreamChat = (partnerId: string | null) => {
  const [messages, setMessages] = useState<DreamMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [dreamRoomId, setDreamRoomId] = useState<string | null>(null);
  const { toast } = useToast();

  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

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
      setMessages((data || []) as DreamMessage[]);
    } catch (error: any) {
      toast({
        title: 'Error loading dream messages',
        description: error.message,
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
    if (!channelRef.current || !currentUserId || !partnerId || !dreamRoomId) return;

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

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => setTyping(false), 3000);
    }
  }, [currentUserId, partnerId, dreamRoomId]);

  const sendMessage = useCallback(async (content: string, messageType: string = 'text', metadata?: Record<string, any>) => {
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
      const insertData: any = {
        dream_room_id: dreamRoomId,
        sender_id: currentUserId,
        partner_id: partnerId,
        content: content.trim(),
        message_type: messageType,
      };

      if (metadata && Object.keys(metadata).length > 0) {
        insertData.metadata = metadata;
      }

      const { data, error } = await supabase
        .from('dream_messages')
        .insert([insertData])
        .select('*')
        .single();

      if (error) throw error;

      if (data) {
        // Replace temp message with real one
        setMessages(prev => prev.map(msg => (msg.id === tempId ? (data as DreamMessage) : msg)));
      }

      setTyping(false);
      return true;
    } catch (error: any) {
      // Remove temp message on failure
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      toast({
        title: 'Error sending dream message',
        description: error.message,
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
      .on('broadcast', { event: 'typing' }, (payload: any) => {
        const data = payload.payload;

        if (
          data?.dream_room_id !== dreamRoomId ||
          data?.user_id !== partnerId
        ) {
          return;
        }

        if (data.typing) {
          setTypingUsers([{ user_id: partnerId, display_name: 'Partner' }]);
          // Auto-clear after 4s
          setTimeout(() => setTypingUsers([]), 4000);
        } else {
          setTypingUsers([]);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
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
