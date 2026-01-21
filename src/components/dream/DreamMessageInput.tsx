import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Send, 
  Mic, 
  Heart, 
  Plus, 
  Smile, 
  Image, 
  Camera, 
  MapPin,
  Sparkles 
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DreamMessageInputProps {
  onSend: (message: string) => void;
  onTyping: (isTyping: boolean) => void;
  onVoiceRecord?: () => void;
  onMediaSelect?: (type: string) => void;
  disabled?: boolean;
}

const loveEmojis = ['❤️', '💕', '💗', '💖', '💘', '💝', '😘', '🥰', '😍', '💋', '🌹', '✨', '🌙', '⭐', '💫'];

export const DreamMessageInput: React.FC<DreamMessageInputProps> = ({
  onSend,
  onTyping,
  onVoiceRecord,
  onMediaSelect,
  disabled = false,
}) => {
  const [message, setMessage] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    onTyping(e.target.value.length > 0);
  };

  const handleSend = () => {
    if (!message.trim()) return;
    onSend(message.trim());
    setMessage('');
    onTyping(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertEmoji = (emoji: string) => {
    setMessage(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const attachmentOptions = [
    { icon: Camera, label: 'Camera', action: 'camera', color: 'from-pink-500 to-rose-500' },
    { icon: Image, label: 'Gallery', action: 'gallery', color: 'from-purple-500 to-violet-500' },
    { icon: MapPin, label: 'Our Place', action: 'location', color: 'from-blue-400 to-cyan-400' },
  ];

  return (
    <div className="relative px-3 py-3 border-t border-white/10">
      {/* Subtle glow background */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: 'linear-gradient(0deg, hsla(280, 50%, 15%, 0.8) 0%, transparent 100%)',
        }}
      />

      <div className="relative flex items-center gap-2">
        {/* Attachment button */}
        <Popover open={showAttach} onOpenChange={setShowAttach}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "rounded-full w-9 h-9 hover:bg-white/10 transition-all",
                showAttach && "rotate-45 text-lovers-primary"
              )}
            >
              <Plus className="w-5 h-5 text-white/60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            side="top" 
            align="start"
            className="w-auto p-4 bg-[hsla(280,50%,12%,0.95)] backdrop-blur-xl border-white/20"
          >
            <div className="flex gap-4">
              {attachmentOptions.map((opt) => (
                <button
                  key={opt.action}
                  onClick={() => {
                    setShowAttach(false);
                    onMediaSelect?.(opt.action);
                  }}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center text-white",
                    "bg-gradient-to-br",
                    opt.color,
                    "transition-transform group-hover:scale-110"
                  )}>
                    <opt.icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs text-white/60">{opt.label}</span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Message input */}
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            value={message}
            onChange={handleChange}
            onKeyPress={handleKeyPress}
            disabled={disabled}
            placeholder="Whisper to your love..."
            className={cn(
              "pr-10 py-2.5 rounded-full text-sm text-white placeholder:text-white/30",
              "bg-white/5 border-white/15 focus:border-lovers-primary/50",
              "backdrop-blur-sm transition-all",
              "focus:bg-white/10 focus:shadow-[0_0_20px_-5px_hsla(320,100%,60%,0.3)]"
            )}
          />

          {/* Emoji button inside input */}
          <Popover open={showEmoji} onOpenChange={setShowEmoji}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full w-7 h-7 hover:bg-white/10"
              >
                <Smile className="w-4 h-4 text-white/50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              side="top" 
              align="end"
              className="w-auto p-3 bg-[hsla(280,50%,12%,0.95)] backdrop-blur-xl border-white/20"
            >
              <div className="grid grid-cols-5 gap-2">
                {loveEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => insertEmoji(emoji)}
                    className="text-xl p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Send / Voice button */}
        {message.trim() ? (
          <Button
            onClick={handleSend}
            disabled={disabled}
            size="icon"
            className={cn(
              "rounded-full w-10 h-10 relative overflow-hidden",
              "bg-gradient-to-br from-lovers-primary to-lovers-secondary",
              "hover:shadow-[0_0_25px_-5px_hsla(320,100%,60%,0.5)]",
              "transition-all active:scale-95"
            )}
          >
            {/* Sparkle effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent" />
            <Send className="w-4 h-4 relative z-10" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={onVoiceRecord}
            className="rounded-full w-10 h-10 hover:bg-white/10 text-lovers-primary"
          >
            <Mic className="w-5 h-5" />
          </Button>
        )}
      </div>
    </div>
  );
};
