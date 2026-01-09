import React from 'react';
import { formatLastSeen } from '@/hooks/useUserPresence';
import { cn } from '@/lib/utils';

interface LastSeenStatusProps {
  isOnline: boolean;
  lastSeen?: string | null;
  isTyping?: boolean;
  isLoversMode?: boolean;
  className?: string;
}

export const LastSeenStatus: React.FC<LastSeenStatusProps> = ({
  isOnline,
  lastSeen,
  isTyping = false,
  isLoversMode = false,
  className
}) => {
  if (isTyping) {
    return (
      <span className={cn(
        "text-sm animate-pulse",
        isLoversMode ? "text-lovers-primary" : "text-general-primary",
        className
      )}>
        {isLoversMode ? 'typing with love...' : 'typing...'}
      </span>
    );
  }

  if (isOnline) {
    return (
      <span className={cn(
        "text-sm flex items-center gap-1.5",
        isLoversMode ? "text-lovers-primary" : "text-general-primary",
        className
      )}>
        <span className={cn(
          "w-2 h-2 rounded-full animate-pulse",
          isLoversMode ? "bg-lovers-primary" : "bg-green-500"
        )} />
        Online
      </span>
    );
  }

  return (
    <span className={cn("text-sm text-muted-foreground", className)}>
      Last seen {formatLastSeen(lastSeen)}
    </span>
  );
};
