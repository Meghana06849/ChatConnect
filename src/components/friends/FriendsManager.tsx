import React, { useState } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Search, 
  UserPlus, 
  Users, 
  QrCode, 
  Heart, 
  Phone, 
  Mail,
  Check,
  X,
  UserCheck,
  UserX
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Friend {
  id: string;
  name: string;
  username: string;
  email?: string;
  phone?: string;
  avatar?: string;
  isOnline: boolean;
  mutualFriends: number;
  status: 'friend' | 'pending' | 'requested' | 'blocked';
}

interface PartnerRequest {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  timestamp: Date;
}

export const FriendsManager: React.FC = () => {
  const { mode } = useChat();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [addFriendQuery, setAddFriendQuery] = useState('');
  const isLoversMode = mode === 'lovers';

  // Real friends data will be loaded from database
  const [friends, setFriends] = useState<Friend[]>([]);
  const [partnerRequests, setPartnerRequests] = useState<PartnerRequest[]>([]);

  // TODO: Load real friends data from database
  // useEffect(() => {
  //   const loadFriends = async () => {
  //     // Load from Supabase contacts table
  //   };
  //   loadFriends();
  // }, []);

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFriendAction = (friendId: string, action: 'accept' | 'decline' | 'block' | 'unblock') => {
    setFriends(prev => prev.map(friend => {
      if (friend.id === friendId) {
        switch (action) {
          case 'accept':
            return { ...friend, status: 'friend' };
          case 'decline':
            return { ...friend, status: 'blocked' };
          case 'block':
            return { ...friend, status: 'blocked' };
          case 'unblock':
            return { ...friend, status: 'friend' };
          default:
            return friend;
        }
      }
      return friend;
    }));

    toast({
      title: "Friend request updated",
      description: `Request ${action}ed successfully`
    });
  };

  const sendPartnerRequest = (requestId: string) => {
    setPartnerRequests(prev => prev.filter(req => req.id !== requestId));
    toast({
      title: "Partner request sent!",
      description: "Waiting for acceptance to enable Lovers Mode"
    });
  };

  return (
    <div className="flex-1 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Users className={`w-16 h-16 mx-auto mb-4 ${isLoversMode ? 'text-lovers-primary' : 'text-general-primary'}`} />
          <h1 className="text-3xl font-bold mb-2">
            {isLoversMode ? 'Partner & Friends' : 'Friends'}
          </h1>
          <p className="text-muted-foreground">
            {isLoversMode ? 'Manage your partner connection and friends' : 'Connect with people you know'}
          </p>
        </div>

        {/* Search and Add */}
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
                  placeholder="Username, email, or phone number"
                  className="glass border-white/20"
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" className="glass border-white/20">
                    <QrCode className="w-4 h-4 mr-2" />
                    QR Code
                  </Button>
                  <Button variant="outline" className="glass border-white/20">
                    <Phone className="w-4 h-4 mr-2" />
                    Contacts
                  </Button>
                </div>
                
                <Button 
                  className={`w-full ${isLoversMode ? 'btn-lovers' : 'btn-general'}`}
                  disabled={!addFriendQuery.trim()}
                >
                  Send Request
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="friends" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 glass border-white/20">
            <TabsTrigger value="friends">Friends</TabsTrigger>
            <TabsTrigger value="requests">Requests</TabsTrigger>
            {isLoversMode && <TabsTrigger value="partner">Partner</TabsTrigger>}
          </TabsList>

          <TabsContent value="friends" className="space-y-4">
            {filteredFriends.filter(f => f.status === 'friend').length === 0 ? (
              <Card className="glass border-white/20">
                <CardContent className="p-8 text-center">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="font-semibold mb-2">No friends yet</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Add friends by their username, email, or phone number
                  </p>
                  <Button 
                    onClick={() => setShowAddFriend(true)}
                    className={isLoversMode ? 'btn-lovers' : 'btn-general'}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Your First Friend
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredFriends.filter(f => f.status === 'friend').map((friend) => (
                <Card key={friend.id} className="glass border-white/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className={`
                            ${isLoversMode 
                              ? 'bg-gradient-to-br from-lovers-primary to-lovers-secondary text-white' 
                              : 'bg-gradient-to-br from-general-primary to-general-secondary text-white'
                            }
                          `}>
                            {friend.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-semibold">{friend.name}</h4>
                            <Badge 
                              variant={friend.isOnline ? "default" : "secondary"}
                              className={friend.isOnline ? (isLoversMode ? 'bg-lovers-primary' : 'bg-general-primary') : ''}
                            >
                              {friend.isOnline ? 'Online' : 'Offline'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">@{friend.username}</p>
                          <p className="text-xs text-muted-foreground">
                            {friend.mutualFriends} mutual friends
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" className="glass border-white/20">
                          Message
                        </Button>
                        <Button variant="ghost" size="icon">
                          <UserX className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Pending Requests</h3>
              {friends.filter(f => f.status === 'pending').map((friend) => (
                <Card key={friend.id} className="glass border-white/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className={`
                            ${isLoversMode 
                              ? 'bg-gradient-to-br from-lovers-primary to-lovers-secondary text-white' 
                              : 'bg-gradient-to-br from-general-primary to-general-secondary text-white'
                            }
                          `}>
                            {friend.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-semibold">{friend.name}</h4>
                          <p className="text-sm text-muted-foreground">@{friend.username}</p>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleFriendAction(friend.id, 'accept')}
                          className={isLoversMode ? 'btn-lovers' : 'btn-general'}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Accept
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleFriendAction(friend.id, 'decline')}
                          className="glass border-white/20"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {isLoversMode && (
            <TabsContent value="partner" className="space-y-4">
              <Card className="glass border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Heart className="w-5 h-5 text-lovers-primary animate-heart-beat" />
                    <span>Partner Connection</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Connect with your special someone to unlock exclusive Lovers Mode features.
                  </p>
                  
                  {partnerRequests.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold">Partner Requests</h4>
                      {partnerRequests.map((request) => (
                        <div key={request.id} className="flex items-center justify-between p-3 bg-lovers-primary/10 rounded-lg border border-lovers-primary/20">
                          <div className="flex items-center space-x-3">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="bg-gradient-to-br from-lovers-primary to-lovers-secondary text-white">
                                {request.name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h5 className="font-medium">{request.name}</h5>
                              <p className="text-xs text-muted-foreground">@{request.username}</p>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => sendPartnerRequest(request.id)}
                            className="btn-lovers"
                          >
                            <Heart className="w-4 h-4 mr-1" />
                            Connect
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <Button className="btn-lovers w-full">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Send Partner Request
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};