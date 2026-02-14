import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useChatActions = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Clear all messages in a conversation
  const clearChat = useCallback(async (conversationId: string): Promise<boolean> => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Delete all messages in the conversation sent by current user
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('sender_id', user.id);

      if (error) throw error;

      toast({
        title: 'Chat cleared',
        description: 'Your messages have been deleted'
      });
      return true;
    } catch (error: any) {
      toast({
        title: 'Failed to clear chat',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Remove a friend (delete contact relationship)
  const removeFriend = useCallback(async (contactUserId: string): Promise<boolean> => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Delete the contact relationship
      const { error } = await supabase
        .from('contacts')
        .delete()
        .or(`and(user_id.eq.${user.id},contact_user_id.eq.${contactUserId}),and(user_id.eq.${contactUserId},contact_user_id.eq.${user.id})`);

      if (error) throw error;

      toast({
        title: 'Friend removed',
        description: 'Contact has been removed from your friends list'
      });
      return true;
    } catch (error: any) {
      toast({
        title: 'Failed to remove friend',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Delete a specific message for everyone (hard delete, sender only)
  const deleteMessage = useCallback(async (messageId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      toast({
        title: 'Message deleted for everyone'
      });
      return true;
    } catch (error: any) {
      toast({
        title: 'Failed to delete message',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  }, [toast]);

  // Delete a message for the current user only (soft delete)
  const deleteForMe = useCallback(async (messageId: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get current deleted_for array
      const { data: msg, error: fetchError } = await supabase
        .from('messages')
        .select('deleted_for')
        .eq('id', messageId)
        .single();

      if (fetchError) throw fetchError;

      const currentDeletedFor = Array.isArray(msg?.deleted_for) ? msg.deleted_for : [];
      if (!currentDeletedFor.includes(user.id)) {
        currentDeletedFor.push(user.id);
      }

      const { error } = await supabase
        .from('messages')
        .update({ deleted_for: currentDeletedFor } as any)
        .eq('id', messageId);

      if (error) throw error;

      toast({ title: 'Message deleted for you' });
      return true;
    } catch (error: any) {
      toast({
        title: 'Failed to delete message',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  }, [toast]);

  // Upload media file to storage
  const uploadMedia = useCallback(async (
    file: File, 
    conversationId: string
  ): Promise<{ url: string; type: string } | null> => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Determine file type
      let messageType = 'document';
      if (file.type.startsWith('image/')) messageType = 'image';
      else if (file.type.startsWith('video/')) messageType = 'video';
      else if (file.type.startsWith('audio/')) messageType = 'voice';

      // Generate unique filename
      const ext = file.name.split('.').pop();
      const filename = `${user.id}/${conversationId}/${Date.now()}.${ext}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filename, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filename);

      return { url: publicUrl, type: messageType };
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Send media message
  const sendMediaMessage = useCallback(async (
    conversationId: string,
    file: File
  ): Promise<boolean> => {
    const result = await uploadMedia(file, conversationId);
    if (!result) return false;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: result.url,
          message_type: result.type,
          metadata: { 
            filename: file.name, 
            size: file.size,
            mimeType: file.type 
          }
        });

      if (error) throw error;

      toast({
        title: 'Media sent',
        description: `${file.name} uploaded successfully`
      });
      return true;
    } catch (error: any) {
      toast({
        title: 'Failed to send media',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  }, [uploadMedia, toast]);

  // Upload and set chat wallpaper
  const uploadWallpaper = useCallback(async (
    file: File,
    conversationId: string
  ): Promise<string | null> => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Only image files are allowed for wallpapers');
      }

      // Limit file size to 5MB
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB');
      }

      const ext = file.name.split('.').pop();
      const filename = `${user.id}/${conversationId}/wallpaper.${ext}`;

      // Upload to wallpapers bucket
      const { error: uploadError } = await supabase.storage
        .from('wallpapers')
        .upload(filename, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('wallpapers')
        .getPublicUrl(filename);

      // Update chat settings with wallpaper URL
      const { error: updateError } = await supabase
        .from('chat_settings')
        .upsert({
          user_id: user.id,
          conversation_id: conversationId,
          wallpaper_url: publicUrl
        }, {
          onConflict: 'user_id,conversation_id'
        });

      if (updateError) throw updateError;

      toast({
        title: 'Wallpaper updated',
        description: 'Chat background changed successfully'
      });
      return publicUrl;
    } catch (error: any) {
      toast({
        title: 'Failed to upload wallpaper',
        description: error.message,
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Forward message to another conversation
  const forwardMessage = useCallback(async (
    messageId: string,
    targetConversationId: string
  ): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get original message
      const { data: originalMessage, error: fetchError } = await supabase
        .from('messages')
        .select('content, message_type, metadata')
        .eq('id', messageId)
        .single();

      if (fetchError) throw fetchError;

      // Create forwarded message
      const existingMetadata = typeof originalMessage.metadata === 'object' && originalMessage.metadata !== null 
        ? originalMessage.metadata as Record<string, unknown>
        : {};
      
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: targetConversationId,
          sender_id: user.id,
          content: originalMessage.content,
          message_type: originalMessage.message_type,
          metadata: {
            ...existingMetadata,
            forwarded: true,
            originalMessageId: messageId
          }
        });

      if (error) throw error;

      toast({
        title: 'Message forwarded'
      });
      return true;
    } catch (error: any) {
      toast({
        title: 'Failed to forward message',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  }, [toast]);

  return {
    loading,
    clearChat,
    removeFriend,
    deleteMessage,
    deleteForMe,
    uploadMedia,
    sendMediaMessage,
    uploadWallpaper,
    forwardMessage
  };
};