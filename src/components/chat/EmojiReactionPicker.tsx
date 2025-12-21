import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Smile, Heart } from 'lucide-react';

interface EmojiReactionPickerProps {
  onSelectEmoji: (emoji: string) => void;
  isLoversMode?: boolean;
  existingReactions?: { emoji: string; user_id: string }[];
  currentUserId?: string;
  className?: string;
}

const GENERAL_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👏'];
const LOVERS_EMOJIS = ['❤️', '💕', '💖', '💗', '😘', '🥰', '💋', '💝', '✨', '🌹', '💑', '💞'];

export const EmojiReactionPicker: React.FC<EmojiReactionPickerProps> = ({
  onSelectEmoji,
  isLoversMode = false,
  existingReactions = [],
  currentUserId,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const emojis = isLoversMode ? LOVERS_EMOJIS : GENERAL_EMOJIS;

  const handleEmojiClick = (emoji: string) => {
    onSelectEmoji(emoji);
    setIsOpen(false);
  };

  // Check if user already reacted with this emoji
  const hasReacted = (emoji: string) => {
    return existingReactions.some(r => r.emoji === emoji && r.user_id === currentUserId);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-7 w-7 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20 ${className}`}
        >
          {isLoversMode ? (
            <Heart className="w-4 h-4 text-lovers-primary" />
          ) : (
            <Smile className="w-4 h-4" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-2 glass border-white/20" 
        side="top" 
        align="start"
      >
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {emojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleEmojiClick(emoji)}
              className={`
                text-xl p-1.5 rounded-lg transition-all hover:scale-125 hover:bg-white/10
                ${hasReacted(emoji) ? 'bg-lovers-primary/20 ring-1 ring-lovers-primary/50' : ''}
              `}
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
