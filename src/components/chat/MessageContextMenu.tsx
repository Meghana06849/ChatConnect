import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Reply,
  Forward,
  Copy,
  Star,
  Trash2,
  Info,
  Pin,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageContextMenuProps {
  children: React.ReactNode;
  messageId: string;
  messageContent: string;
  isOwnMessage: boolean;
  isStarred?: boolean;
  isPinned?: boolean;
  messageType?: string;
  onReply: () => void;
  onForward: () => void;
  onCopy: () => void;
  onStar: () => void;
  onDelete: () => void;
  onInfo: () => void;
  onPin?: () => void;
  onDownload?: () => void;
  isLoversMode?: boolean;
}

export const MessageContextMenu: React.FC<MessageContextMenuProps> = ({
  children,
  messageId,
  messageContent,
  isOwnMessage,
  isStarred = false,
  isPinned = false,
  messageType = 'text',
  onReply,
  onForward,
  onCopy,
  onStar,
  onDelete,
  onInfo,
  onPin,
  onDownload,
  isLoversMode = false,
}) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(messageContent);
    onCopy();
  };

  const menuItemClass = cn(
    "flex items-center gap-3 cursor-pointer",
    "focus:bg-white/10"
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56 glass border-white/20">
        <ContextMenuItem onClick={onReply} className={menuItemClass}>
          <Reply className="w-4 h-4" />
          <span>Reply</span>
        </ContextMenuItem>
        
        <ContextMenuItem onClick={onForward} className={menuItemClass}>
          <Forward className="w-4 h-4" />
          <span>Forward</span>
        </ContextMenuItem>
        
        {messageType === 'text' && (
          <ContextMenuItem onClick={handleCopy} className={menuItemClass}>
            <Copy className="w-4 h-4" />
            <span>Copy</span>
          </ContextMenuItem>
        )}
        
        {(messageType === 'image' || messageType === 'video' || messageType === 'document') && onDownload && (
          <ContextMenuItem onClick={onDownload} className={menuItemClass}>
            <Download className="w-4 h-4" />
            <span>Download</span>
          </ContextMenuItem>
        )}
        
        <ContextMenuSeparator className="bg-white/10" />
        
        <ContextMenuItem onClick={onStar} className={menuItemClass}>
          <Star className={cn("w-4 h-4", isStarred && "fill-yellow-400 text-yellow-400")} />
          <span>{isStarred ? 'Unstar' : 'Star'}</span>
        </ContextMenuItem>
        
        {onPin && (
          <ContextMenuItem onClick={onPin} className={menuItemClass}>
            <Pin className={cn("w-4 h-4", isPinned && "fill-current")} />
            <span>{isPinned ? 'Unpin' : 'Pin'}</span>
          </ContextMenuItem>
        )}
        
        <ContextMenuItem onClick={onInfo} className={menuItemClass}>
          <Info className="w-4 h-4" />
          <span>Message info</span>
        </ContextMenuItem>
        
        <ContextMenuSeparator className="bg-white/10" />
        
        <ContextMenuItem 
          onClick={onDelete} 
          className={cn(menuItemClass, "text-destructive focus:text-destructive")}
        >
          <Trash2 className="w-4 h-4" />
          <span>{isOwnMessage ? 'Delete for everyone' : 'Delete for me'}</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
