import { useEffect, useState } from 'react';
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
    };
  }>;
}

export const useRealTimeChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load conversations
  const loadConversations = async () => {
    try {
      const { data: conversationsData, error } = await supabase
        .from('conversations')
        .select(`
          *,
          conversation_participants!inner (
            user_id,
            profiles!conversation_participants_user_id_fkey (
              display_name,
              avatar_url,
              is_online
            )
          )
        `);

      if (error) throw error;
      
      // Type-safe conversation mapping
      const typedConversations = (conversationsData || []).map(conv => ({
        ...conv,
        conversation_participants: (conv.conversation_participants as any[])?.map((p: any) => ({
          user_id: p.user_id,
          profiles: {
            display_name: p.profiles?.display_name || 'Unknown',
            avatar_url: p.profiles?.avatar_url,
            is_online: p.profiles?.is_online || false
          }
        })) || []
      })) as Conversation[];
      
      setConversations(typedConversations);
    } catch (error: any) {
      toast({
        title: "Error loading conversations",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Load messages for a conversation
  const loadMessages = async (conversationId: string) => {
    try {
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return messagesData || [];
    } catch (error: any) {
      toast({
        title: "Error loading messages",
        description: error.message,
        variant: "destructive",
      });
      return [];
    }
  };

  // Send a message
  const sendMessage = async (conversationId: string, content: string, messageType: string = 'text', isDreamMessage: boolean = false) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const messageData: any = {
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
    } catch (error: any) {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  // Create a new conversation
  const createConversation = async (participantUserIds: string[], isLoversConversation: boolean = false) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert([{
          type: 'direct',
          created_by: user.id,
          is_lovers_conversation: isLoversConversation
        }])
        .select()
        .single();

      if (convError) throw convError;

      // Add participants
      const participants = [user.id, ...participantUserIds].map(userId => ({
        conversation_id: conversation.id,
        user_id: userId
      }));

      const { error: participantsError } = await supabase
        .from('conversation_participants')
        .insert(participants);

      if (participantsError) throw participantsError;

      return conversation;
    } catch (error: any) {
      toast({
        title: "Error creating conversation",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  // Set up real-time subscriptions
  useEffect(() => {
    loadConversations();

    // Subscribe to new messages
    const messageSubscription = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      }, (payload) => {
        const newMessage = payload.new as Message;
        setMessages(prev => [...prev, newMessage]);
      })
      .subscribe();

    // Subscribe to conversation changes
    const conversationSubscription = supabase
      .channel('conversations')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations'
      }, () => {
        loadConversations();
      })
      .subscribe();

    setLoading(false);

    return () => {
      supabase.removeChannel(messageSubscription);
      supabase.removeChannel(conversationSubscription);
    };
  }, []);

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