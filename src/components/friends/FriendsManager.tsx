import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '@/contexts/ChatContext';
import { useFriendRequests } from '@/hooks/useFriendRequests';
import { useBlockedUsers } from '@/hooks/useBlockedUsers';
import { useRealTimeChat } from '@/hooks/useRealTimeChat';
import { useCall } from '@/components/features/CallProvider';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { OnlineStatusIndicator } from './OnlineStatusIndicator';
import { FriendSuggestions } from './FriendSuggestions';
import { BlockedUsersManager } from './BlockedUsersManager';
import { NotificationSettings } from './NotificationSettings';
import { VerificationBadge } from '@/components/profile/VerificationBadge';
import { UserSearchAutocomplete } from '@/components/features/UserSearchAutocomplete';
import { useToast } from '@/hooks/use-toast';
import {
  Search,
  UserPlus,
  Users,
  Phone,
  Video,
  MessageSquare,
  Check,
  X,
  UserX,
  Loader2,
  RefreshCw,
  MoreVertical,
  ShieldOff,
  VolumeX,
  Sparkles,
  Heart,
} from 'lucide-react';

export const FriendsManager: React.FC = () => {
  const { mode } = useChat();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile: currentProfile, linkLoversPartner } = useProfile();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [addFriendQuery, setAddFriendQuery] = useState('');
  const [sending, setSending] = useState(false);
  const [startingChat, setStartingChat] = useState<string | null>(null);
  const [linkingPartnerId, setLinkingPartnerId] = useState<string | null>(null);
  const isLoversMode = mode === 'lovers';
  const linkedPartnerId = currentProfile?.lovers_partner_id || null;

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

  const { createConversation } = useRealTimeChat(isLoversMode);
  const { blockUser, muteUser } = useBlockedUsers();
  const { startCall, isCallActive } = useCall();

  // Handle voice call
  const handleVoiceCall = async (friendUserId: string, friendName: string) => {
    if (isCallActive) {
      toast({
        title: "Call in progress",
        description: "Please end the current call first",
        variant: "destructive"
      });
      return;
    }
    await startCall(friendUserId, friendName, false);
  };

  // Handle video call
  const handleVideoCall = async (friendUserId: string, friendName: string) => {
    if (isCallActive) {
      toast({
        title: "Call in progress",
        description: "Please end the current call first",
        variant: "destructive"
      });
      return;
    }
    await startCall(friendUserId, friendName, true);
  };

  const isLoversEligible = (friendUserId: string, friendProfile?: { loversModeEnabled?: boolean }) => {
    if (linkedPartnerId && friendUserId === linkedPartnerId) return true;
    return Boolean(friendProfile?.loversModeEnabled);
  };

  const isGeneralEligible = (friendUserId: string, friendProfile?: { loversModeEnabled?: boolean }) => {
    // Keep General and Lovers lists disjoint.
    return !isLoversEligible(friendUserId, friendProfile);
  };

  // Filter friends based on mode + search
  const filteredFriends = friends.filter(f => {
    const profile = f.userId === currentUserId ? f.receiverProfile : f.senderProfile;
    const friendUserId = f.userId === currentUserId ? f.contactUserId : f.userId;

    if (isLoversMode) {
      if (!isLoversEligible(friendUserId, profile)) return false;
    } else {
      if (!isGeneralEligible(friendUserId, profile)) return false;
    }

    const name = profile?.displayName || '';
    const username = profile?.username || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           username.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredIncomingRequests = incomingRequests.filter((request) => {
    const senderId = request.userId;
    return isLoversMode
      ? isLoversEligible(senderId, request.senderProfile)
      : isGeneralEligible(senderId, request.senderProfile);
  });

  const filteredOutgoingRequests = outgoingRequests.filter((request) => {
    const targetId = request.contactUserId;
    return isLoversMode
      ? isLoversEligible(targetId, request.receiverProfile)
      : isGeneralEligible(targetId, request.receiverProfile);
  });

  // Start or continue conversation with friend
  const handleStartConversation = async (friendUserId: string) => {
    if (!currentUserId) return;
    
    setStartingChat(friendUserId);
    try {
      // Check if conversation already exists
      const { data: existingParticipants } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', currentUserId);

      if (existingParticipants && existingParticipants.length > 0) {
        const conversationIds = existingParticipants.map(p => p.conversation_id);
        
        // Check if friend is in any of these conversations
        const { data: friendParticipants } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', friendUserId)
          .in('conversation_id', conversationIds);

        if (friendParticipants && friendParticipants.length > 0) {
          // Conversation exists, navigate to chats
          toast({
            title: "Opening chat",
            description: "Redirecting to your conversation...",
          });
          // Navigate to dashboard with chat section
          window.location.href = '/dashboard?section=chats&contact=' + friendUserId;
          return;
        }
      }

      // Create new conversation
      await createConversation([friendUserId], isLoversMode);
      toast({
        title: "Chat started!",
        description: "New conversation created. Redirecting...",
      });
      window.location.href = '/dashboard?section=chats&contact=' + friendUserId;
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start conversation",
        variant: "destructive",
      });
    } finally {
      setStartingChat(null);
    }
  };

  const handleLinkPartner = useCallback(async (friendUserId: string, friendName: string) => {
    if (!isLoversMode) return;

    setLinkingPartnerId(friendUserId);
    try {
      const linked = await linkLoversPartner(friendUserId);
      if (linked) {
        toast({
          title: 'Dream partner linked 💞',
          description: `${friendName} is now linked for Dream Room chat and calls.`,
        });
      }
    } finally {
      setLinkingPartnerId(null);
    }
  }, [isLoversMode, linkLoversPartner, toast]);

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
                <div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Search for users by name or username
                  </p>
                  <UserSearchAutocomplete
                    placeholder="Type to search users..."
                    isLoversMode={isLoversMode}
                    onSelect={(user) => {
                      setAddFriendQuery(user.user_id);
                    }}
                    onSendRequest={async (userId, displayName) => {
                      setSending(true);
                      const success = await sendRequest(userId);
                      setSending(false);
                      if (success) {
                        setShowAddFriend(false);
                        setAddFriendQuery('');
                      }
                    }}
                    showSendButton={true}
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or enter manually</span>
                  </div>
                </div>

                <div>
                  <Input
                    value={addFriendQuery}
                    onChange={(e) => setAddFriendQuery(e.target.value)}
                    placeholder="Username or User ID (e.g. abc123-...)"
                    className="glass border-white/20"
                    onKeyPress={(e) => e.key === 'Enter' && handleSendRequest()}
                    disabled={sending}
                  />
                </div>

                {currentUserId && (
                  <div className="p-3 bg-muted/20 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Your User ID (share with friends):</p>
                    <code className="text-xs font-mono break-all select-all">{currentUserId}</code>
                  </div>
                )}
                
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

        {/* Notification Settings */}
        <NotificationSettings />

        <Tabs defaultValue="friends" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 glass border-white/20">
            <TabsTrigger value="friends" className="relative text-xs sm:text-sm">
              Friends ({filteredFriends.length})
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="relative text-xs sm:text-sm">
              <Sparkles className="w-3 h-3 mr-1 hidden sm:inline" />
              Discover
            </TabsTrigger>
            <TabsTrigger value="requests" className="relative text-xs sm:text-sm">
              Requests
              {filteredIncomingRequests.length > 0 && (
                <Badge 
                  className={`absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs animate-notification-bounce ${
                    isLoversMode ? 'bg-lovers-primary' : 'bg-general-primary'
                  }`}
                >
                  {filteredIncomingRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs sm:text-sm">
              Pending ({filteredOutgoingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="blocked" className="text-xs sm:text-sm">
              <ShieldOff className="w-3 h-3 mr-1 hidden sm:inline" />
              Blocked
            </TabsTrigger>
          </TabsList>

          {/* Friends Tab */}
          <TabsContent value="friends" className="space-y-4">
            {isLoversMode && (
              <Card className="glass border-lovers-primary/20 bg-lovers-primary/5">
                <CardContent className="p-3 text-sm text-muted-foreground flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-lovers-secondary flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-lovers-secondary">Dream Partner Status:</span> 
                    <span> </span>
                    💞 = Linked & active
                    <span> • </span>
                    ⏳ = You're waiting for them to link back
                  </div>
                </CardContent>
              </Card>
            )}
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

                const friendUserId = friend.userId === currentUserId ? friend.contactUserId : friend.userId;
                const isLinkedDreamPartner = linkedPartnerId === friendUserId;

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
                                {profile.isVerified && (
                                  <VerificationBadge 
                                    isVerified={profile.isVerified} 
                                    verificationType={profile.verificationType}
                                    size="sm"
                                  />
                                )}
                                <Badge 
                                  variant={profile.isOnline ? "default" : "secondary"}
                                  className={profile.isOnline ? 'bg-green-500' : ''}
                                >
                                  {profile.isOnline ? 'Online' : 'Offline'}
                                </Badge>
                                {isLoversMode && isLinkedDreamPartner && (
                                  <Badge className="bg-lovers-primary/20 text-lovers-primary border-lovers-primary/40 animate-pulse">
                                    <Heart className="w-3 h-3 mr-1" />
                                    💞 Dream Partner
                                  </Badge>
                                )}
                                {isLoversMode && currentProfile?.lovers_partner_id === friendUserId && !isLinkedDreamPartner && (
                                  <Badge className="bg-lovers-secondary/20 text-lovers-secondary border-lovers-secondary/40">
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    Pending Your Link
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">@{profile.username}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {isLoversMode && (
                              <Button
                                size="sm"
                                variant={isLinkedDreamPartner ? 'secondary' : 'outline'}
                                title={
                                  isLinkedDreamPartner 
                                    ? '💞 Linked! Dream Room chat & calls active'
                                    : currentProfile?.lovers_partner_id === friendUserId
                                      ? `⏳ Waiting for ${profile.displayName} to link back to activate Dream Room`
                                      : linkedPartnerId && !isLinkedDreamPartner
                                        ? `Already linked with someone else`
                                        : `Link ${profile.displayName} as Dream Room partner`
                                }
                                onClick={() => handleLinkPartner(friendUserId, profile.displayName)}
                                disabled={
                                  linkingPartnerId === friendUserId ||
                                  (Boolean(linkedPartnerId) && !isLinkedDreamPartner)
                                }
                              >
                                {linkingPartnerId === friendUserId ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Heart className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="outline" 
                              title="Voice Call"
                              onClick={() => handleVoiceCall(friendUserId, profile.displayName)}
                              disabled={isCallActive}
                            >
                              <Phone className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              title="Video Call"
                              onClick={() => handleVideoCall(friendUserId, profile.displayName)}
                              disabled={isCallActive}
                            >
                              <Video className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              title="Message"
                              onClick={() => handleStartConversation(friendUserId)}
                              disabled={startingChat === friendUserId}
                            >
                              {startingChat === friendUserId ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <MessageSquare className="w-4 h-4" />
                              )}
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="outline">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleRemove(friend.id)} className="text-destructive">
                                <UserX className="w-4 h-4 mr-2" />
                                Remove Friend
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => blockUser(friendUserId)}>
                                <ShieldOff className="w-4 h-4 mr-2" />
                                Block User
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => muteUser(friendUserId)}>
                                <VolumeX className="w-4 h-4 mr-2" />
                                Mute User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
            {filteredIncomingRequests.length === 0 ? (
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
              filteredIncomingRequests.map((request) => {
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
            {filteredOutgoingRequests.length === 0 ? (
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
              filteredOutgoingRequests.map((request) => {
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

          {/* Blocked Users Tab */}
          <TabsContent value="blocked">
            <BlockedUsersManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
