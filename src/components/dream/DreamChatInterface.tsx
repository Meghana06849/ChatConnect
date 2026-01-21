import React, { useState, useRef, useEffect } from 'react';
import { useEnhancedRealTimeChat } from '@/hooks/useEnhancedRealTimeChat';
import { useCall } from '@/components/features/CallProvider';
import { useChatSettings } from '@/hooks/useChatSettings';
import { supabase } from '@/integrations/supabase/client';
import { DreamBackground } from './DreamBackground';
import { DreamChatHeader } from './DreamChatHeader';
import { DreamChatBubble } from './DreamChatBubble';
import { DreamTypingIndicator } from './DreamTypingIndicator';
import { DreamMessageInput } from './DreamMessageInput';
import { VoiceMessageRecorder } from '@/components/chat/VoiceMessageRecorder';
import { ChatSettingsDialog } from '@/components/chat/ChatSettingsDialog';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronDown, Heart, Lock, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface DreamChatInterfaceProps {
  selectedContact?: {
    id: string;
    name: string;
    avatar?: string;
    isOnline: boolean;
    lastSeen?: string | null;
    isVerified?: boolean;
  };
  conversationId?: string;
  onBack?: () => void;
}

export const DreamChatInterface: React.FC<DreamChatInterfaceProps> = ({
  selectedContact,
  conversationId,
  onBack,
}) => {
  const { startCall } = useCall();
  const { toast } = useToast();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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

  const { settings: chatSettings, toggleMute, setDisappearingMode } = useChatSettings(conversationId || null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });
  }, []);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    scrollToBottom(false);
  }, [conversationId]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
      if (isNearBottom) scrollToBottom();
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

  const handleSendMessage = async (text: string) => {
    await sendMessage(text, 'text');
    scrollToBottom();
  };

  const handleCall = async (isVideo: boolean) => {
    if (!selectedContact) return;
    try {
      await startCall(selectedContact.id, selectedContact.name, isVideo);
    } catch (error) {
      toast({
        title: "Dream Call failed",
        description: "Could not reach your beloved",
        variant: "destructive",
      });
    }
  };

  const isPartnerTyping = typingUsers.length > 0;

  // Empty state - no contact selected
  if (!selectedContact) {
    return (
      <div className="flex-1 relative overflow-hidden">
        <DreamBackground showMoon density="light" />
        
        <div className="relative z-10 flex-1 flex items-center justify-center h-full">
          <div className="text-center space-y-6 px-6">
            {/* Glowing heart */}
            <div className="relative mx-auto w-28 h-28">
              <div 
                className="absolute inset-0 rounded-full blur-2xl opacity-40"
                style={{ background: 'linear-gradient(135deg, hsla(320, 100%, 60%, 0.5), hsla(270, 60%, 50%, 0.5))' }}
              />
              <div className="relative w-full h-full rounded-full bg-gradient-to-br from-lovers-primary/20 to-lovers-secondary/20 backdrop-blur-sm flex items-center justify-center border border-white/10">
                <Heart className="w-14 h-14 text-lovers-primary animate-heart-beat" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-light text-white tracking-wide">
                Choose Your Soulmate
              </h3>
              <p className="text-white/50 max-w-xs mx-auto text-sm">
                Select someone special to begin your dreamy conversation ✨
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-white/30 text-xs">
              <Lock className="w-3 h-3" />
              <span>End-to-end encrypted with love</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full relative overflow-hidden">
      {/* Dream background - always visible */}
      <DreamBackground showAurora showMoon density="medium" />

      {/* Content layer */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <DreamChatHeader
          contact={selectedContact}
          isTyping={isPartnerTyping}
          onBack={onBack}
          onCall={() => handleCall(false)}
          onVideoCall={() => handleCall(true)}
          onMore={() => setShowSettings(true)}
        />

        {/* Disappearing messages indicator */}
        {chatSettings?.disappearing_mode && chatSettings.disappearing_mode !== 'off' && (
          <div className="px-4 py-2 flex justify-center">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/50">
              <Sparkles className="w-3 h-3 text-lovers-primary" />
              Messages vanish after {chatSettings.disappearing_mode === '30s' ? '30 seconds' : '1 minute'}
            </div>
          </div>
        )}

        {/* Messages area */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto"
        >
          <div className="p-4 space-y-3 min-h-full flex flex-col">
            {/* Load more indicator */}
            {loadingMore && (
              <div className="flex justify-center py-3">
                <div className="flex items-center gap-2 text-white/40">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs">Loading memories...</span>
                </div>
              </div>
            )}

            {/* Beginning of chat */}
            {!hasMore && messages.length > 0 && (
              <div className="text-center py-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                  <Heart className="w-3 h-3 text-lovers-primary fill-lovers-primary" />
                  <span className="text-xs text-white/40">This is where your love story begins</span>
                  <Heart className="w-3 h-3 text-lovers-primary fill-lovers-primary" />
                </div>
              </div>
            )}

            {/* Loading state */}
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="relative w-16 h-16 mx-auto">
                    <Heart className="w-16 h-16 text-lovers-primary/30 absolute" />
                    <Heart className="w-16 h-16 text-lovers-primary animate-ping absolute" />
                  </div>
                  <p className="text-sm text-white/40">Loading your moments...</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-4 px-6">
                  <div className="relative w-20 h-20 mx-auto">
                    <div 
                      className="absolute inset-0 rounded-full blur-xl opacity-50"
                      style={{ background: 'linear-gradient(135deg, hsla(320, 100%, 60%, 0.4), hsla(270, 60%, 50%, 0.4))' }}
                    />
                    <div className="relative w-full h-full rounded-full bg-gradient-to-br from-lovers-primary/20 to-lovers-secondary/20 flex items-center justify-center border border-white/10">
                      <Heart className="w-10 h-10 text-lovers-primary animate-heart-beat" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white/90 mb-1">Share Your Heart</h3>
                    <p className="text-sm text-white/40">
                      Send a love message to begin your dreamy conversation 💕
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <DreamChatBubble
                    key={msg.id}
                    id={msg.id}
                    content={msg.content}
                    isOwn={msg.sender_id === currentUserId}
                    messageType={msg.message_type}
                    createdAt={msg.created_at}
                    readAt={msg.read_at}
                    reactions={Array.isArray(msg.reactions) ? msg.reactions : []}
                    metadata={msg.metadata}
                    isNew={idx === messages.length - 1 && msg.sender_id === currentUserId}
                    onReaction={(emoji) => addReaction(msg.id, emoji)}
                  />
                ))}
              </>
            )}

            {/* Typing indicator */}
            {isPartnerTyping && <DreamTypingIndicator partnerName={selectedContact.name} />}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Scroll to bottom button */}
          {showScrollButton && (
            <Button
              size="icon"
              onClick={() => scrollToBottom()}
              className="fixed bottom-24 right-6 rounded-full shadow-lg w-10 h-10 bg-lovers-primary/80 hover:bg-lovers-primary backdrop-blur-sm border border-white/20"
            >
              <ChevronDown className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* Message input */}
        {isRecordingVoice ? (
          <div className="px-3 py-3 border-t border-white/10 bg-black/20 backdrop-blur-sm">
            <VoiceMessageRecorder
              isLoversMode={true}
              onSend={async (audioBlob, duration) => {
                await sendMessage('🎤 Voice message', 'voice');
                setIsRecordingVoice(false);
                scrollToBottom();
              }}
              onCancel={() => setIsRecordingVoice(false)}
            />
          </div>
        ) : (
          <DreamMessageInput
            onSend={handleSendMessage}
            onTyping={setTyping}
            onVoiceRecord={() => setIsRecordingVoice(true)}
            onMediaSelect={(type) => toast({ title: type, description: 'Coming soon!' })}
          />
        )}
      </div>

      {/* Settings Dialog */}
      <ChatSettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        settings={chatSettings}
        contactName={selectedContact.name}
        isLoversMode={true}
        onMuteToggle={toggleMute}
        onDisappearingModeChange={setDisappearingMode}
        onWallpaperChange={() => toast({ title: 'Wallpaper', description: 'Dream wallpapers coming soon!' })}
        onBlock={() => toast({ title: 'Block', description: 'Coming soon!' })}
        onRemoveFriend={() => toast({ title: 'Remove', description: 'Coming soon!' })}
        onClearChat={() => toast({ title: 'Clear Chat', description: 'Coming soon!' })}
      />
    </div>
  );
};
