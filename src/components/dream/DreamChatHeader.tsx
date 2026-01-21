import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Phone, Video, Heart, MoreVertical, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DreamChatHeaderProps {
  contact: {
    id: string;
    name: string;
    avatar?: string;
    isOnline?: boolean;
    lastSeen?: string | null;
  };
  isTyping?: boolean;
  onBack?: () => void;
  onCall?: () => void;
  onVideoCall?: () => void;
  onMore?: () => void;
}

export const DreamChatHeader: React.FC<DreamChatHeaderProps> = ({
  contact,
  isTyping = false,
  onBack,
  onCall,
  onVideoCall,
  onMore,
}) => {
  const getLastSeenText = () => {
    if (contact.isOnline) return 'Connected souls ✨';
    if (contact.lastSeen) {
      const date = new Date(contact.lastSeen);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      
      if (hours < 1) return 'In your thoughts recently';
      if (hours < 24) return `Last dreamed ${hours}h ago`;
      return `Dreamed ${date.toLocaleDateString()}`;
    }
    return 'Awaiting connection';
  };

  return (
    <div className="relative px-4 py-3 border-b border-white/10">
      {/* Subtle glow background */}
      <div 
        className="absolute inset-0 opacity-50"
        style={{
          background: 'linear-gradient(180deg, hsla(280, 50%, 20%, 0.5) 0%, transparent 100%)',
        }}
      />

      <div className="relative flex items-center gap-3">
        {/* Back button */}
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="rounded-full w-9 h-9 hover:bg-white/10 text-white/80"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}

        {/* Avatar with glow */}
        <div className="relative">
          <div 
            className="absolute inset-0 rounded-full blur-md opacity-50"
            style={{
              background: 'linear-gradient(135deg, hsla(320, 100%, 60%, 0.5), hsla(270, 60%, 50%, 0.5))',
              transform: 'scale(1.2)',
            }}
          />
          <Avatar className="w-11 h-11 border-2 border-white/20 relative">
            {contact.avatar && <AvatarImage src={contact.avatar} />}
            <AvatarFallback className="bg-gradient-to-br from-lovers-primary to-lovers-secondary text-white text-sm">
              {contact.name[0]?.toUpperCase() || '💕'}
            </AvatarFallback>
          </Avatar>

          {/* Online indicator - pulsing heart */}
          {contact.isOnline && (
            <div className="absolute -bottom-0.5 -right-0.5">
              <Heart className="w-4 h-4 text-lovers-primary fill-lovers-primary dream-heart-pulse-small" />
            </div>
          )}
        </div>

        {/* Contact info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-white truncate">
              {contact.name}
            </h2>
            <Star className="w-3.5 h-3.5 text-lovers-stardust fill-lovers-stardust" />
          </div>
          <p className="text-xs text-white/50 truncate">
            {isTyping ? (
              <span className="text-lovers-primary flex items-center gap-1">
                <Heart className="w-3 h-3 fill-current animate-pulse" />
                typing with love...
              </span>
            ) : (
              getLastSeenText()
            )}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onCall}
            className="rounded-full w-9 h-9 hover:bg-white/10 text-white/70 hover:text-lovers-primary transition-colors"
          >
            <Phone className="w-4.5 h-4.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onVideoCall}
            className="rounded-full w-9 h-9 hover:bg-white/10 text-white/70 hover:text-lovers-primary transition-colors"
          >
            <Video className="w-4.5 h-4.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onMore}
            className="rounded-full w-9 h-9 hover:bg-white/10 text-white/70"
          >
            <MoreVertical className="w-4.5 h-4.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
