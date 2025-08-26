import React from 'react';
import { useChat } from '@/contexts/ChatContext';
import { Heart, MessageSquare } from 'lucide-react';

interface NotificationToastProps {
  message: string;
  senderName: string;
  isLoversMode?: boolean;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  message,
  senderName,
  isLoversMode = false
}) => {
  return (
    <div className={`
      flex items-center space-x-3 p-4 rounded-2xl glass border-white/20 
      ${isLoversMode 
        ? 'bg-lovers-primary/10 border-lovers-primary/30' 
        : 'bg-general-primary/10 border-general-primary/30'
      }
      animate-fade-in shadow-lg
    `}>
      <div className={`
        w-10 h-10 rounded-full flex items-center justify-center
        ${isLoversMode 
          ? 'bg-gradient-to-br from-lovers-primary to-lovers-secondary' 
          : 'bg-gradient-to-br from-general-primary to-general-secondary'
        }
      `}>
        {isLoversMode ? (
          <Heart className="w-5 h-5 text-white animate-heart-beat" />
        ) : (
          <MessageSquare className="w-5 h-5 text-white" />
        )}
      </div>
      
      <div className="flex-1">
        <p className="font-medium text-sm">{senderName}</p>
        <p className="text-sm text-muted-foreground truncate">
          {isLoversMode ? '💕' : message}
        </p>
      </div>
    </div>
  );
};