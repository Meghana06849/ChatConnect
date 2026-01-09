import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { supabase } from '@/integrations/supabase/client';
import { useEnhancedRealTimeChat } from '@/hooks/useEnhancedRealTimeChat';
import { TypingIndicator } from './TypingIndicator';
import { HeartReadReceipt } from './HeartReadReceipt';
import { EmojiReactionPicker } from './EmojiReactionPicker';
import { MessageReactions } from './MessageReactions';
import { VoiceMessageRecorder } from './VoiceMessageRecorder';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';
import { LastSeenStatus } from './LastSeenStatus';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Smile, Mic, Phone, Video, Heart, X } from 'lucide-react';

interface ChatInterfaceProps {
  selectedContact?: {
    id: string;
    name: string;
    avatar?: string;
    isOnline: boolean;
    lastSeen?: string | null;
  };
  conversationId?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ selectedContact, conversationId }) => {
  const { mode } = useChat();
  const [messageInput, setMessageInput] = useState('');
  const [disappearTimer, setDisappearTimer] = useState<'none' | '10s' | '1min' | 'custom'>('none');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isLoversMode = mode === 'lovers';

  // Real-time chat hook
  const {
    messages,
    typingUsers,
    loading,
    sendMessage,
    addReaction,
    setTyping,
  } = useEnhancedRealTimeChat(conversationId || null);

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;

    await sendMessage(messageInput);
    setMessageInput('');
    setTyping(false);
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

  const getMessageStatus = (msg: any): 'sending' | 'sent' | 'delivered' | 'seen' => {
    if (msg.read_at) return 'seen';
    if (msg.id) return 'delivered';
    return 'sent';
  };

  const isPartnerTyping = typingUsers.length > 0;

  if (!selectedContact) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className={`
            w-24 h-24 rounded-full flex items-center justify-center mx-auto
            ${isLoversMode 
              ? 'bg-gradient-to-br from-lovers-primary/20 to-lovers-secondary/20' 
              : 'bg-gradient-to-br from-general-primary/20 to-general-secondary/20'
            }
          `}>
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
              : 'Pick a contact from your list to start chatting'
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Chat Header */}
      <div className="p-4 border-b border-white/20 glass">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className={`
                ${isLoversMode 
                  ? 'bg-gradient-to-br from-lovers-primary to-lovers-secondary text-white' 
                  : 'bg-gradient-to-br from-general-primary to-general-secondary text-white'
                }
              `}>
                {selectedContact.name[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{selectedContact.name}</h3>
              <LastSeenStatus 
                isOnline={selectedContact.isOnline}
                lastSeen={selectedContact.lastSeen}
                isTyping={isPartnerTyping}
                isLoversMode={isLoversMode}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <select
              value={disappearTimer}
              onChange={(e) => setDisappearTimer(e.target.value as any)}
              className="glass border-white/20 rounded-lg px-2 py-1 text-xs"
            >
              <option value="none">Normal</option>
              <option value="10s">10s 💣</option>
              <option value="1min">1min ⏱️</option>
            </select>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-white/10"
            >
              <Phone className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-white/10"
            >
              <Video className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-pulse text-muted-foreground">Loading messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className={`
                w-16 h-16 rounded-full flex items-center justify-center mx-auto
                ${isLoversMode 
                  ? 'bg-gradient-to-br from-lovers-primary/20 to-lovers-secondary/20' 
                  : 'bg-gradient-to-br from-general-primary/20 to-general-secondary/20'
                }
              `}>
                {isLoversMode ? (
                  <Heart className="w-8 h-8 text-lovers-primary animate-heart-beat" />
                ) : (
                  <Send className="w-8 h-8 text-general-primary" />
                )}
              </div>
              <div>
                <h3 className="font-semibold mb-2">
                  {isLoversMode ? 'Share your heart' : 'No messages yet'}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {isLoversMode 
                    ? 'Send a love message to start your conversation 💕'
                    : 'Send a message to start chatting!'
                  }
                </p>
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwnMessage = msg.sender_id === currentUserId;
            const reactions = Array.isArray(msg.reactions) ? msg.reactions : [];
            
            return (
              <div
                key={msg.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div className="relative group max-w-[70%]">
                  <div
                    className={`
                      rounded-2xl px-4 py-3 shadow-lg
                      ${isOwnMessage
                        ? isLoversMode 
                          ? 'bg-gradient-to-br from-lovers-primary to-lovers-secondary text-white'
                          : 'bg-gradient-to-br from-general-primary to-general-secondary text-white'
                        : 'bg-white/90 backdrop-blur-sm text-foreground'
                      }
                    `}
                  >
                    {/* Voice message or text */}
                    {msg.message_type === 'voice' && msg.metadata?.audioUrl ? (
                      <VoiceMessagePlayer 
                        audioUrl={msg.metadata.audioUrl}
                        duration={msg.metadata.duration}
                        isOwnMessage={isOwnMessage}
                        isLoversMode={isLoversMode}
                      />
                    ) : (
                      <p className="break-words">{msg.content}</p>
                    )}
                    
                    {/* Reactions Display */}
                    <MessageReactions 
                      reactions={reactions}
                      currentUserId={currentUserId || undefined}
                      onReactionClick={(emoji) => addReaction(msg.id, emoji)}
                      isLoversMode={isLoversMode}
                    />
                    
                    <div className="flex items-center justify-end space-x-1 mt-1">
                      <span className={`text-xs ${isOwnMessage ? 'text-white/70' : 'text-muted-foreground'}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isOwnMessage && (
                        <HeartReadReceipt 
                          status={getMessageStatus(msg)}
                          isLoversMode={isLoversMode}
                          seenAt={msg.read_at || undefined}
                        />
                      )}
                    </div>
                  </div>
                  
                  {/* Reaction Picker */}
                  <div className={`absolute top-1/2 -translate-y-1/2 ${isOwnMessage ? '-left-10' : '-right-10'}`}>
                    <EmojiReactionPicker
                      onSelectEmoji={(emoji) => addReaction(msg.id, emoji)}
                      isLoversMode={isLoversMode}
                      existingReactions={reactions}
                      currentUserId={currentUserId || undefined}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
        
        {/* Typing Indicator */}
        {isPartnerTyping && <TypingIndicator typingUsers={typingUsers} />}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-white/20 glass">
        {isRecordingVoice ? (
          <VoiceMessageRecorder
            isLoversMode={isLoversMode}
            onSend={async (audioBlob, duration) => {
              // For now, create a local URL for the audio
              // In production, you'd upload to storage and save the URL
              const audioUrl = URL.createObjectURL(audioBlob);
              await sendMessage('🎤 Voice message', 'voice');
              setIsRecordingVoice(false);
            }}
            onCancel={() => setIsRecordingVoice(false)}
          />
        ) : (
          <div className="flex items-center space-x-2">
            <div className="flex-1 relative">
              <Input
                value={messageInput}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                onBlur={() => setTyping(false)}
                placeholder={isLoversMode ? "Send love..." : "Type a message..."}
                className="pr-12 py-3 rounded-2xl glass border-white/20"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 rounded-full hover:bg-white/10"
              >
                <Smile className="w-5 h-5" />
              </Button>
            </div>
            
            {messageInput.trim() ? (
              <Button
                onClick={handleSendMessage}
                className={`
                  rounded-full w-12 h-12 p-0
                  ${isLoversMode ? 'btn-lovers' : 'btn-general'}
                `}
              >
                <Send className="w-5 h-5" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsRecordingVoice(true)}
                className={`
                  rounded-full w-12 h-12 p-0 hover:bg-white/10
                  ${isLoversMode ? 'text-lovers-primary' : 'text-general-primary'}
                `}
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