import React, { useState, useEffect } from 'react';
import { Heart, Check, CheckCheck, Image, FileText, Mic, Video, MapPin, Play, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Reaction {
  emoji: string;
  user_id: string;
}

interface DreamChatBubbleProps {
  id: string;
  content: string;
  isOwn: boolean;
  messageType: string;
  createdAt: string;
  readAt?: string | null;
  reactions: Reaction[];
  metadata?: any;
  isNew?: boolean;
  onReaction?: (emoji: string) => void;
  onReply?: () => void;
}

export const DreamChatBubble: React.FC<DreamChatBubbleProps> = ({
  id,
  content,
  isOwn,
  messageType,
  createdAt,
  readAt,
  reactions,
  metadata,
  isNew = false,
  onReaction,
  onReply,
}) => {
  const [showPulse, setShowPulse] = useState(isNew);

  useEffect(() => {
    if (isNew) {
      const timer = setTimeout(() => setShowPulse(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [isNew]);

  const getStatus = () => {
    if (readAt) return 'seen';
    if (id) return 'delivered';
    return 'sent';
  };

  const renderContent = () => {
    switch (messageType) {
      case 'voice':
        return (
          <div className="flex items-center gap-3 min-w-[180px]">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <Mic className="w-5 h-5 text-lovers-primary" />
            </div>
            <div className="flex-1">
              <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full w-2/3 bg-gradient-to-r from-lovers-primary to-lovers-secondary rounded-full" />
              </div>
              <span className="text-xs opacity-60 mt-1">{metadata?.duration || '0:00'}</span>
            </div>
          </div>
        );

      case 'image':
        return (
          <div className="relative rounded-xl overflow-hidden max-w-[220px]">
            {metadata?.imageUrl ? (
              <img 
                src={metadata.imageUrl} 
                alt="Shared" 
                className="w-full h-auto max-h-[250px] object-cover"
              />
            ) : (
              <div className="w-full h-32 bg-white/5 flex items-center justify-center">
                <Image className="w-8 h-8 opacity-50" />
              </div>
            )}
            {content && <p className="mt-2 text-sm">{content}</p>}
          </div>
        );

      case 'video':
        return (
          <div className="relative rounded-xl overflow-hidden max-w-[220px]">
            <div className="w-full h-32 bg-black/40 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Play className="w-6 h-6 fill-white text-white ml-1" />
              </div>
            </div>
          </div>
        );

      case 'location':
        return (
          <div className="flex items-center gap-3 p-2 bg-white/5 rounded-xl">
            <MapPin className="w-6 h-6 text-lovers-primary" />
            <div>
              <p className="text-sm font-medium">Shared Location</p>
              <p className="text-xs opacity-60">Tap to view our special place</p>
            </div>
          </div>
        );

      default:
        return <p className="whitespace-pre-wrap break-words">{content}</p>;
    }
  };

  const status = getStatus();

  return (
    <div className={cn(
      "flex w-full",
      isOwn ? "justify-end" : "justify-start"
    )}>
      <div 
        className={cn(
          "relative max-w-[75%] group",
          showPulse && "dream-bubble-appear"
        )}
      >
        {/* Glow effect for own messages */}
        {isOwn && (
          <div 
            className="absolute inset-0 rounded-2xl blur-xl opacity-40 -z-10"
            style={{
              background: 'linear-gradient(135deg, hsla(320, 100%, 60%, 0.4), hsla(270, 60%, 50%, 0.4))',
              transform: 'scale(1.1)',
            }}
          />
        )}

        {/* Bubble container */}
        <div
          className={cn(
            "relative rounded-2xl px-4 py-3 backdrop-blur-sm",
            isOwn
              ? "bg-gradient-to-br from-[hsla(320,100%,65%,0.85)] to-[hsla(270,60%,50%,0.85)] text-white"
              : "bg-white/10 border border-white/20 text-white/90"
          )}
          style={{
            boxShadow: isOwn
              ? '0 4px 20px -4px hsla(320, 100%, 50%, 0.3), inset 0 1px 0 0 hsla(0, 0%, 100%, 0.2)'
              : '0 4px 20px -4px hsla(0, 0%, 0%, 0.2), inset 0 1px 0 0 hsla(0, 0%, 100%, 0.1)',
          }}
        >
          {/* Content */}
          <div className="relative z-10">
            {renderContent()}
          </div>

          {/* Reactions */}
          {reactions.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {reactions.map((reaction, idx) => (
                <span 
                  key={idx} 
                  className="text-sm bg-white/10 rounded-full px-2 py-0.5 backdrop-blur-sm"
                  onClick={() => onReaction?.(reaction.emoji)}
                >
                  {reaction.emoji}
                </span>
              ))}
            </div>
          )}

          {/* Timestamp and status */}
          <div className="flex items-center justify-end gap-1.5 mt-1.5">
            <span className={cn(
              "text-[10px]",
              isOwn ? "text-white/60" : "text-white/40"
            )}>
              {new Date(createdAt).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>

            {/* Dream heart read receipt */}
            {isOwn && (
              <div className="relative">
                {status === 'seen' ? (
                  <div className="relative">
                    <Heart 
                      className="w-3.5 h-3.5 text-lovers-primary fill-lovers-primary dream-heart-seen" 
                    />
                    <div className="absolute inset-0 dream-heart-seen-glow" />
                  </div>
                ) : status === 'delivered' ? (
                  <CheckCheck className="w-3.5 h-3.5 text-white/60" />
                ) : (
                  <Check className="w-3.5 h-3.5 text-white/40" />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Heart pulse animation on new message */}
        {showPulse && isOwn && (
          <div className="absolute inset-0 rounded-2xl dream-bubble-pulse pointer-events-none" />
        )}
      </div>
    </div>
  );
};
