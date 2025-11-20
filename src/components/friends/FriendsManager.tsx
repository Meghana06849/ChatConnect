import React, { useState, useEffect } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Search, 
  UserPlus, 
  Users, 
  Phone, 
  Mail,
  Check,
  X,
  UserX
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Friend {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  isOnline: boolean;
  status: 'friend' | 'pending' | 'requested';
}

export const FriendsManager: React.FC = () => {
  const { mode } = useChat();
  const [userId, setUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [addFriendQuery, setAddFriendQuery] = useState('');
  const isLoversMode = mode === 'lovers';
  const [friends, setFriends] = useState<Friend[]>([]);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data?.user?.id || null);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (!userId) return;
    
    const loadFriends = async () => {
      const { data: contacts, error } = await supabase
        .from('contacts')
        .select(`
          id,
          user_id,
          contact_user_id,
          status,
          profiles!contacts_contact_user_id_fkey(username, display_name, avatar_url, is_online)
        `)
        .or(`user_id.eq.${userId},contact_user_id.eq.${userId}`);

      if (error) {
        console.error('Error loading friends:', error);
        return;
      }

      const friendsList: Friend[] = (contacts || []).map(contact => {
        const profile = contact.profiles as any;
        const isContactUser = contact.contact_user_id === userId;
        
        return {
          id: contact.id,
          name: profile?.display_name || 'Unknown',
          username: profile?.username || 'unknown',
          avatar: profile?.avatar_url,
          isOnline: profile?.is_online || false,
          status: contact.status === 'accepted' ? 'friend' : 
                  (isContactUser ? 'requested' : 'pending')
        };
      });

      setFriends(friendsList);
    };

    loadFriends();
    
    const channel = supabase
      .channel('friend-requests')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'contacts',
          filter: `contact_user_id=eq.${userId}`
        },
        async (payload) => {
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('username, display_name')
            .eq('user_id', payload.new.user_id)
            .maybeSingle();
          
          toast({
            title: "New friend request!",
            description: `${senderProfile?.display_name || 'Someone'} sent you a friend request`
          });
          
          loadFriends();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const acceptedFriends = filteredFriends.filter(f => f.status === 'friend');
  const pendingFriends = filteredFriends.filter(f => f.status === 'pending');
  const requestedFriends = filteredFriends.filter(f => f.status === 'requested');

  const handleAcceptRequest = async (contactId: string) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .update({ status: 'accepted' })
        .eq('id', contactId);

      if (error) throw error;

      toast({
        title: "Friend request accepted!",
        description: "You are now connected"
      });

      setFriends(prev => prev.map(f => 
        f.id === contactId ? { ...f, status: 'friend' as const } : f
      ));
    } catch (error) {
      toast({
        title: "Failed to accept request",
        variant: "destructive"
      });
    }
  };

  const handleDeclineRequest = async (contactId: string) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;

      toast({
        title: "Friend request declined"
      });

      setFriends(prev => prev.filter(f => f.id !== contactId));
    } catch (error) {
      toast({
        title: "Failed to decline request",
        variant: "destructive"
      });
    }
  };

  const handleCancelRequest = async (contactId: string) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;

      toast({
        title: "Friend request cancelled"
      });

      setFriends(prev => prev.filter(f => f.id !== contactId));
    } catch (error) {
      toast({
        title: "Failed to cancel request",
        variant: "destructive"
      });
    }
  };

  const handleRemoveFriend = async (contactId: string) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;

      toast({
        title: "Friend removed"
      });

      setFriends(prev => prev.filter(f => f.id !== contactId));
    } catch (error) {
      toast({
        title: "Failed to remove friend",
        variant: "destructive"
      });
    }
  };

  const sendFriendRequest = async () => {
    if (!addFriendQuery.trim() || !userId) return;

    try {
      const { data: targetUser, error: userError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('username', addFriendQuery.trim())
        .maybeSingle();

      if (userError || !targetUser) {
        toast({
          title: "User not found",
          description: "No user exists with that username",
          variant: "destructive"
        });
        return;
      }

      if (targetUser.user_id === userId) {
        toast({
          title: "Invalid action",
          description: "You cannot add yourself as a friend",
          variant: "destructive"
        });
        return;
      }

      const { data: existing } = await supabase
        .from('contacts')
        .select('id')
        .or(`and(user_id.eq.${userId},contact_user_id.eq.${targetUser.user_id}),and(user_id.eq.${targetUser.user_id},contact_user_id.eq.${userId})`)
        .maybeSingle();

      if (existing) {
        toast({
          title: "Request exists",
          description: "You already have a connection with this user",
          variant: "destructive"
        });
        return;
      }

      const { error: insertError } = await supabase
        .from('contacts')
        .insert({
          user_id: userId,
          contact_user_id: targetUser.user_id,
          status: 'pending'
        });

      if (insertError) throw insertError;

      toast({
        title: "Friend request sent!",
        description: `Request sent to @${addFriendQuery.trim()}`
      });
      
      setShowAddFriend(false);
      setAddFriendQuery('');
    } catch (error: any) {
      toast({
        title: "Failed to send request",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex-1 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <Users className={`w-16 h-16 mx-auto mb-4 ${isLoversMode ? 'text-lovers-primary' : 'text-general-primary'}`} />
          <h1 className="text-3xl font-bold mb-2">
            {isLoversMode ? 'Partner & Friends' : 'Friends'}
          </h1>
          <p className="text-muted-foreground">
            {isLoversMode ? 'Manage your partner connection and friends' : 'Connect with people you know'}
          </p>
        </div>

        <div className="flex space-x-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search friends..."
              className="pl-10 glass border-white/20"
            />
          </div>
          
          <Dialog open={showAddFriend} onOpenChange={setShowAddFriend}>
            <DialogTrigger asChild>
              <Button className={`${isLoversMode ? 'btn-lovers' : 'btn-general'}`}>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Friend
              </Button>
            </DialogTrigger>
            <DialogContent className="glass border-white/20">
              <DialogHeader>
                <DialogTitle>Add New Friend</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  value={addFriendQuery}
                  onChange={(e) => setAddFriendQuery(e.target.value)}
                  placeholder="Enter username"
                  className="glass border-white/20"
                  onKeyPress={(e) => e.key === 'Enter' && sendFriendRequest()}
                />
                
                <Button 
                  className={`w-full ${isLoversMode ? 'btn-lovers' : 'btn-general'}`}
                  disabled={!addFriendQuery.trim()}
                  onClick={sendFriendRequest}
                >
                  Send Request
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="friends" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 glass border-white/20">
            <TabsTrigger value="friends">
              Friends ({acceptedFriends.length})
            </TabsTrigger>
            <TabsTrigger value="requests">
              Requests ({requestedFriends.length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending ({pendingFriends.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="space-y-4">
            {acceptedFriends.length === 0 ? (
              <Card className="glass border-white/20">
                <CardContent className="p-8 text-center">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="font-semibold mb-2">No friends yet</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Add friends to start connecting!
                  </p>
                  <Button onClick={() => setShowAddFriend(true)} className={isLoversMode ? 'btn-lovers' : 'btn-general'}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Your First Friend
                  </Button>
                </CardContent>
              </Card>
            ) : (
              acceptedFriends.map((friend) => (
                <Card key={friend.id} className="glass border-white/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="w-12 h-12">
                            <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                              {friend.name[0]}
                            </AvatarFallback>
                          </Avatar>
                          {friend.isOnline && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{friend.name}</p>
                            <Badge variant={friend.isOnline ? "default" : "secondary"}>
                              {friend.isOnline ? 'Online' : 'Offline'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">@{friend.username}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" title="Call">
                          <Phone className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" title="Message">
                          <Mail className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          title="Remove Friend"
                          onClick={() => handleRemoveFriend(friend.id)}
                        >
                          <UserX className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="requests" className="space-y-3">
            {requestedFriends.length === 0 ? (
              <Card className="glass border-white/20">
                <CardContent className="p-8 text-center">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="font-semibold mb-2">No pending requests</h3>
                  <p className="text-muted-foreground text-sm">
                    You don't have any friend requests at the moment.
                  </p>
                </CardContent>
              </Card>
            ) : (
              requestedFriends.map((friend) => (
                <Card key={friend.id} className="glass border-white/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="w-12 h-12">
                            <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                              {friend.name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-background" />
                        </div>
                        <div>
                          <p className="font-semibold">{friend.name}</p>
                          <p className="text-sm text-muted-foreground">@{friend.username}</p>
                          <p className="text-xs text-muted-foreground">Sent you a friend request</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="default"
                          onClick={() => handleAcceptRequest(friend.id)}
                        >
                          <Check className="w-4 h-4 mr-1" /> Accept
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDeclineRequest(friend.id)}
                        >
                          <X className="w-4 h-4 mr-1" /> Decline
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-3">
            {pendingFriends.length === 0 ? (
              <Card className="glass border-white/20">
                <CardContent className="p-8 text-center">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="font-semibold mb-2">No pending requests</h3>
                  <p className="text-muted-foreground text-sm">
                    You haven't sent any friend requests.
                  </p>
                </CardContent>
              </Card>
            ) : (
              pendingFriends.map((friend) => (
                <Card key={friend.id} className="glass border-white/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="w-12 h-12">
                            <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                              {friend.name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full border-2 border-background" />
                        </div>
                        <div>
                          <p className="font-semibold">{friend.name}</p>
                          <p className="text-sm text-muted-foreground">@{friend.username}</p>
                          <p className="text-xs text-muted-foreground">Waiting for response</p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleCancelRequest(friend.id)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
