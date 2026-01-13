import React from 'react';
import { X, Image, Mic, FileText, Video } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReplyPreviewProps {
  replyTo: {
    id: string;
    content: string;
    senderName: string;
    messageType?: string;
  };
  onCancel: () => void;
  isLoversMode?: boolean;
}

export const ReplyPreview: React.FC<ReplyPreviewProps> = ({
  replyTo,
  onCancel,
  isLoversMode = false,
}) => {
  const getMessagePreview = () => {
    switch (replyTo.messageType) {
      case 'image':
        return (
          <span className="flex items-center gap-1">
            <Image className="w-3 h-3" /> Photo
          </span>
        );
      case 'video':
        return (
          <span className="flex items-center gap-1">
            <Video className="w-3 h-3" /> Video
          </span>
        );
      case 'voice':
        return (
          <span className="flex items-center gap-1">
            <Mic className="w-3 h-3" /> Voice message
          </span>
        );
      case 'document':
        return (
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3" /> Document
          </span>
        );
      default:
        return replyTo.content.slice(0, 60) + (replyTo.content.length > 60 ? '...' : '');
    }
  };

  return (
    <div className={cn(
      "flex items-center gap-2 px-4 py-2 border-l-4 bg-white/5 mx-4 mb-2 rounded-r-lg",
      isLoversMode ? "border-l-lovers-primary" : "border-l-general-primary"
    )}>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-xs font-medium truncate",
          isLoversMode ? "text-lovers-primary" : "text-general-primary"
        )}>
          {replyTo.senderName}
        </p>
        <p className="text-sm text-muted-foreground truncate">
          {getMessagePreview()}
        </p>
      </div>
      <button
        onClick={onCancel}
        className="p-1 rounded-full hover:bg-white/10 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
