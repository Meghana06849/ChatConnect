import React from 'react';
import { UserPlus, Heart, Check, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface FriendRequestNotificationProps {
  senderName: string;
  senderUsername: string;
  senderAvatar?: string | null;
  isOnline: boolean;
  isLoversMode?: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
  showActions?: boolean;
}

export const FriendRequestNotification: React.FC<FriendRequestNotificationProps> = ({
  senderName,
  senderUsername,
  senderAvatar,
  isOnline,
  isLoversMode = false,
  onAccept,
  onDecline,
  showActions = true
}) => {
  return (
    <div className={`
      flex items-center gap-3 p-4 rounded-2xl glass border
      ${isLoversMode 
        ? 'bg-lovers-primary/10 border-lovers-primary/30' 
        : 'bg-general-primary/10 border-general-primary/30'
      }
      animate-slide-in-right shadow-lg
    `}>
      {/* Animated icon */}
      <div className={`
        relative w-12 h-12 rounded-full flex items-center justify-center
        ${isLoversMode 
          ? 'bg-gradient-to-br from-lovers-primary to-lovers-secondary' 
          : 'bg-gradient-to-br from-general-primary to-general-secondary'
        }
        animate-pulse-gentle
      `}>
        {isLoversMode ? (
          <Heart className="w-6 h-6 text-white animate-heart-beat" />
        ) : (
          <UserPlus className="w-6 h-6 text-white" />
        )}
        
        {/* Ripple effect */}
        <div className={`
          absolute inset-0 rounded-full animate-ping opacity-30
          ${isLoversMode ? 'bg-lovers-primary' : 'bg-general-primary'}
        `} />
      </div>

      {/* Sender info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Avatar className="w-10 h-10">
              <AvatarImage src={senderAvatar || undefined} />
              <AvatarFallback className={`
                ${isLoversMode 
                  ? 'bg-gradient-to-br from-lovers-primary to-lovers-secondary' 
                  : 'bg-gradient-to-br from-general-primary to-general-secondary'
                } text-white text-sm
              `}>
                {senderName[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            {isOnline && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background animate-pulse" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{senderName}</p>
            <p className="text-xs text-muted-foreground truncate">@{senderUsername}</p>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground mt-1">
          {isLoversMode ? '💕 wants to connect with you' : 'sent you a friend request'}
        </p>
      </div>

      {/* Action buttons */}
      {showActions && (
        <div className="flex gap-2 shrink-0">
          <Button
            size="sm"
            onClick={onAccept}
            className={`
              ${isLoversMode 
                ? 'bg-lovers-primary hover:bg-lovers-primary/80' 
                : 'bg-general-primary hover:bg-general-primary/80'
              }
            `}
          >
            <Check className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onDecline}
            className="border-muted-foreground/30 hover:bg-destructive/10 hover:border-destructive"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
