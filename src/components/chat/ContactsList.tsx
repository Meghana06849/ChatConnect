import React, { useEffect, useState } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { useRealTimeChat } from '@/hooks/useRealTimeChat';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { VerificationBadge } from '@/components/profile/VerificationBadge';
import { 
  Search, 
  Heart, 
  MessageCircle, 
  Image, 
  Mic, 
  Video, 
  FileText,
  Check,
  CheckCheck,
} from 'lucide-react';
import { MessageSearch } from './MessageSearch';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface Contact {
  id: string;
  name: string;
  lastMessage: string;
  lastMessageType?: string;
  timestamp: Date;
  isOnline: boolean;
  unreadCount: number;
  avatar?: string;
  conversationId?: string;
  lastSeen?: string | null;
  isVerified?: boolean;
  verificationType?: string;
  isMuted?: boolean;
  isPinned?: boolean;
  isTyping?: boolean;
}

interface ContactsListProps {
  selectedContact?: Contact;
  onContactSelect: (contact: Contact) => void;
}

export const ContactsList: React.FC<ContactsListProps> = ({ 
  selectedContact, 
  onContactSelect 
}) => {
  const { mode } = useChat();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const isLoversMode = mode === 'lovers';
  const { conversations, loading } = useRealTimeChat(isLoversMode);

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    loadUser();
  }, []);

  // Transform conversations to contacts format
  const contacts: Contact[] = conversations.map(conv => {
    const otherParticipant = conv.conversation_participants.find(
      p => p.user_id !== currentUserId
    );
    
    return {
      id: conv.id,
      conversationId: conv.id,
      name: otherParticipant?.profiles?.display_name || conv.name || 'Unknown',
      lastMessage: '',
      lastMessageType: 'text',
      timestamp: new Date(),
      isOnline: otherParticipant?.profiles?.is_online || false,
      unreadCount: 0,
      avatar: otherParticipant?.profiles?.avatar_url,
      lastSeen: otherParticipant?.profiles?.last_seen,
      isVerified: otherParticipant?.profiles?.is_verified,
      verificationType: otherParticipant?.profiles?.verification_type,
    };
  });
  
  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort: pinned first, then by timestamp
  const sortedContacts = [...filteredContacts].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.timestamp.getTime() - a.timestamp.getTime();
  });

  const getLastMessagePreview = (contact: Contact) => {
    if (contact.isTyping) {
      return (
        <span className={cn(
          "animate-pulse",
          isLoversMode ? "text-lovers-primary" : "text-general-primary"
        )}>
          typing...
        </span>
      );
    }

    if (!contact.lastMessage) {
      return contact.isOnline ? 'Online' : 'Tap to chat';
    }

    const icons: Record<string, React.ReactNode> = {
      image: <Image className="w-3 h-3 mr-1 inline" />,
      video: <Video className="w-3 h-3 mr-1 inline" />,
      voice: <Mic className="w-3 h-3 mr-1 inline" />,
      document: <FileText className="w-3 h-3 mr-1 inline" />,
    };

    return (
      <span className="flex items-center">
        {icons[contact.lastMessageType || 'text']}
        {contact.lastMessage.slice(0, 30)}{contact.lastMessage.length > 30 ? '...' : ''}
      </span>
    );
  };

  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return timestamp.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="w-full md:w-80 border-r border-white/20 glass flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/20 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            {isLoversMode ? (
              <>
                <Heart className="w-5 h-5 text-lovers-primary animate-heart-beat" />
                <span>Love Chats</span>
              </>
            ) : (
              <>
                <MessageCircle className="w-5 h-5 text-general-primary" />
                <span>Chats</span>
              </>
            )}
          </h2>
          
          <Sheet>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="hover:bg-white/10 rounded-full"
              >
                <Search className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[350px] p-0 glass border-white/20">
              <MessageSearch 
                onResultClick={(conversationId) => {
                  const contact = contacts.find(c => c.conversationId === conversationId);
                  if (contact) onContactSelect(contact);
                }}
              />
            </SheetContent>
          </Sheet>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-full glass border-white/20 text-sm"
          />
        </div>
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : sortedContacts.length === 0 ? (
          <div className="p-8 text-center">
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4",
              isLoversMode 
                ? "bg-lovers-primary/10" 
                : "bg-general-primary/10"
            )}>
              <MessageCircle className={cn(
                "w-8 h-8",
                isLoversMode ? "text-lovers-primary" : "text-general-primary"
              )} />
            </div>
            <h3 className="font-semibold mb-2">No conversations yet</h3>
            <p className="text-muted-foreground text-sm">
              {isLoversMode 
                ? 'Start a romantic conversation'
                : 'Add friends and start chatting!'}
            </p>
          </div>
        ) : (
          sortedContacts.map((contact) => (
            <button
              key={contact.id}
              onClick={() => onContactSelect(contact)}
              className={cn(
                "w-full p-3 flex items-center gap-3 transition-all",
                "hover:bg-white/5 active:bg-white/10",
                "border-b border-white/5",
                selectedContact?.id === contact.id && cn(
                  "bg-white/10",
                  isLoversMode 
                    ? "border-l-2 border-l-lovers-primary" 
                    : "border-l-2 border-l-general-primary"
                )
              )}
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                <Avatar className="w-12 h-12">
                  {contact.avatar && <AvatarImage src={contact.avatar} />}
                  <AvatarFallback className={cn(
                    "text-white font-medium",
                    isLoversMode 
                      ? "bg-gradient-to-br from-lovers-primary to-lovers-secondary" 
                      : "bg-gradient-to-br from-general-primary to-general-secondary"
                  )}>
                    {contact.name[0]}
                  </AvatarFallback>
                </Avatar>
                {contact.isOnline && (
                  <div className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background",
                    isLoversMode ? "bg-lovers-primary" : "bg-green-500"
                  )} />
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <h3 className="font-medium text-sm truncate">
                      {contact.name}
                    </h3>
                    {contact.isVerified && (
                      <VerificationBadge 
                        isVerified 
                        verificationType={contact.verificationType}
                        size="sm"
                      />
                    )}
                  </div>
                  <span className={cn(
                    "text-xs shrink-0 ml-2",
                    contact.unreadCount > 0 
                      ? isLoversMode ? "text-lovers-primary" : "text-general-primary"
                      : "text-muted-foreground"
                  )}>
                    {formatTime(contact.timestamp)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground truncate flex-1">
                    {getLastMessagePreview(contact)}
                  </p>
                  <div className="flex items-center gap-1.5 ml-2 shrink-0">
                    {contact.isMuted && (
                      <span className="text-xs">🔇</span>
                    )}
                    {contact.unreadCount > 0 && (
                      <Badge className={cn(
                        "h-5 min-w-[20px] px-1.5 text-xs font-bold",
                        isLoversMode 
                          ? "bg-lovers-primary text-white" 
                          : "bg-general-primary text-white"
                      )}>
                        {contact.unreadCount > 99 ? '99+' : contact.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};
