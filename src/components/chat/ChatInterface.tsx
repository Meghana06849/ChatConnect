import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { supabase } from '@/integrations/supabase/client';
import { useEnhancedRealTimeChat } from '@/hooks/useEnhancedRealTimeChat';
import { useCall } from '@/components/features/CallProvider';
import { useChatSettings } from '@/hooks/useChatSettings';
import { useScreenshotDetection } from '@/hooks/useScreenshotDetection';
import { TypingIndicator } from './TypingIndicator';
import { EmojiReactionPicker } from './EmojiReactionPicker';
import { VoiceMessageRecorder } from './VoiceMessageRecorder';
import { EmojiKeyboard } from './EmojiKeyboard';
import { MediaAttachmentPicker } from './MediaAttachmentPicker';
import { MessageBubble } from './MessageBubble';
import { ChatHeader } from './ChatHeader';
import { ReplyPreview } from './ReplyPreview';
import { ChatSettingsDialog } from './ChatSettingsDialog';
import { DisappearingMessageIndicator } from './DisappearingMessageIndicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
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

  // Chat settings hook
  const { 
    settings: chatSettings, 
    toggleMute, 
    setDisappearingMode, 
    setWallpaper 
  } = useChatSettings(conversationId || null);

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

    // Load older messages when near top
    if (container.scrollTop < 100 && !loadingMore && hasMore) {
      loadOlderMessages();
    }

    // Show scroll button when not at bottom
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    setShowScrollButton(!isNearBottom);
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;

    const metadata: any = {};
    if (replyTo) {
      metadata.replyTo = replyTo;
    }

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

  const handleMediaSelect = (type: string, file: File) => {
    toast({
      title: `${type} selected`,
      description: `${file.name} will be uploaded`,
    });
    // TODO: Implement file upload to Supabase Storage
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
        onBlock={() => toast({ title: 'Block', description: 'Opening block dialog...' })}
        onClearChat={() => toast({ title: 'Clear chat', description: 'Coming soon!' })}
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
        onWallpaperChange={() => toast({ title: 'Wallpaper', description: 'Upload feature coming soon!' })}
        onBlock={() => toast({ title: 'Block', description: 'Coming soon!' })}
        onRemoveFriend={() => toast({ title: 'Remove Friend', description: 'Coming soon!' })}
        onClearChat={() => toast({ title: 'Clear Chat', description: 'Coming soon!' })}
      />

      {/* Messages Area */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto relative"
      >
        <div className="p-4 space-y-3 min-h-full flex flex-col">
          {/* Load more indicator */}
          {loadingMore && (
            <div className="flex justify-center py-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          )}

          {/* Beginning of chat */}
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

          {/* Loading state */}
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
                  onForward={() => toast({ title: 'Forward', description: 'Coming soon!' })}
                  onReaction={(emoji) => addReaction(msg.id, emoji)}
                  onStar={() => toast({ title: 'Starred', description: 'Message starred' })}
                  onDelete={() => toast({ title: 'Delete', description: 'Coming soon!' })}
                  onInfo={() => toast({ title: 'Info', description: 'Coming soon!' })}
                />
              ))}
            </>
          )}

          {/* Typing Indicator */}
          {isPartnerTyping && <TypingIndicator typingUsers={typingUsers} />}
          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to bottom button */}
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
              const audioUrl = URL.createObjectURL(audioBlob);
              await sendMessage('🎤 Voice message', 'voice');
              setIsRecordingVoice(false);
              scrollToBottom();
            }}
            onCancel={() => setIsRecordingVoice(false)}
          />
        ) : (
          <div className="flex items-center gap-2">
            {/* Attachment Picker */}
            <MediaAttachmentPicker
              onImageSelect={(file) => handleMediaSelect('Image', file)}
              onVideoSelect={(file) => handleMediaSelect('Video', file)}
              onDocumentSelect={(file) => handleMediaSelect('Document', file)}
              onCameraCapture={() => toast({ title: 'Camera', description: 'Coming soon!' })}
              onLocationShare={() => toast({ title: 'Location', description: 'Coming soon!' })}
              onContactShare={() => toast({ title: 'Contact', description: 'Coming soon!' })}
              isLoversMode={isLoversMode}
            />

            {/* Chat Settings Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettingsDialog(true)}
              className="rounded-full w-8 h-8 shrink-0 hover:bg-white/10"
            >
              <Settings className="w-4 h-4 text-muted-foreground" />
            </Button>

            {/* Message Input */}
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

            {/* Send / Voice Button */}
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
