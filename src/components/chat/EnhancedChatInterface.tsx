import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Smile, 
  Phone, 
  Video, 
  Heart, 
  CheckCheck,
  ThumbsUp,
  Laugh,
  PartyPopper,
  Flame
} from 'lucide-react';
import { useEnhancedRealTimeChat } from '@/hooks/useEnhancedRealTimeChat';
import { formatDistanceToNow } from 'date-fns';
import { Reaction } from '@/types/chat';

interface Contact {
  id: string;
  name: string;
  avatar?: string;
  isOnline: boolean;
  conversationId?: string;
}

interface EnhancedChatInterfaceProps {
  selectedContact?: Contact;
}

const REACTION_EMOJIS = ['❤️', '👍', '😂', '🎉', '🔥', '😍', '👏', '🙌'];

export const EnhancedChatInterface: React.FC<EnhancedChatInterfaceProps> = ({ selectedContact }) => {
  const { mode } = useChat();
  const [messageText, setMessageText] = useState('');
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isLoversMode = mode === 'lovers';

  const { 
    messages, 
    typingUsers, 
    loading, 
    sendMessage, 
    addReaction, 
    setTyping 
  } = useEnhancedRealTimeChat(selectedContact?.conversationId || null);

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    loadUser();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    await sendMessage(messageText);
    setMessageText('');
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);
    setTyping(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    await addReaction(messageId, emoji);
    setShowReactions(null);
  };

  const getReactionCount = (reactions: any[], emoji: string) => {
    return reactions?.filter((r: any) => r.emoji === emoji).length || 0;
  };

  const hasUserReacted = (reactions: any[], emoji: string) => {
    return reactions?.some((r: any) => r.emoji === emoji && r.user_id === currentUserId) || false;
  };

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
            <Heart className="w-12 h-12 text-primary animate-pulse" />
          </div>
          <h3 className="text-xl font-semibold">Select a conversation</h3>
          <p className="text-muted-foreground">
            Choose a contact to start messaging
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b glass border-white/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="w-12 h-12">
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                {selectedContact.name[0]}
              </AvatarFallback>
            </Avatar>
            {selectedContact.isOnline && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
            )}
          </div>
          <div>
            <h3 className="font-semibold">{selectedContact.name}</h3>
            <div className="flex items-center gap-2 text-sm">
              {typingUsers.length > 0 ? (
                <span className="text-primary animate-pulse">
                  {typingUsers.map(u => u.display_name).join(', ')} typing...
                </span>
              ) : (
                <span className="text-muted-foreground">
                  {selectedContact.isOnline ? 'Active now' : 'Offline'}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button size="icon" variant="ghost" className="rounded-full">
            <Phone className="w-5 h-5" />
          </Button>
          <Button size="icon" variant="ghost" className="rounded-full">
            <Video className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const isOwn = msg.sender_id === currentUserId;
              const reactions: Reaction[] = Array.isArray(msg.reactions) 
                ? (msg.reactions as Reaction[])
                : [];
              const uniqueEmojis = [...new Set(reactions.map((r) => r.emoji))];

              return (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {!isOwn && (
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-xs">
                        {selectedContact.name[0]}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[70%]`}>
                    <div className="relative group">
                      <div
                        className={`
                          px-4 py-2 rounded-2xl
                          ${isOwn
                            ? isLoversMode
                              ? 'bg-gradient-to-br from-lovers-primary to-lovers-secondary text-white'
                              : 'bg-gradient-to-br from-general-primary to-general-secondary text-white'
                            : 'glass border border-white/20'
                          }
                        `}
                      >
                        <p className="text-sm">{msg.content}</p>
                      </div>
                      
                      {/* Reactions */}
                      {uniqueEmojis.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {uniqueEmojis.map((emoji) => {
                            const count = getReactionCount(reactions, emoji);
                            const userReacted = hasUserReacted(reactions, emoji);
                            return (
                              <button
                                key={emoji}
                                onClick={() => handleReaction(msg.id, emoji)}
                                className={`
                                  px-2 py-0.5 rounded-full text-xs flex items-center gap-1
                                  ${userReacted 
                                    ? 'bg-primary/20 border border-primary' 
                                    : 'bg-background/50 border border-border'
                                  }
                                  hover:scale-110 transition-transform
                                `}
                              >
                                <span>{emoji}</span>
                                <span className="text-xs">{count}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Reaction Picker */}
                      <button
                        onClick={() => setShowReactions(showReactions === msg.id ? null : msg.id)}
                        className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Smile className="w-5 h-5 text-muted-foreground hover:text-primary" />
                      </button>

                      {showReactions === msg.id && (
                        <div className="absolute bottom-full mb-2 right-0 bg-popover border border-border rounded-lg shadow-lg p-2 flex gap-2 z-10">
                          {REACTION_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => handleReaction(msg.id, emoji)}
                              className="text-2xl hover:scale-125 transition-transform"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}</span>
                      {isOwn && (
                        <CheckCheck 
                          className={`w-4 h-4 ${msg.read_at ? 'text-primary' : 'text-muted-foreground'}`} 
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t glass border-white/20">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" className="rounded-full">
            <Smile className="w-5 h-5" />
          </Button>
          
          <Input
            ref={inputRef}
            value={messageText}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 glass border-white/20"
          />
          
          <Button
            onClick={handleSendMessage}
            disabled={!messageText.trim()}
            className={`rounded-full ${isLoversMode ? 'btn-lovers' : 'btn-general'}`}
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
