import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Smile, Mic, Phone, Video, Heart, CheckCheck } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'other';
  timestamp: Date;
  delivered: boolean;
  seen: boolean;
  disappearAt?: Date;
  reaction?: string;
}

interface ChatInterfaceProps {
  selectedContact?: {
    id: string;
    name: string;
    avatar?: string;
    isOnline: boolean;
  };
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ selectedContact }) => {
  const { mode } = useChat();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [disappearTimer, setDisappearTimer] = useState<'none' | '10s' | '1min' | 'custom'>('none');
  const [showReactions, setShowReactions] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isLoversMode = mode === 'lovers';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0) {
      const interval = setInterval(() => {
        const now = new Date();
        setMessages(prev => prev.filter(msg => !msg.disappearAt || msg.disappearAt > now));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [messages]);

  const getDisappearTime = (): Date | undefined => {
    if (disappearTimer === 'none') return undefined;
    const now = new Date();
    if (disappearTimer === '10s') return new Date(now.getTime() + 10000);
    if (disappearTimer === '1min') return new Date(now.getTime() + 60000);
    return undefined;
  };

  const sendMessage = () => {
    if (!message.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: message,
      sender: 'user',
      timestamp: new Date(),
      delivered: false,
      seen: false,
      disappearAt: getDisappearTime()
    };

    setMessages(prev => [...prev, newMessage]);
    setMessage('');

    setTimeout(() => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === newMessage.id 
            ? { ...msg, delivered: true }
            : msg
        )
      );
    }, 1000);
  };

  const addReaction = (messageId: string, emoji: string) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, reaction: emoji } : msg
      )
    );
    setShowReactions(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
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
              <p className={`
                text-sm
                ${selectedContact.isOnline 
                  ? isLoversMode ? 'text-lovers-primary' : 'text-general-primary'
                  : 'text-muted-foreground'
                }
              `}>
                {selectedContact.isOnline ? 'Online' : 'Last seen recently'}
              </p>
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
        {messages.length === 0 ? (
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
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className="relative group">
                <div
                  className={`
                    max-w-[70%] rounded-2xl px-4 py-3 shadow-lg cursor-pointer
                    ${msg.sender === 'user'
                      ? isLoversMode 
                        ? 'bg-gradient-to-br from-lovers-primary to-lovers-secondary text-white'
                        : 'bg-gradient-to-br from-general-primary to-general-secondary text-white'
                      : 'bg-white/90 backdrop-blur-sm text-foreground'
                    }
                    ${msg.disappearAt ? 'animate-pulse border-2 border-destructive/50' : ''}
                  `}
                  onClick={() => setShowReactions(showReactions === msg.id ? null : msg.id)}
                >
                  <p className="break-words">{msg.text}</p>
                  {msg.reaction && (
                    <span className="absolute -top-2 -right-2 text-2xl">{msg.reaction}</span>
                  )}
                  <div className="flex items-center justify-end space-x-1 mt-1">
                    {msg.disappearAt && (
                      <span className="text-xs text-destructive mr-2">
                        💣 {Math.max(0, Math.floor((msg.disappearAt.getTime() - Date.now()) / 1000))}s
                      </span>
                    )}
                    <span className={`text-xs ${msg.sender === 'user' ? 'text-white/70' : 'text-muted-foreground'}`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {msg.sender === 'user' && (
                      <CheckCheck className={`w-3 h-3 ${msg.seen ? 'text-blue-300' : msg.delivered ? 'text-white/70' : 'text-white/40'}`} />
                    )}
                  </div>
                </div>
                
                {showReactions === msg.id && (
                  <div className="absolute bottom-full mb-2 left-0 flex gap-2 bg-background/95 backdrop-blur-sm p-2 rounded-lg shadow-lg">
                    {['❤️', '😂', '😮', '😢', '👍', '🎉'].map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => addReaction(msg.id, emoji)}
                        className="text-2xl hover:scale-125 transition-transform"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-3">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-white/20 glass">
        <div className="flex items-center space-x-2">
          <div className="flex-1 relative">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
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
          
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-white/10"
          >
            <Mic className="w-5 h-5" />
          </Button>
          
          <Button
            onClick={sendMessage}
            disabled={!message.trim()}
            className={`
              rounded-full w-12 h-12 p-0
              ${isLoversMode ? 'btn-lovers' : 'btn-general'}
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};