import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { supabase } from '@/integrations/supabase/client';
import { useEnhancedRealTimeChat } from '@/hooks/useEnhancedRealTimeChat';
import { useCall } from '@/components/features/CallProvider';
import { useChatSettings } from '@/hooks/useChatSettings';
import { useChatActions } from '@/hooks/useChatActions';
import { useBlockedUsers } from '@/hooks/useBlockedUsers';
import { useScreenshotDetection } from '@/hooks/useScreenshotDetection';
import { TypingIndicator } from './TypingIndicator';
import { VoiceMessageRecorder } from './VoiceMessageRecorder';
import { EmojiKeyboard } from './EmojiKeyboard';
import { MediaAttachmentPicker } from './MediaAttachmentPicker';
import { MessageBubble } from './MessageBubble';
import { ChatHeader } from './ChatHeader';
import { ReplyPreview } from './ReplyPreview';
import { ChatSettingsDialog } from './ChatSettingsDialog';
import { DisappearingMessageIndicator } from './DisappearingMessageIndicator';
import { ChatWallpaperUpload } from './ChatWallpaperUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Send, Mic, Heart, Loader2, ChevronDown, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ChatInterfaceProps {
  selectedContact?: {
    id: string;
    name: string;
    avatar?: string;
    isOnline: boolean;
    lastSeen?: string | null;
    isVerified?: boolean;
    verificationType?: string;
  };
  conversationId?: string;
  onBack?: () => void;
}

