import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LastSeenStatus } from './LastSeenStatus';
import { VerificationBadge } from '@/components/profile/VerificationBadge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Phone, 
  Video, 
  MoreVertical, 
  Search, 
  Bell, 
  BellOff,
  Trash2,
  Ban,
  Image,
  Star,
  Users,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatHeaderProps {
  contact: {
    id: string;
    name: string;
    avatar?: string;
    isOnline: boolean;
    lastSeen?: string | null;
    isVerified?: boolean;
    verificationType?: string;
  };
  isTyping?: boolean;
  typingText?: string;
  isMuted?: boolean;
  isLoversMode?: boolean;
  onCall?: () => void;
  onVideoCall?: () => void;
  onSearch?: () => void;
  onMuteToggle?: () => void;
  onViewMedia?: () => void;
  onViewStarred?: () => void;
  onBlock?: () => void;
  onClearChat?: () => void;
  onBack?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  contact,
  isTyping = false,
  typingText,
  isMuted = false,
  isLoversMode = false,
  onCall,
  onVideoCall,
  onSearch,
  onMuteToggle,
  onViewMedia,
  onViewStarred,
  onBlock,
  onClearChat,
  onBack,
}) => {
  return (
    <div className="p-3 border-b border-white/20 glass">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="rounded-full hover:bg-white/10 md:hidden"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          
          <div className="relative">
            <Avatar className="w-10 h-10 ring-2 ring-white/20">
              {contact.avatar && <AvatarImage src={contact.avatar} />}
              <AvatarFallback className={cn(
                isLoversMode
                  ? "bg-gradient-to-br from-lovers-primary to-lovers-secondary text-white"
                  : "bg-gradient-to-br from-general-primary to-general-secondary text-white"
              )}>
                {contact.name[0]}
              </AvatarFallback>
            </Avatar>
            {contact.isOnline && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-sm truncate">{contact.name}</h3>
              {contact.isVerified && (
                <VerificationBadge 
                  isVerified={true} 
                  verificationType={contact.verificationType} 
                />
              )}
              {isMuted && (
                <BellOff className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </div>
            <LastSeenStatus
              isOnline={contact.isOnline}
              lastSeen={contact.lastSeen}
              isTyping={isTyping}
              isLoversMode={isLoversMode}
            />
          </div>
        </div>

        <div className="flex items-center gap-1">
          {onVideoCall && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onVideoCall}
              className="rounded-full hover:bg-white/10"
            >
              <Video className="w-5 h-5" />
            </Button>
          )}
          
          {onCall && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onCall}
              className="rounded-full hover:bg-white/10"
            >
              <Phone className="w-5 h-5" />
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-white/10"
              >
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 glass border-white/20">
              {onSearch && (
                <DropdownMenuItem onClick={onSearch} className="gap-3">
                  <Search className="w-4 h-4" />
                  Search in chat
                </DropdownMenuItem>
              )}
              
              {onViewMedia && (
                <DropdownMenuItem onClick={onViewMedia} className="gap-3">
                  <Image className="w-4 h-4" />
                  Media, links & docs
                </DropdownMenuItem>
              )}
              
              {onViewStarred && (
                <DropdownMenuItem onClick={onViewStarred} className="gap-3">
                  <Star className="w-4 h-4" />
                  Starred messages
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator className="bg-white/10" />
              
              {onMuteToggle && (
                <DropdownMenuItem onClick={onMuteToggle} className="gap-3">
                  {isMuted ? (
                    <>
                      <Bell className="w-4 h-4" />
                      Unmute notifications
                    </>
                  ) : (
                    <>
                      <BellOff className="w-4 h-4" />
                      Mute notifications
                    </>
                  )}
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator className="bg-white/10" />
              
              {onClearChat && (
                <DropdownMenuItem onClick={onClearChat} className="gap-3 text-destructive">
                  <Trash2 className="w-4 h-4" />
                  Clear chat
                </DropdownMenuItem>
              )}
              
              {onBlock && (
                <DropdownMenuItem onClick={onBlock} className="gap-3 text-destructive">
                  <Ban className="w-4 h-4" />
                  Block contact
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};
