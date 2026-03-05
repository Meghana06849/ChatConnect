import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DreamMessage {
  id: string;
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

/**
 * Dedicated Dream Room chat hook.
 * Uses the separate `dream_messages` table — completely isolated from General Mode.
 * Only works between the authenticated user and their linked lovers_partner_id.
 */
export const useDreamChat = (partnerId: string | null) => {
  const [messages, setMessages] = useState<DreamMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const currentUserIdRef = useRef<string>();
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Load current user
  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) currentUserIdRef.current = user.id;
    };
    loadUser();
  }, []);

  // Build a deterministic pair key for the realtime channel
  const pairKey = useCallback(() => {
    if (!currentUserIdRef.current || !partnerId) return null;
    const ids = [currentUserIdRef.current, partnerId].sort();
    return `dream-chat:${ids[0]}:${ids[1]}`;
  }, [partnerId]);

  // Load messages between the two partners
  const loadMessages = useCallback(async () => {
    if (!partnerId || !currentUserIdRef.current) return;
    setLoading(true);
    try {
      // Fetch messages where the pair matches (either direction)
      const uid = currentUserIdRef.current;
      const { data, error } = await supabase
        .from('dream_messages')
        .select('*')
        .or(
          `and(sender_id.eq.${uid},partner_id.eq.${partnerId}),and(sender_id.eq.${partnerId},partner_id.eq.${uid})`
        )
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      setMessages((data || []) as DreamMessage[]);
    } catch (error: any) {
      toast({ title: 'Error loading dream messages', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [partnerId, toast]);

  // Send a message
  const sendMessage = useCallback(async (content: string, messageType: string = 'text', metadata?: Record<string, any>) => {
    if (!partnerId || !currentUserIdRef.current || !content.trim()) return;

    try {
      const insertData: any = {
        sender_id: currentUserIdRef.current,
        partner_id: partnerId,
        content: content.trim(),
        message_type: messageType,
      };
      if (metadata && Object.keys(metadata).length > 0) {
        insertData.metadata = metadata;
      }

      const { error } = await supabase.from('dream_messages').insert([insertData]);
      if (error) throw error;

      // Stop typing
      setTypingLocal(false);
    } catch (error: any) {
      toast({ title: 'Error sending dream message', description: error.message, variant: 'destructive' });
    }
  }, [partnerId, toast]);

  // Mark messages as read
  const markAsRead = useCallback(async () => {
    if (!partnerId || !currentUserIdRef.current) return;
    try {
      await supabase
        .from('dream_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('sender_id', partnerId)
        .eq('partner_id', currentUserIdRef.current)
        .is('read_at', null);
    } catch (e) {
      console.error('Error marking dream messages as read:', e);
    }
  }, [partnerId]);

  // Typing via Supabase Realtime broadcast (no DB table needed)
  const setTypingLocal = useCallback((isTyping: boolean) => {
    const key = pairKey();
    if (!key || !currentUserIdRef.current) return;

    const channel = supabase.channel(key);
    if (isTyping) {
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { user_id: currentUserIdRef.current, typing: true },
      });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setTypingLocal(false), 3000);
    } else {
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { user_id: currentUserIdRef.current, typing: false },
      });
    }
  }, [pairKey]);

  // Real-time subscription
  useEffect(() => {
    if (!partnerId) return;

    // Wait for user to be loaded
    const setup = async () => {
      if (!currentUserIdRef.current) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) currentUserIdRef.current = user.id;
      }
      if (!currentUserIdRef.current) return;

      await loadMessages();
      markAsRead();

      const uid = currentUserIdRef.current;
      const key = pairKey();
      if (!key) return;

      const channel = supabase
        .channel(key)
        // Listen for new dream messages involving this pair
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'dream_messages',
        }, (payload) => {
          const msg = payload.new as DreamMessage;
          // Only accept messages for this pair
          const isPair =
            (msg.sender_id === uid && msg.partner_id === partnerId) ||
            (msg.sender_id === partnerId && msg.partner_id === uid);
          if (isPair) {
            setMessages(prev => [...prev, msg]);
            // Auto mark as read if from partner
            if (msg.sender_id === partnerId) {
              supabase.from('dream_messages').update({ read_at: new Date().toISOString() }).eq('id', msg.id).then();
            }
          }
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'dream_messages',
        }, (payload) => {
          const msg = payload.new as DreamMessage;
          setMessages(prev => prev.map(m => m.id === msg.id ? msg : m));
        })
        // Typing broadcast
        .on('broadcast', { event: 'typing' }, (payload: any) => {
          const data = payload.payload;
          if (data.user_id === uid) return; // ignore own typing
          if (data.typing) {
            setTypingUsers([{ user_id: data.user_id, display_name: 'Partner' }]);
          } else {
            setTypingUsers([]);
          }
        })
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    };

    const cleanupPromise = setup();

    return () => {
      cleanupPromise.then(cleanup => cleanup?.());
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [partnerId, loadMessages, markAsRead, pairKey]);

  return {
    messages,
    typingUsers,
    loading,
    sendMessage,
    setTyping: setTypingLocal,
    markAsRead,
  };
};