interface ReplyInfo {
  id: string;
  content: string;
  senderName: string;
  messageType?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  selectedContact, 
  conversationId,
  onBack 
}) => {
  const { mode } = useChat();
  const { startCall } = useCall();
  const { toast } = useToast();
  const [messageInput, setMessageInput] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyInfo | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showWallpaperDialog, setShowWallpaperDialog] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showRemoveFriendConfirm, setShowRemoveFriendConfirm] = useState(false);
  const [showClearChatConfirm, setShowClearChatConfirm] = useState(false);

  // Chat settings hook
  const { 
    settings: chatSettings, 
    toggleMute, 
    setDisappearingMode,
    setWallpaper,
    reload: refreshSettings
  } = useChatSettings(conversationId || null);

  // Chat actions hook
  const {
    clearChat,
    removeFriend,
    deleteMessage,
    sendMediaMessage,
    forwardMessage,
    loading: actionLoading
  } = useChatActions();

  // Blocked users hook
  const { blockUser } = useBlockedUsers();

  // Screenshot detection hook
  useScreenshotDetection(conversationId || null, true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isLoversMode = mode === 'lovers';

  const {
    messages,
    typingUsers,
    loading,
    loadingMore,
    hasMore,
    sendMessage,
    addReaction,
    setTyping,
    loadOlderMessages,
  } = useEnhancedRealTimeChat(conversationId || null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });
  }, []);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: smooth ? 'smooth' : 'auto' 
    });
  };

  useEffect(() => {
    scrollToBottom(false);
  }, [conversationId]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
      if (isNearBottom) {
        scrollToBottom();
      }
    }
  }, [messages]);

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    if (container.scrollTop < 100 && !loadingMore && hasMore) {
      loadOlderMessages();
    }

    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    setShowScrollButton(!isNearBottom);
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;

    await sendMessage(messageInput, 'text');
    setMessageInput('');
    setReplyTo(null);
    setTyping(false);
    scrollToBottom();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    if (e.target.value.trim()) {
      setTyping(true);
    }
  };

  const handleReply = (msg: any) => {
    setReplyTo({
      id: msg.id,
      content: msg.content,
      senderName: msg.sender_id === currentUserId ? 'You' : selectedContact?.name || 'Unknown',
      messageType: msg.message_type,
    });
  };

  const handleCall = async (isVideo: boolean) => {
    if (!selectedContact) return;
    try {
      await startCall(selectedContact.id, selectedContact.name, isVideo);
    } catch (error) {
      toast({
        title: "Call failed",
        description: "Could not initiate call",
        variant: "destructive",
      });
    }
  };

  const handleMediaSelect = async (type: string, file: File) => {
    if (!conversationId) return;
    
    const success = await sendMediaMessage(conversationId, file);
    if (success) {
      scrollToBottom();
    }
  };

  const handleBlock = async () => {
    if (!selectedContact) return;
    const success = await blockUser(selectedContact.id);
    if (success) {
      setShowBlockConfirm(false);
      setShowSettingsDialog(false);
      onBack?.();
    }
  };

  const handleRemoveFriend = async () => {
    if (!selectedContact) return;
    const success = await removeFriend(selectedContact.id);
    if (success) {
      setShowRemoveFriendConfirm(false);
      setShowSettingsDialog(false);
      onBack?.();
    }
  };

  const handleClearChat = async () => {
    if (!conversationId) return;
    const success = await clearChat(conversationId);
    if (success) {
      setShowClearChatConfirm(false);
      setShowSettingsDialog(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    await deleteMessage(messageId);
  };

  const handleWallpaperUpload = async (url: string) => {
    if (url) {
      await setWallpaper(url);
      setShowWallpaperDialog(false);
      refreshSettings();
    }
  };

  const isPartnerTyping = typingUsers.length > 0;

  if (!selectedContact) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4 px-4">
          <div className={cn(
            "w-24 h-24 rounded-full flex items-center justify-center mx-auto",
            isLoversMode
              ? "bg-gradient-to-br from-lovers-primary/20 to-lovers-secondary/20"
              : "bg-gradient-to-br from-general-primary/20 to-general-secondary/20"
          )}>
            {isLoversMode ? (
              <Heart className="w-12 h-12 text-lovers-primary animate-heart-beat" />
            ) : (
              <Send className="w-12 h-12 text-general-primary" />
            )}
          </div>
          <h3 className="text-xl font-semibold">
            {isLoversMode ? 'Select someone special' : 'Start a conversation'}
          </h3>
          <p className="text-muted-foreground max-w-sm">
            {isLoversMode
              ? 'Choose a contact to share your heart with'
              : 'Pick a contact from your list to start chatting'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="flex-1 flex flex-col h-full overflow-hidden"
      style={chatSettings?.wallpaper_url ? { 
        backgroundImage: `url(${chatSettings.wallpaper_url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      } : undefined}
    >
      {/* Chat Header */}
      <ChatHeader
        contact={selectedContact}
        isTyping={isPartnerTyping}
        isMuted={chatSettings?.is_muted}
        isLoversMode={isLoversMode}
        onCall={() => handleCall(false)}
        onVideoCall={() => handleCall(true)}
        onMuteToggle={toggleMute}
        onBlock={() => setShowBlockConfirm(true)}
        onClearChat={() => setShowClearChatConfirm(true)}
        onBack={onBack}
      />

      {/* Disappearing Message Indicator */}
      {chatSettings?.disappearing_mode && chatSettings.disappearing_mode !== 'off' && (
        <div className="px-4 py-1 flex justify-center">
          <DisappearingMessageIndicator 
            mode={chatSettings.disappearing_mode} 
            isLoversMode={isLoversMode}
          />
        </div>
      )}

      {/* Chat Settings Dialog */}
      <ChatSettingsDialog
        open={showSettingsDialog}
        onOpenChange={setShowSettingsDialog}
        settings={chatSettings}
        contactName={selectedContact.name}
        isLoversMode={isLoversMode}
        onMuteToggle={toggleMute}
        onDisappearingModeChange={setDisappearingMode}
        onWallpaperChange={() => setShowWallpaperDialog(true)}
        onBlock={() => setShowBlockConfirm(true)}
        onRemoveFriend={() => setShowRemoveFriendConfirm(true)}
        onClearChat={() => setShowClearChatConfirm(true)}
      />

      <Dialog open={showWallpaperDialog} onOpenChange={setShowWallpaperDialog}>
        <DialogContent className="glass border-white/20">
          <DialogHeader>
            <DialogTitle>Change Chat Wallpaper</DialogTitle>
          </DialogHeader>
          <ChatWallpaperUpload 
            onUploadComplete={handleWallpaperUpload}
            currentWallpaper={chatSettings?.wallpaper_url}
          />
        </DialogContent>
      </Dialog>

      {/* Block Confirmation */}
      <AlertDialog open={showBlockConfirm} onOpenChange={setShowBlockConfirm}>
        <AlertDialogContent className="glass border-white/20">
          <AlertDialogHeader>
            <AlertDialogTitle>Block {selectedContact.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They won't be able to message or call you. You can unblock them later in Settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBlock} className="bg-destructive text-destructive-foreground">
              Block
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Friend Confirmation */}
      <AlertDialog open={showRemoveFriendConfirm} onOpenChange={setShowRemoveFriendConfirm}>
        <AlertDialogContent className="glass border-white/20">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {selectedContact.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They will be removed from your friends list. You can add them back later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveFriend} className="bg-destructive text-destructive-foreground">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear Chat Confirmation */}
      <AlertDialog open={showClearChatConfirm} onOpenChange={setShowClearChatConfirm}>
        <AlertDialogContent className="glass border-white/20">
          <AlertDialogHeader>
            <AlertDialogTitle>Clear chat history?</AlertDialogTitle>
            <AlertDialogDescription>
              Your messages in this chat will be deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearChat} className="bg-destructive text-destructive-foreground">
              Clear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Messages Area */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto relative"
      >
        <div className="p-4 space-y-3 min-h-full flex flex-col">
          {loadingMore && (
            <div className="flex justify-center py-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          )}

          {!hasMore && messages.length > 0 && (
            <div className="text-center py-4">
              <div className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs",
                "bg-white/10 text-muted-foreground"
              )}>
                🔒 Messages are end-to-end encrypted
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-2">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">Loading messages...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center mx-auto",
                  isLoversMode
                    ? "bg-gradient-to-br from-lovers-primary/20 to-lovers-secondary/20"
                    : "bg-gradient-to-br from-general-primary/20 to-general-secondary/20"
                )}>
                  {isLoversMode ? (
                    <Heart className="w-8 h-8 text-lovers-primary animate-heart-beat" />
                  ) : (
                    <Send className="w-8 h-8 text-general-primary" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold mb-1">
                    {isLoversMode ? 'Share your heart' : 'No messages yet'}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {isLoversMode
                      ? 'Send a love message to start your conversation 💕'
                      : 'Send a message to start chatting!'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  id={msg.id}
                  content={msg.content}
                  senderId={msg.sender_id}
                  currentUserId={currentUserId}
                  messageType={msg.message_type}
                  createdAt={msg.created_at}
                  readAt={msg.read_at}
                  reactions={Array.isArray(msg.reactions) ? msg.reactions : []}
                  metadata={msg.metadata}
                  replyTo={msg.metadata?.replyTo}
                  isLoversMode={isLoversMode}
                  onReply={() => handleReply(msg)}
                  onForward={() => toast({ title: 'Forward', description: 'Select a chat to forward this message' })}
                  onReaction={(emoji) => addReaction(msg.id, emoji)}
                  onStar={() => toast({ title: 'Starred', description: 'Message starred' })}
                  onDelete={() => handleDeleteMessage(msg.id)}
                  onInfo={() => toast({ 
                    title: 'Message Info',
                    description: `Sent: ${new Date(msg.created_at).toLocaleString()}${msg.read_at ? `\nRead: ${new Date(msg.read_at).toLocaleString()}` : ''}`
                  })}
                />
              ))}
            </>
          )}

          {isPartnerTyping && <TypingIndicator typingUsers={typingUsers} />}
          <div ref={messagesEndRef} />
        </div>

        {showScrollButton && (
          <Button
            size="icon"
            onClick={() => scrollToBottom()}
            className={cn(
              "absolute bottom-4 right-4 rounded-full shadow-lg w-10 h-10",
              isLoversMode ? "bg-lovers-primary" : "bg-general-primary"
            )}
          >
            <ChevronDown className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Reply Preview */}
      {replyTo && (
        <ReplyPreview
          replyTo={replyTo}
          onCancel={() => setReplyTo(null)}
          isLoversMode={isLoversMode}
        />
      )}

      {/* Message Input */}
      <div className="p-3 border-t border-white/20 glass">
        {isRecordingVoice ? (
          <VoiceMessageRecorder
            isLoversMode={isLoversMode}
            onSend={async (audioBlob, duration) => {
              if (conversationId) {
                const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
                await sendMediaMessage(conversationId, audioFile);
              }
              setIsRecordingVoice(false);
              scrollToBottom();
            }}
            onCancel={() => setIsRecordingVoice(false)}
          />
        ) : (
          <div className="flex items-center gap-2">
            <MediaAttachmentPicker
              onImageSelect={(file) => handleMediaSelect('Image', file)}
              onVideoSelect={(file) => handleMediaSelect('Video', file)}
              onDocumentSelect={(file) => handleMediaSelect('Document', file)}
              onCameraCapture={() => toast({ title: 'Camera', description: 'Camera access requires device permissions' })}
              onLocationShare={() => {
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    async (position) => {
                      const locationUrl = `https://maps.google.com/?q=${position.coords.latitude},${position.coords.longitude}`;
                      await sendMessage(locationUrl, 'location');
                      scrollToBottom();
                    },
                    () => toast({ title: 'Location', description: 'Location access denied', variant: 'destructive' })
                  );
                } else {
                  toast({ title: 'Location', description: 'Geolocation not supported', variant: 'destructive' });
                }
              }}
              onContactShare={() => {
                // Share current user's contact info as a message
                if (conversationId && currentUserId) {
                  supabase.from('profiles').select('display_name, username, avatar_url').eq('user_id', currentUserId).single().then(({ data }) => {
                    if (data) {
                      const contactCard = `📇 Contact: ${data.display_name || 'Unknown'}\n@${data.username || 'N/A'}`;
                      sendMessage(contactCard, 'text');
                      scrollToBottom();
                    }
                  });
                }
              }}
              isLoversMode={isLoversMode}
            />

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettingsDialog(true)}
              className="rounded-full w-8 h-8 shrink-0 hover:bg-white/10"
            >
              <Settings className="w-4 h-4 text-muted-foreground" />
            </Button>

            <div className="flex-1 relative">
              <Input
                value={messageInput}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                onBlur={() => !messageInput.trim() && setTyping(false)}
                placeholder={isLoversMode ? "Send love..." : "Type a message..."}
                className="pr-10 py-2.5 rounded-full glass border-white/20 text-sm"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <EmojiKeyboard
                  onEmojiSelect={(emoji) => setMessageInput(prev => prev + emoji)}
                  isLoversMode={isLoversMode}
                />
              </div>
            </div>

            {messageInput.trim() ? (
              <Button
                onClick={handleSendMessage}
                size="icon"
                className={cn(
                  "rounded-full w-10 h-10 shrink-0",
                  isLoversMode ? "btn-lovers" : "btn-general"
                )}
              >
                <Send className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsRecordingVoice(true)}
                className={cn(
                  "rounded-full w-10 h-10 shrink-0 hover:bg-white/10",
                  isLoversMode ? "text-lovers-primary" : "text-general-primary"
                )}
              >
                <Mic className="w-5 h-5" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};