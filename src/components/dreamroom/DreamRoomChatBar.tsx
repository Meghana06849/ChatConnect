import React from 'react';
import { Heart, Smile, Send, Grid3X3, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface DreamRoomChatBarProps {
  chatMessage: string;
  onChatMessageChange: (val: string) => void;
  onSend: () => void;
  onTyping: () => void;
  partnerName: string;
  onNavigate: (view: 'calendar' | 'vault' | 'games' | 'main') => void;
}

export const DreamRoomChatBar: React.FC<DreamRoomChatBarProps> = ({
  chatMessage,
  onChatMessageChange,
  onSend,
  onTyping,
  partnerName,
  onNavigate,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 pb-safe">
      <div className="max-w-lg mx-auto px-3 pb-3 pt-2">
        {/* Quick action row */}
        <div className="flex items-center gap-2 mb-2 px-1">
          <button onClick={() => onNavigate('vault')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] text-white/70 transition-all hover:text-white/90 hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, hsla(320 40% 20% / 0.6), hsla(280 35% 18% / 0.6))',
              border: '1px solid hsla(320 60% 50% / 0.15)',
              backdropFilter: 'blur(12px)',
            }}>
            <Heart className="w-3 h-3 text-[hsl(var(--lovers-primary))]" />
            Memories
          </button>
          <button
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-white/50 transition-all hover:text-white/70"
            style={{
              background: 'hsla(280 30% 15% / 0.5)',
              border: '1px solid hsla(280 40% 40% / 0.1)',
              backdropFilter: 'blur(12px)',
            }}>
            <Smile className="w-3 h-3" />
          </button>
        </div>

        {/* Main input bar */}
        <div className="flex items-center gap-2 rounded-full px-4 py-2"
          style={{
            background: 'linear-gradient(135deg, hsla(280 35% 18% / 0.85), hsla(300 30% 15% / 0.85))',
            border: chatMessage.trim()
              ? '1px solid hsla(320 80% 60% / 0.4)'
              : '1px solid hsla(320 60% 50% / 0.15)',
            boxShadow: chatMessage.trim()
              ? '0 0 20px 3px hsla(320 80% 55% / 0.15), 0 4px 16px hsla(0 0% 0% / 0.3)'
              : '0 4px 16px hsla(0 0% 0% / 0.3)',
            backdropFilter: 'blur(20px)',
            transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
          }}>
          <Input
            value={chatMessage}
            onChange={(e) => {
              onChatMessageChange(e.target.value);
              onTyping();
            }}
            onKeyDown={(e) => e.key === 'Enter' && onSend()}
            placeholder="Send a message..."
            className="flex-1 bg-transparent border-0 text-white placeholder:text-white/30 text-sm h-8 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
          />

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button className="w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-white/70 transition-colors">
              <Heart className="w-3.5 h-3.5 text-[hsl(var(--lovers-primary))]" />
            </button>
            <button className="w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-white/70 transition-colors">
              <Grid3X3 className="w-3.5 h-3.5" />
            </button>
            {chatMessage.trim() ? (
              <button onClick={onSend}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--lovers-primary)), hsl(var(--lovers-secondary)))',
                  boxShadow: '0 0 14px hsla(320 80% 55% / 0.4)',
                }}>
                <Send className="w-3.5 h-3.5 text-white" />
              </button>
            ) : (
              <button className="w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-white/70 transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
