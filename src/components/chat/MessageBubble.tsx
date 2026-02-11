import React from 'react';
import { HeartReadReceipt } from './HeartReadReceipt';
import { MessageReactions } from './MessageReactions';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';
import { MessageContextMenu } from './MessageContextMenu';
import { Image, FileText, Video, MapPin, Play, Download, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Reaction {
  emoji: string;
  user_id: string;
}

interface ReplyInfo {
  id: string;
  content: string;
  senderName: string;
  messageType?: string;
}

interface MessageBubbleProps {
  id: string;
  content: string;
  senderId: string;
  currentUserId: string | null;
  messageType: string;
  createdAt: string;
  readAt?: string | null;
  deliveredAt?: string | null;
  reactions: Reaction[];
  metadata?: any;
  replyTo?: ReplyInfo | null;
  isStarred?: boolean;
  isLoversMode?: boolean;
  onReply: () => void;
  onForward: () => void;
  onReaction: (emoji: string) => void;
  onStar: () => void;
  onDelete: () => void;
  onInfo: () => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  id,
  content,
  senderId,
  currentUserId,
  messageType,
  createdAt,
  readAt,
  deliveredAt,
  reactions,
  metadata,
  replyTo,
  isStarred = false,
  isLoversMode = false,
  onReply,
  onForward,
  onReaction,
  onStar,
  onDelete,
  onInfo,
}) => {
  const isOwnMessage = senderId === currentUserId;
  
  const getMessageStatus = (): 'sending' | 'sent' | 'delivered' | 'seen' => {
    if (readAt) return 'seen';
    if (deliveredAt) return 'delivered';
    if (id) return 'sent';
    return 'sending';
  };

  // Get image/media URL - check both content and metadata
  const getMediaUrl = (): string | null => {
    if (metadata?.imageUrl) return metadata.imageUrl;
    if (metadata?.audioUrl) return metadata.audioUrl;
    if (metadata?.videoUrl) return metadata.videoUrl;
    // Media uploads store URL in content field
    if (content && (content.startsWith('http://') || content.startsWith('https://'))) {
      return content;
    }
    return null;
  };

  const renderContent = () => {
    const mediaUrl = getMediaUrl();
    
    switch (messageType) {
      case 'voice':
        return mediaUrl ? (
          <VoiceMessagePlayer
            audioUrl={mediaUrl}
            duration={metadata?.duration}
            isOwnMessage={isOwnMessage}
            isLoversMode={isLoversMode}
          />
        ) : (
          <p className="text-sm italic">🎤 Voice message</p>
        );
        
      case 'image':
        return (
          <div className="relative rounded-lg overflow-hidden max-w-[280px]">
            {mediaUrl ? (
              <a href={mediaUrl} target="_blank" rel="noopener noreferrer">
                <img 
                  src={mediaUrl} 
                  alt={metadata?.filename || "Shared image"} 
                  className="w-full h-auto max-h-[300px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  loading="lazy"
                />
              </a>
            ) : (
              <div className="w-full h-32 bg-white/10 flex items-center justify-center">
                <Image className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            {metadata?.filename && (
              <p className="mt-1 text-xs opacity-70">{metadata.filename}</p>
            )}
          </div>
        );
        
      case 'video':
        return (
          <div className="relative rounded-lg overflow-hidden max-w-[280px]">
            {mediaUrl ? (
              <video 
                src={mediaUrl} 
                controls 
                className="w-full max-h-[300px] rounded-lg"
                preload="metadata"
              />
            ) : (
              <div className="w-full h-32 bg-black/50 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <Play className="w-6 h-6 text-white fill-white" />
                </div>
              </div>
            )}
            {metadata?.filename && (
              <p className="mt-1 text-xs opacity-70">{metadata.filename}</p>
            )}
          </div>
        );
        
      case 'document':
        return (
          <a 
            href={mediaUrl || '#'} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-white/5 rounded-lg min-w-[200px] hover:bg-white/10 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {metadata?.filename || 'Document'}
              </p>
              <p className="text-xs text-muted-foreground">
                {metadata?.size ? `${(metadata.size / 1024).toFixed(1)} KB` : 'File'}
              </p>
            </div>
            <Download className="w-4 h-4 shrink-0 opacity-60" />
          </a>
        );
        
      case 'location':
        const locationUrl = content.startsWith('http') ? content : null;
        return (
          <a 
            href={locationUrl || '#'} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <MapPin className="w-5 h-5 text-green-500 shrink-0" />
            <div>
              <p className="text-sm font-medium">📍 Shared location</p>
              <p className="text-xs text-blue-400 underline">Open in Maps</p>
            </div>
            <ExternalLink className="w-3 h-3 ml-auto opacity-60" />
          </a>
        );

      case 'contact':
        return (
          <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg">
            <p className="text-sm whitespace-pre-wrap">{content}</p>
          </div>
        );
        
      default:
        return <p className="break-words whitespace-pre-wrap">{content}</p>;
    }
  };

  return (
    <div className={cn("flex", isOwnMessage ? "justify-end" : "justify-start")}>
      <MessageContextMenu
        messageId={id}
        messageContent={content}
        isOwnMessage={isOwnMessage}
        isStarred={isStarred}
        messageType={messageType}
        onReply={onReply}
        onForward={onForward}
        onCopy={() => {}}
        onStar={onStar}
        onDelete={onDelete}
        onInfo={onInfo}
        isLoversMode={isLoversMode}
      >
        <div className="relative group max-w-[75%]">
          {/* Reply reference */}
          {replyTo && (
            <div className={cn(
              "text-xs px-3 py-1.5 mb-1 rounded-t-2xl border-l-2",
              isOwnMessage
                ? isLoversMode
                  ? "bg-lovers-primary/30 border-lovers-secondary"
                  : "bg-general-primary/30 border-general-secondary"
                : "bg-white/20 border-white/40"
            )}>
              <p className="font-medium truncate">{replyTo.senderName}</p>
              <p className="truncate opacity-80">{replyTo.content.slice(0, 40)}...</p>
            </div>
          )}

          {/* Forwarded label */}
          {metadata?.forwarded && (
            <div className="text-[10px] text-muted-foreground italic px-4 mb-0.5">
              ↗ Forwarded
            </div>
          )}
          
          {/* Main bubble */}
          <div
            className={cn(
              "rounded-2xl px-4 py-2.5 shadow-lg transition-all",
              replyTo ? "rounded-t-lg" : "",
              isOwnMessage
                ? isLoversMode
                  ? "bg-gradient-to-br from-lovers-primary to-lovers-secondary text-white"
                  : "bg-gradient-to-br from-general-primary to-general-secondary text-white"
                : "bg-white/90 backdrop-blur-sm text-foreground"
            )}
          >
            {renderContent()}
            
            {/* Reactions */}
            {reactions.length > 0 && (
              <MessageReactions
                reactions={reactions}
                currentUserId={currentUserId || undefined}
                onReactionClick={onReaction}
                isLoversMode={isLoversMode}
              />
            )}
            
            {/* Timestamp and status */}
            <div className="flex items-center justify-end gap-1 mt-1">
              {isStarred && <span className="text-xs">⭐</span>}
              <span className={cn(
                "text-[10px]",
                isOwnMessage ? "text-white/70" : "text-muted-foreground"
              )}>
                {new Date(createdAt).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
              {isOwnMessage && (
                <HeartReadReceipt
                  status={getMessageStatus()}
                  isLoversMode={isLoversMode}
                  seenAt={readAt || undefined}
                />
              )}
            </div>
          </div>
        </div>
      </MessageContextMenu>
    </div>
  );
};
