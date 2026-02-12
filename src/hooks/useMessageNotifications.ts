import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface MessagePayload {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  created_at: string;
}

export const useMessageNotifications = (currentUserId: string | null) => {
  const notifiedMessages = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!currentUserId) return;

    // Subscribe to new messages across all conversations
    const channel = supabase
      .channel('message-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          const message = payload.new as MessagePayload;
          
          // Don't notify for own messages
          if (message.sender_id === currentUserId) return;
          
          // Don't notify if already notified
          if (notifiedMessages.current.has(message.id)) return;
          notifiedMessages.current.add(message.id);

          // Check if user is a participant in this conversation
          const { data: participant } = await supabase
            .from('conversation_participants')
            .select('id')
            .eq('conversation_id', message.conversation_id)
            .eq('user_id', currentUserId)
            .single();

          if (!participant) return;

          // Check if this chat is muted
          const { data: chatSetting } = await supabase
            .from('chat_settings')
            .select('is_muted')
            .eq('conversation_id', message.conversation_id)
            .eq('user_id', currentUserId)
            .maybeSingle();

          if (chatSetting?.is_muted) return; // Skip notification for muted chats

          // Get sender info
          const { data: sender } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('user_id', message.sender_id)
            .single();

          const senderName = sender?.display_name || 'Someone';
          const messagePreview = message.message_type === 'text' 
            ? message.content.substring(0, 50) + (message.content.length > 50 ? '...' : '')
            : message.message_type === 'voice' ? '🎤 Voice message' : '📎 Attachment';

          // Show in-app toast notification
          toast({
            title: `New message from ${senderName}`,
            description: messagePreview,
          });

          // Send push notification if app is in background
          if (document.hidden) {
            sendPushNotification(currentUserId, senderName, messagePreview, message.conversation_id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);
};

async function sendPushNotification(
  userId: string, 
  senderName: string, 
  messagePreview: string,
  conversationId: string
) {
  try {
    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        userId,
        title: `New message from ${senderName}`,
        body: messagePreview,
        tag: `message-${conversationId}`,
        data: {
          url: `/dashboard?section=chats&conversation=${conversationId}`
        }
      }
    });
    
    if (error) {
      console.error('Failed to send push notification:', error);
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}
