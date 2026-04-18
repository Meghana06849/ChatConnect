import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  conversation_id: string;
  message_type: string;
  created_at: string;
  is_dream_message?: boolean;
  dream_reveal_at?: string;
}

interface Conversation {
  id: string;
  type: string;
  name?: string;
  is_lovers_conversation: boolean;
  conversation_participants: Array<{
    user_id: string;
    profiles: {
      display_name: string;
      avatar_url?: string;
      is_online: boolean;
      is_verified?: boolean;
      verification_type?: string;
      last_seen?: string | null;
    };
  }>;
}

interface ConversationParticipantRow {
  user_id: string;
  profiles: {
    display_name: string;
    avatar_url?: string;
    is_online: boolean;
    is_verified?: boolean;
    verification_type?: string;
    last_seen?: string | null;
  } | null;
}

interface ConversationRow {
  id: string;
  type: string;
  name?: string;
  is_lovers_conversation: boolean;
  conversation_participants?: ConversationParticipantRow[];
}

interface MessageInsert {
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  is_dream_message: boolean;
  dream_reveal_at?: string;
}

export const useRealTimeChat = (isLoversMode: boolean = false) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const isMountedRef = useRef(true);
  const conversationIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      conversationIdsRef.current.clear();
    };
  }, []);

  // Load conversations filtered by mode
  const loadConversations = useCallback(async (showLoading: boolean = false) => {
    if (showLoading && isMountedRef.current) {
      setLoading(true);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (isMountedRef.current) {
          setConversations([]);
          conversationIdsRef.current = new Set();
        }
        return;
      }

      const { data: participantRows, error: participantsError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (participantsError) throw participantsError;

      const conversationIds = (participantRows || []).map((row) => row.conversation_id);
      if (conversationIds.length === 0) {
        if (isMountedRef.current) {
          setConversations([]);
          conversationIdsRef.current = new Set();
        }
        return;
      }

      const { data: conversationsData, error } = await supabase
        .from('conversations')
        .select(`
          *,
          conversation_participants (
            user_id,
            profiles!conversation_participants_user_id_profiles_fkey (
              display_name,
              avatar_url,
              is_online,
              is_verified,
              verification_type,
              last_seen
            )
          )
        `)
        .eq('is_lovers_conversation', isLoversMode)
        .in('id', conversationIds);

      if (error) throw error;
      
      // Type-safe conversation mapping
      const typedConversations = ((conversationsData || []) as ConversationRow[]).map((conv) => ({
        ...conv,
        conversation_participants: conv.conversation_participants?.map((p) => ({
          user_id: p.user_id,
          profiles: {
            display_name: p.profiles?.display_name || 'Unknown',
            avatar_url: p.profiles?.avatar_url,
            is_online: p.profiles?.is_online || false,
            is_verified: p.profiles?.is_verified || false,
            verification_type: p.profiles?.verification_type,
            last_seen: p.profiles?.last_seen
          }
        })) || []
      })) as Conversation[];

      if (!isMountedRef.current) return;

      setConversations(typedConversations);
      conversationIdsRef.current = new Set(typedConversations.map((conversation) => conversation.id));
    } catch (error) {
      toast({
        title: "Error loading conversations",
        description: error instanceof Error ? error.message : 'Failed to load conversations',
        variant: "destructive",
      });
    } finally {
      if (showLoading && isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [isLoversMode, toast]);

  // Load messages for a conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return messagesData || [];
    } catch (error) {
      toast({
        title: "Error loading messages",
        description: error instanceof Error ? error.message : 'Failed to load messages',
        variant: "destructive",
      });
      return [];
    }
  }, [toast]);

  // Send a message
  const sendMessage = useCallback(async (conversationId: string, content: string, messageType: string = 'text', isDreamMessage: boolean = false) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const messageData: MessageInsert = {
        conversation_id: conversationId,
        sender_id: user.id,
        content,
        message_type: messageType,
        is_dream_message: isDreamMessage
      };

      // If it's a dream message, set reveal time (24 hours from now)
      if (isDreamMessage) {
        const revealTime = new Date();
        revealTime.setHours(revealTime.getHours() + 24);
        messageData.dream_reveal_at = revealTime.toISOString();
      }

      const { data, error } = await supabase
        .from('messages')
        .insert([messageData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      toast({
        title: "Error sending message",
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  // Create a new conversation
  const createConversation = useCallback(async (participantUserIds: string[], isLoversConversation: boolean = false) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (participantUserIds.length === 1) {
        const partnerId = participantUserIds[0];

        const { data: myConversationRows, error: myConvError } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', user.id);

        if (myConvError) throw myConvError;

        const myConversationIds = (myConversationRows || []).map((row) => row.conversation_id);

        if (myConversationIds.length > 0) {
          const { data: partnerRows, error: partnerError } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', partnerId)
            .in('conversation_id', myConversationIds);

          if (partnerError) throw partnerError;

          const sharedConversationIds = (partnerRows || []).map((row) => row.conversation_id);

          if (sharedConversationIds.length > 0) {
            const { data: existingConversation, error: existingError } = await supabase
              .from('conversations')
              .select('id, type, created_by, is_lovers_conversation')
              .eq('type', 'direct')
              .eq('is_lovers_conversation', isLoversConversation)
              .in('id', sharedConversationIds)
              .order('updated_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (existingError && existingError.code !== 'PGRST116') throw existingError;

            if (existingConversation) {
              return existingConversation;
            }
          }
        }
      }

      // Generate UUID client-side to avoid needing .select() after insert
      const conversationId = crypto.randomUUID();

      // Create conversation without .select() to avoid RLS issues
      const { error: convError } = await supabase
        .from('conversations')
        .insert([{
          id: conversationId,
          type: 'direct',
          created_by: user.id,
          is_lovers_conversation: isLoversConversation
        }]);

      if (convError) throw convError;

      // Add participants (including self)
      const participants = [user.id, ...participantUserIds].map(userId => ({
        conversation_id: conversationId,
        user_id: userId
      }));

      const { error: participantsError } = await supabase
        .from('conversation_participants')
        .insert(participants);

      if (participantsError) throw participantsError;

      await loadConversations();

      // Return the conversation object with the generated ID
      return { 
        id: conversationId, 
        type: 'direct', 
        created_by: user.id, 
        is_lovers_conversation: isLoversConversation 
      };
    } catch (error) {
      toast({
        title: "Error creating conversation",
        description: error instanceof Error ? error.message : 'Failed to create conversation',
        variant: "destructive",
      });
      throw error;
    }
  }, [loadConversations, toast]);

  // Set up real-time subscriptions
  useEffect(() => {
    let isActive = true;
    setMessages([]);
    void loadConversations(true);

    // Subscribe to new messages
    const messageSubscription = supabase
      .channel(`legacy-messages-${isLoversMode ? 'lovers' : 'general'}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      }, (payload) => {
        if (!isActive) return;

        const newMessage = payload.new as Message;
        if (!conversationIdsRef.current.has(newMessage.conversation_id)) {
          return;
        }

        setMessages(prev => {
          if (prev.some((message) => message.id === newMessage.id)) {
            return prev;
          }

          return [...prev, newMessage];
        });
      })
      .subscribe();

    // Subscribe to conversation changes
    const conversationSubscription = supabase
      .channel(`legacy-conversations-${isLoversMode ? 'lovers' : 'general'}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations',
        filter: `is_lovers_conversation=eq.${isLoversMode}`,
      }, () => {
        if (!isActive) return;
        void loadConversations();
      })
      .subscribe();

    return () => {
      isActive = false;
      supabase.removeChannel(messageSubscription);
      supabase.removeChannel(conversationSubscription);
    };
  }, [isLoversMode, loadConversations]);

  return {
    messages,
    conversations,
    loading,
    loadMessages,
    sendMessage,
    createConversation,
    setMessages
  };
};