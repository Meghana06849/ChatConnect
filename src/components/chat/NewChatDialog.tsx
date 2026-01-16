import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useChat } from '@/contexts/ChatContext';
import { useRealTimeChat } from '@/hooks/useRealTimeChat';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VerificationBadge } from '@/components/profile/VerificationBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { 
  MessageSquarePlus, 
  Search, 
  Loader2, 
  Heart,
  MessageCircle,
  UserCheck,
  UserPlus,
  Users
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Contact {
  user_id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  is_online: boolean;
  is_verified?: boolean;
  verification_type?: string;
}

interface SearchResult {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_verified?: boolean;
  verification_type?: string;
}

interface NewChatDialogProps {
  onChatCreated: (contact: {
    id: string;
    name: string;
    avatar?: string;
    isOnline: boolean;
    conversationId: string;
  }) => void;
}

export const NewChatDialog: React.FC<NewChatDialogProps> = ({ onChatCreated }) => {
  const { mode } = useChat();
  const isLoversMode = mode === 'lovers';
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'contacts' | 'search'>('contacts');
  
  // Friend search state
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { createConversation } = useRealTimeChat(isLoversMode);

  // Load accepted contacts
  useEffect(() => {
    if (!open) return;
    
    const loadContacts = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get accepted contacts
        const { data: contactsData, error } = await supabase
          .from('contacts')
          .select('contact_user_id')
          .eq('user_id', user.id)
          .eq('status', 'accepted');

        if (error) throw error;

        if (contactsData && contactsData.length > 0) {
          const contactIds = contactsData.map(c => c.contact_user_id);
          
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id, display_name, username, avatar_url, is_online, is_verified, verification_type')
            .in('user_id', contactIds);

          if (profilesError) throw profilesError;
          setContacts(profiles || []);
        } else {
          setContacts([]);
        }
      } catch (error) {
        console.error('Error loading contacts:', error);
        toast({
          title: "Error loading contacts",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadContacts();
  }, [open, toast]);

  const filteredContacts = contacts.filter(contact =>
    (contact.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     contact.username?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Search for new friends
  const handleSearchUsers = async () => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use the search_profiles function
      const { data, error } = await supabase
        .rpc('search_profiles', { _query: searchQuery });

      if (error) throw error;

      // Filter out current user and existing contacts
      const existingContactIds = contacts.map(c => c.user_id);
      const filteredResults = (data || []).filter((profile: SearchResult) => 
        profile.user_id !== user.id && 
        !existingContactIds.includes(profile.user_id)
      );

      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        title: "Search failed",
        description: "Could not search for users",
        variant: "destructive"
      });
    } finally {
      setSearchLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    if (activeTab !== 'search') return;
    
    const timer = setTimeout(() => {
      handleSearchUsers();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  // Send friend request
  const sendFriendRequest = async (targetUserId: string) => {
    setSendingRequest(targetUserId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if request already exists
      const { data: existing } = await supabase
        .from('contacts')
        .select('id, status')
        .or(`and(user_id.eq.${user.id},contact_user_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},contact_user_id.eq.${user.id})`)
        .maybeSingle();

      if (existing) {
        toast({
          title: existing.status === 'pending' ? "Request already sent" : "Already friends",
          description: existing.status === 'pending' 
            ? "A friend request is already pending" 
            : "You're already friends with this user"
        });
        return;
      }

      // Create friend request
      const { error } = await supabase
        .from('contacts')
        .insert({
          user_id: user.id,
          contact_user_id: targetUserId,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Friend request sent! 🎉",
        description: "They'll be notified of your request"
      });

      // Remove from search results
      setSearchResults(prev => prev.filter(r => r.user_id !== targetUserId));
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      toast({
        title: "Failed to send request",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSendingRequest(null);
    }
  };

  const handleStartChat = async (contact: Contact) => {
    setCreating(contact.user_id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if conversation already exists
      const { data: existingConvs } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      const myConvIds = existingConvs?.map(c => c.conversation_id) || [];

      if (myConvIds.length > 0) {
        const { data: partnerConvs } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', contact.user_id)
          .in('conversation_id', myConvIds);

        if (partnerConvs && partnerConvs.length > 0) {
          // Check if any is matching the current mode
          const { data: matchingConv } = await supabase
            .from('conversations')
            .select('id')
            .eq('id', partnerConvs[0].conversation_id)
            .eq('is_lovers_conversation', isLoversMode)
            .single();

          if (matchingConv) {
            // Conversation already exists, navigate to it
            onChatCreated({
              id: contact.user_id,
              name: contact.display_name || contact.username,
              avatar: contact.avatar_url || undefined,
              isOnline: contact.is_online,
              conversationId: matchingConv.id
            });
            setOpen(false);
            return;
          }
        }
      }

      // Create new conversation
      const newConv = await createConversation([contact.user_id], isLoversMode);
      
      onChatCreated({
        id: contact.user_id,
        name: contact.display_name || contact.username,
        avatar: contact.avatar_url || undefined,
        isOnline: contact.is_online,
        conversationId: newConv.id
      });
      
      setOpen(false);
      toast({
        title: "Chat created",
        description: `Started conversation with ${contact.display_name || contact.username}`
      });
    } catch (error: any) {
      console.error('Error creating chat:', error);
      toast({
        title: "Failed to create chat",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setCreating(null);
    }
  };

  const renderContactItem = (contact: Contact) => (
    <button
      key={contact.user_id}
      onClick={() => handleStartChat(contact)}
      disabled={creating === contact.user_id}
      className={cn(
        "w-full p-3 flex items-center gap-3 rounded-xl transition-all",
        "hover:bg-white/10 active:bg-white/15",
        "disabled:opacity-50 disabled:cursor-not-allowed"
      )}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <Avatar className="w-11 h-11">
          {contact.avatar_url && <AvatarImage src={contact.avatar_url} />}
          <AvatarFallback className={cn(
            "text-white font-medium",
            isLoversMode 
              ? "bg-gradient-to-br from-lovers-primary to-lovers-secondary" 
              : "bg-gradient-to-br from-general-primary to-general-secondary"
          )}>
            {(contact.display_name || contact.username)?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {contact.is_online && (
          <div className={cn(
            "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
            isLoversMode ? "bg-lovers-primary" : "bg-green-500"
          )} />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-1.5">
          <span className="font-medium truncate">
            {contact.display_name || contact.username}
          </span>
          {contact.is_verified && (
            <VerificationBadge 
              isVerified 
              verificationType={contact.verification_type}
              size="sm"
            />
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">
          @{contact.username}
        </p>
      </div>

      {/* Loading indicator */}
      {creating === contact.user_id && (
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground shrink-0" />
      )}
    </button>
  );

  const renderSearchResult = (result: SearchResult) => (
    <div
      key={result.user_id}
      className={cn(
        "w-full p-3 flex items-center gap-3 rounded-xl",
        "bg-white/5 hover:bg-white/10 transition-all"
      )}
    >
      {/* Avatar */}
      <div className="shrink-0">
        <Avatar className="w-11 h-11">
          {result.avatar_url && <AvatarImage src={result.avatar_url} />}
          <AvatarFallback className={cn(
            "text-white font-medium",
            isLoversMode 
              ? "bg-gradient-to-br from-lovers-primary to-lovers-secondary" 
              : "bg-gradient-to-br from-general-primary to-general-secondary"
          )}>
            {(result.display_name || result.username)?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-1.5">
          <span className="font-medium truncate">
            {result.display_name || result.username}
          </span>
          {result.is_verified && (
            <VerificationBadge 
              isVerified 
              verificationType={result.verification_type}
              size="sm"
            />
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">
          @{result.username}
        </p>
      </div>

      {/* Add button */}
      <Button
        size="sm"
        variant="outline"
        onClick={() => sendFriendRequest(result.user_id)}
        disabled={sendingRequest === result.user_id}
        className={cn(
          "shrink-0",
          isLoversMode 
            ? "border-lovers-primary/50 text-lovers-primary hover:bg-lovers-primary/20" 
            : "border-general-primary/50 text-general-primary hover:bg-general-primary/20"
        )}
      >
        {sendingRequest === result.user_id ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <UserPlus className="w-4 h-4 mr-1" />
            Add
          </>
        )}
      </Button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          size="icon"
          variant="ghost"
          className={cn(
            "hover:bg-white/10 rounded-full",
            isLoversMode ? "text-lovers-primary" : "text-general-primary"
          )}
        >
          <MessageSquarePlus className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="glass border-white/20 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isLoversMode ? (
              <>
                <Heart className="w-5 h-5 text-lovers-primary" />
                <span>New Love Chat</span>
              </>
            ) : (
              <>
                <MessageCircle className="w-5 h-5 text-general-primary" />
                <span>New Chat</span>
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'contacts' | 'search')}>
          <TabsList className="grid w-full grid-cols-2 glass border-white/20">
            <TabsTrigger value="contacts" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Contacts
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Add Friends
            </TabsTrigger>
          </TabsList>

          <div className="space-y-4 mt-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={activeTab === 'contacts' ? "Search contacts..." : "Search by username..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 glass border-white/20"
              />
            </div>

            <TabsContent value="contacts" className="m-0">
              <ScrollArea className="h-[300px]">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredContacts.length === 0 ? (
                  <div className="text-center py-8">
                    <UserCheck className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-muted-foreground">
                      {searchQuery ? 'No contacts found' : 'No contacts yet'}
                    </p>
                    <p className="text-sm text-muted-foreground/70 mt-1">
                      Switch to "Add Friends" tab to find people
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab('search')}
                      className="mt-3"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Find Friends
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredContacts.map(renderContactItem)}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="search" className="m-0">
              <ScrollArea className="h-[300px]">
                {searchLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : searchQuery.length < 2 ? (
                  <div className="text-center py-8">
                    <Search className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-muted-foreground">Search for users</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">
                      Enter at least 2 characters to search
                    </p>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="text-center py-8">
                    <UserCheck className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No users found</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">
                      Try a different username
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {searchResults.map(renderSearchResult)}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
