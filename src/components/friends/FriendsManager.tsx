import React, { useState } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { useFriendRequests } from '@/hooks/useFriendRequests';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { OnlineStatusIndicator } from './OnlineStatusIndicator';
import { 
  Search, 
  UserPlus, 
  Users, 
  Phone, 
  Mail,
  Check,
  X,
  UserX,
  Loader2,
  RefreshCw
} from 'lucide-react';

export const FriendsManager: React.FC = () => {
  const { mode } = useChat();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [addFriendQuery, setAddFriendQuery] = useState('');
  const [sending, setSending] = useState(false);
  const isLoversMode = mode === 'lovers';

  const {
    currentUserId,
    incomingRequests,
    outgoingRequests,
    friends,
    loading,
    sendRequest,
    acceptRequest,
    declineRequest,
    cancelRequest,
    removeFriend,
    refreshRequests
  } = useFriendRequests();

  // Filter friends based on search
  const filteredFriends = friends.filter(f => {
    const profile = f.userId === currentUserId ? f.receiverProfile : f.senderProfile;
    const name = profile?.displayName || '';
    const username = profile?.username || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           username.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleSendRequest = async () => {
    if (!addFriendQuery.trim()) return;
    setSending(true);
    const success = await sendRequest(addFriendQuery.trim());
    setSending(false);
    if (success) {
      setShowAddFriend(false);
      setAddFriendQuery('');
    }
  };

  const handleAccept = async (id: string) => {
    await acceptRequest(id);
  };

  const handleDecline = async (id: string) => {
    await declineRequest(id);
  };

  const handleCancel = async (id: string) => {
    await cancelRequest(id);
  };

  const handleRemove = async (id: string) => {
    await removeFriend(id);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
          
          {/* Real-time indicator */}
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-muted-foreground">Real-time updates active</span>
          </div>
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
          
          <Button
            variant="outline"
            size="icon"
            onClick={refreshRequests}
            className="glass border-white/20"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          
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
                  onKeyPress={(e) => e.key === 'Enter' && handleSendRequest()}
                  disabled={sending}
                />
                
                <Button 
                  className={`w-full ${isLoversMode ? 'btn-lovers' : 'btn-general'}`}
                  disabled={!addFriendQuery.trim() || sending}
                  onClick={handleSendRequest}
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Request'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="friends" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 glass border-white/20">
            <TabsTrigger value="friends" className="relative">
              Friends ({filteredFriends.length})
            </TabsTrigger>
            <TabsTrigger value="requests" className="relative">
              Requests
              {incomingRequests.length > 0 && (
                <Badge 
                  className={`absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs animate-notification-bounce ${
                    isLoversMode ? 'bg-lovers-primary' : 'bg-general-primary'
                  }`}
                >
                  {incomingRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending ({outgoingRequests.length})
            </TabsTrigger>
          </TabsList>

          {/* Friends Tab */}
          <TabsContent value="friends" className="space-y-4">
            {filteredFriends.length === 0 ? (
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
              filteredFriends.map((friend) => {
                const profile = friend.userId === currentUserId ? friend.receiverProfile : friend.senderProfile;
                if (!profile) return null;

                return (
                  <Card key={friend.id} className="glass border-white/20 animate-slide-in-right">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={profile.avatarUrl || undefined} />
                              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                                {profile.displayName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <OnlineStatusIndicator 
                              isOnline={profile.isOnline} 
                              className="absolute -bottom-1 -right-1"
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">{profile.displayName}</p>
                              <Badge 
                                variant={profile.isOnline ? "default" : "secondary"}
                                className={profile.isOnline ? 'bg-green-500' : ''}
                              >
                                {profile.isOnline ? 'Online' : 'Offline'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">@{profile.username}</p>
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
                            onClick={() => handleRemove(friend.id)}
                          >
                            <UserX className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* Incoming Requests Tab */}
          <TabsContent value="requests" className="space-y-3">
            {incomingRequests.length === 0 ? (
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
              incomingRequests.map((request) => {
                const profile = request.senderProfile;
                if (!profile) return null;

                return (
                  <Card key={request.id} className="glass border-white/20 animate-slide-in-right">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={profile.avatarUrl || undefined} />
                              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                                {profile.displayName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <OnlineStatusIndicator 
                              isOnline={profile.isOnline} 
                              className="absolute -bottom-1 -right-1"
                            />
                          </div>
                          <div>
                            <p className="font-semibold">{profile.displayName}</p>
                            <p className="text-sm text-muted-foreground">@{profile.username}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              {profile.isOnline ? (
                                <span className="text-green-500">● Online now</span>
                              ) : (
                                'Sent you a friend request'
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            className={isLoversMode ? 'bg-lovers-primary hover:bg-lovers-primary/80' : ''}
                            onClick={() => handleAccept(request.id)}
                          >
                            <Check className="w-4 h-4 mr-1" /> Accept
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleDecline(request.id)}
                          >
                            <X className="w-4 h-4 mr-1" /> Decline
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* Outgoing Pending Tab */}
          <TabsContent value="pending" className="space-y-3">
            {outgoingRequests.length === 0 ? (
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
              outgoingRequests.map((request) => {
                const profile = request.receiverProfile;
                if (!profile) return null;

                return (
                  <Card key={request.id} className="glass border-white/20 animate-slide-in-right">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={profile.avatarUrl || undefined} />
                              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                                {profile.displayName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <OnlineStatusIndicator 
                              isOnline={profile.isOnline} 
                              className="absolute -bottom-1 -right-1"
                            />
                          </div>
                          <div>
                            <p className="font-semibold">{profile.displayName}</p>
                            <p className="text-sm text-muted-foreground">@{profile.username}</p>
                            <p className="text-xs text-muted-foreground">
                              {profile.isOnline ? (
                                <span className="text-green-500">● Currently online</span>
                              ) : (
                                'Awaiting response...'
                              )}
                            </p>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleCancel(request.id)}
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <X className="w-4 h-4 mr-1" /> Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
