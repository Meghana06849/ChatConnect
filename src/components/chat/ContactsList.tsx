import React from 'react';
import { useChat } from '@/contexts/ChatContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Heart, MessageCircle } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: Date;
  isOnline: boolean;
  unreadCount: number;
  avatar?: string;
}

interface ContactsListProps {
  selectedContact?: Contact;
  onContactSelect: (contact: Contact) => void;
}

const generateContacts = (isLoversMode: boolean): Contact[] => {
  const generalContacts = [
    { 
      id: '1', 
      name: 'Alex Johnson', 
      lastMessage: 'Hey, are we still on for lunch tomorrow?', 
      timestamp: new Date(Date.now() - 300000),
      isOnline: true,
      unreadCount: 2
    },
    { 
      id: '2', 
      name: 'Sarah Wilson', 
      lastMessage: 'Thanks for the help with the project! 🎉', 
      timestamp: new Date(Date.now() - 1800000),
      isOnline: false,
      unreadCount: 0
    },
    { 
      id: '3', 
      name: 'Mike Chen', 
      lastMessage: 'Did you see the game last night?', 
      timestamp: new Date(Date.now() - 3600000),
      isOnline: true,
      unreadCount: 1
    },
    { 
      id: '4', 
      name: 'Team Workspace', 
      lastMessage: 'New updates available for review', 
      timestamp: new Date(Date.now() - 7200000),
      isOnline: false,
      unreadCount: 5
    }
  ];

  const loversContacts = [
    { 
      id: '1', 
      name: 'My Love 💕', 
      lastMessage: 'Missing you so much right now 🥰', 
      timestamp: new Date(Date.now() - 180000),
      isOnline: true,
      unreadCount: 3
    },
    { 
      id: '2', 
      name: 'Babe', 
      lastMessage: 'Can\'t wait to see you tonight ❤️', 
      timestamp: new Date(Date.now() - 1200000),
      isOnline: false,
      unreadCount: 0
    }
  ];

  return isLoversMode ? loversContacts : generalContacts;
};

export const ContactsList: React.FC<ContactsListProps> = ({ 
  selectedContact, 
  onContactSelect 
}) => {
  const { mode } = useChat();
  const [searchQuery, setSearchQuery] = React.useState('');
  
  const isLoversMode = mode === 'lovers';
  const contacts = generateContacts(isLoversMode);
  
  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  return (
    <div className="w-80 border-r border-white/20 glass flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/20">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center space-x-2">
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
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 glass border-white/20"
          />
        </div>
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto">
        {filteredContacts.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">No contacts found</p>
          </div>
        ) : (
          filteredContacts.map((contact) => (
            <Button
              key={contact.id}
              variant="ghost"
              onClick={() => onContactSelect(contact)}
              className={`
                w-full p-4 h-auto justify-start rounded-none border-b border-white/10
                hover:bg-white/10 transition-colors
                ${selectedContact?.id === contact.id 
                  ? `${isLoversMode 
                      ? 'bg-lovers-primary/10 border-r-2 border-r-lovers-primary' 
                      : 'bg-general-primary/10 border-r-2 border-r-general-primary'
                    }` 
                  : ''
                }
              `}
            >
              <div className="flex items-start space-x-3 w-full">
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className={`
                      ${isLoversMode 
                        ? 'bg-gradient-to-br from-lovers-primary to-lovers-secondary text-white' 
                        : 'bg-gradient-to-br from-general-primary to-general-secondary text-white'
                      }
                    `}>
                      {contact.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  {contact.isOnline && (
                    <div className={`
                      absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white
                      ${isLoversMode ? 'bg-lovers-primary' : 'bg-general-primary'}
                    `} />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-sm truncate pr-2">
                      {contact.name}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(contact.timestamp)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground truncate flex-1 pr-2">
                      {contact.lastMessage}
                    </p>
                    {contact.unreadCount > 0 && (
                      <div className={`
                        min-w-[20px] h-5 rounded-full flex items-center justify-center text-xs text-white font-medium
                        ${isLoversMode ? 'bg-lovers-primary' : 'bg-general-primary'}
                      `}>
                        {contact.unreadCount > 99 ? '99+' : contact.unreadCount}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Button>
          ))
        )}
      </div>
    </div>
  );
};