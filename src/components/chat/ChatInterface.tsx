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
  // TODO: Load real messages from Supabase messages table

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isLoversMode = mode === 'lovers';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = () => {
    if (!message.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: message,
      sender: 'user',
      timestamp: new Date(),
      delivered: false,
      seen: false
    };

    setMessages(prev => [...prev, newMessage]);
    setMessage('');

    // Simulate delivery
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
              <div
                className={`
                  max-w-xs lg:max-w-md px-4 py-2 rounded-2xl relative
                  ${msg.sender === 'user'
                    ? `chat-bubble-sent ${isLoversMode ? 'lovers-mode' : ''}`
                    : `chat-bubble-received ${isLoversMode ? 'lovers-mode' : ''}`
                  }
                `}
              >
                <p className="text-sm">{msg.text}</p>
                <div className="flex items-center justify-end space-x-1 mt-1">
                  <span className="text-xs opacity-70">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {msg.sender === 'user' && (
                    <div className="flex">
                      {isLoversMode ? (
                        <Heart className={`w-3 h-3 ${msg.delivered ? 'text-lovers-primary fill-current' : 'text-gray-400'}`} />
                      ) : (
                        <CheckCheck className={`w-4 h-4 ${msg.delivered ? 'text-general-primary' : 'text-gray-400'}`} />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
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