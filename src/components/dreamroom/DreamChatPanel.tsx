import React, { useEffect, useRef, useMemo } from 'react';
import { Heart, Send, Smile } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface ChatMessage {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  read_at?: string | null;
}

interface DreamChatPanelProps {
  messages: ChatMessage[];
  currentUserId: string | null;
  chatMessage: string;
  onChatMessageChange: (val: string) => void;
  onSend: () => void;
  partnerName: string;
  typingUsers: { user_id: string; display_name: string }[];
  onTyping: () => void;
  loading: boolean;
}

export const DreamChatPanel: React.FC<DreamChatPanelProps> = ({
  messages,
  currentUserId,
  chatMessage,
  onChatMessageChange,
  onSend,
  partnerName,
  typingUsers,
  onTyping,
  loading,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const partnerTyping = useMemo(() => 
    typingUsers.filter(u => u.user_id !== currentUserId),
    [typingUsers, currentUserId]
  );

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col rounded-2xl overflow-hidden mb-3" style={{
      background: 'linear-gradient(180deg, hsla(280 40% 10% / 0.7) 0%, hsla(320 35% 12% / 0.8) 100%)',
      border: '1px solid hsla(320 60% 50% / 0.15)',
      boxShadow: '0 8px 32px hsla(320 50% 20% / 0.2), inset 0 1px 0 hsla(320 80% 70% / 0.05)',
      backdropFilter: 'blur(20px)',
      height: 'clamp(200px, 45vh, 380px)',
    }}>
      {/* Chat header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Heart className="w-3.5 h-3.5 text-[hsl(var(--lovers-primary))] dream-heart-pulse-small" />
          <span className="text-xs font-medium text-white/70">Dream Chat</span>
        </div>
        {partnerTyping.length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="flex gap-0.5">
              {[0, 1, 2].map(i => (
                <span key={i} className="w-1 h-1 rounded-full bg-[hsl(var(--lovers-primary))] dream-typing-heart"
                  style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
            <span className="text-[10px] text-[hsl(var(--lovers-primary))] italic">typing…</span>
          </div>
        )}
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-2 scrollbar-thin">
        {loading && (
          <div className="flex justify-center py-4">
            <Heart className="w-5 h-5 text-[hsl(var(--lovers-primary))] animate-heart-beat opacity-40" />
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <Heart className="w-8 h-8 text-[hsl(var(--lovers-primary))] opacity-20 mb-2 animate-heart-beat" />
            <p className="text-xs text-white/30">Whisper something sweet…</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_id === currentUserId;
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} dream-bubble-appear`}>
              <div className={`max-w-[75%] px-3 py-1.5 rounded-2xl text-sm ${
                isMine
                  ? 'rounded-br-md'
                  : 'rounded-bl-md'
              }`} style={{
                background: isMine
                  ? 'linear-gradient(135deg, hsla(320 80% 55% / 0.85), hsla(270 60% 50% / 0.85))'
                  : 'hsla(280 30% 20% / 0.6)',
                border: isMine
                  ? '1px solid hsla(320 80% 60% / 0.3)'
                  : '1px solid hsla(280 40% 40% / 0.2)',
                color: isMine ? 'white' : 'hsla(0 0% 100% / 0.9)',
                boxShadow: isMine
                  ? '0 2px 12px hsla(320 80% 50% / 0.2)'
                  : '0 1px 6px hsla(0 0% 0% / 0.2)',
              }}>
                <p className="leading-relaxed">{msg.content}</p>
                <div className={`flex items-center gap-1 mt-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <span className="text-[9px] opacity-50">{formatTime(msg.created_at)}</span>
                  {isMine && (
                    <span className="text-[9px]">
                      {msg.read_at ? (
                        <Heart className="w-2.5 h-2.5 text-[hsl(var(--lovers-primary))] inline dream-heart-seen" fill="hsl(var(--lovers-primary))" />
                      ) : (
                        <Heart className="w-2.5 h-2.5 text-white/30 inline" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input area */}
      <div className="px-3 py-2 border-t border-white/5">
        <div className="flex items-center gap-2 rounded-full px-3 py-1.5"
          style={{
            background: 'hsla(280 30% 15% / 0.6)',
            border: chatMessage.trim()
              ? '1px solid hsla(320 80% 60% / 0.4)'
              : '1px solid hsla(320 60% 50% / 0.15)',
            transition: 'border-color 0.3s ease',
          }}>
          <button className="text-white/40 hover:text-white/70 transition-colors flex-shrink-0">
            <Smile className="w-4 h-4" />
          </button>
          <Input
            value={chatMessage}
            onChange={(e) => {
              onChatMessageChange(e.target.value);
              onTyping();
            }}
            onKeyDown={(e) => e.key === 'Enter' && onSend()}
            placeholder={`Whisper to ${partnerName}…`}
            className="flex-1 bg-transparent border-0 text-white placeholder:text-white/25 text-sm h-7 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
          />
          <button onClick={onSend}
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-110 active:scale-95"
            style={{
              background: chatMessage.trim()
                ? 'linear-gradient(135deg, hsl(var(--lovers-primary)), hsl(var(--lovers-secondary)))'
                : 'hsla(320 40% 30% / 0.4)',
              boxShadow: chatMessage.trim() ? '0 0 12px hsla(320 80% 55% / 0.3)' : 'none',
            }}>
            <Send className="w-3 h-3 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};
