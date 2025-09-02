import React, { useState } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Users, 
  Search, 
  UserPlus, 
  Check,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Friend {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  isOnline: boolean;
}

interface CreateGroupProps {
  onClose: () => void;
  onGroupCreated: (group: any) => void;
}

export const CreateGroup: React.FC<CreateGroupProps> = ({ onClose, onGroupCreated }) => {
  const { mode } = useChat();
  const { toast } = useToast();
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const isLoversMode = mode === 'lovers';

  // Mock friends data - in real app, this would come from database
  const [friends] = useState<Friend[]>([
    { id: '1', name: 'Alex Johnson', username: 'alex_j', isOnline: true },
    { id: '2', name: 'Sarah Wilson', username: 'sarah_w', isOnline: false },
    { id: '3', name: 'Mike Chen', username: 'mike_c', isOnline: true },
    { id: '4', name: 'Emma Davis', username: 'emma_d', isOnline: true },
    { id: '5', name: 'Ryan Parker', username: 'ryan_p', isOnline: false },
  ]);

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFriendSelection = (friendId: string) => {
    const newSelected = new Set(selectedFriends);
    if (newSelected.has(friendId)) {
      newSelected.delete(friendId);
    } else {
      newSelected.add(friendId);
    }
    setSelectedFriends(newSelected);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast({
        title: "Group name required",
        description: "Please enter a name for your group",
        variant: "destructive"
      });
      return;
    }

    if (selectedFriends.size === 0) {
      toast({
        title: "Select friends",
        description: "Please select at least one friend to add to the group",
        variant: "destructive"
      });
      return;
    }

    const newGroup = {
      id: Date.now().toString(),
      name: groupName,
      description: groupDescription,
      members: Array.from(selectedFriends).map(id => friends.find(f => f.id === id)!),
      createdAt: new Date(),
    };

    onGroupCreated(newGroup);
    toast({
      title: "Group created!",
      description: `${groupName} has been created with ${selectedFriends.size} members`,
    });
    onClose();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Users className={`w-12 h-12 mx-auto mb-4 ${isLoversMode ? 'text-lovers-primary' : 'text-general-primary'}`} />
        <h2 className="text-2xl font-bold mb-2">Create New Group</h2>
        <p className="text-muted-foreground">
          Set up a group chat with your friends
        </p>
      </div>

      {/* Group Details */}
      <Card className="glass border-white/20">
        <CardHeader>
          <CardTitle>Group Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="groupName">Group Name *</Label>
            <Input
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
              className="glass border-white/20"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="groupDescription">Description (Optional)</Label>
            <Textarea
              id="groupDescription"
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              placeholder="What's this group about?"
              className="glass border-white/20"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Friend Selection */}
      <Card className="glass border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Add Friends</span>
            <Badge variant="outline" className={`${isLoversMode ? 'border-lovers-primary/50 text-lovers-primary' : 'border-general-primary/50 text-general-primary'}`}>
              {selectedFriends.size} selected
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search friends..."
              className="pl-10 glass border-white/20"
            />
          </div>

          {/* Friends List */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {filteredFriends.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-muted-foreground">No friends found</p>
              </div>
            ) : (
              filteredFriends.map((friend) => (
                <div
                  key={friend.id}
                  className={`
                    flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer
                    ${selectedFriends.has(friend.id)
                      ? `${isLoversMode ? 'bg-lovers-primary/10 border-lovers-primary/30' : 'bg-general-primary/10 border-general-primary/30'}`
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }
                  `}
                  onClick={() => toggleFriendSelection(friend.id)}
                >
                  <Checkbox
                    checked={selectedFriends.has(friend.id)}
                    onChange={() => toggleFriendSelection(friend.id)}
                    className="pointer-events-none"
                  />
                  
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
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium">{friend.name}</h4>
                      <Badge 
                        variant={friend.isOnline ? "default" : "secondary"}
                        className={friend.isOnline ? (isLoversMode ? 'bg-lovers-primary' : 'bg-general-primary') : ''}
                      >
                        {friend.isOnline ? 'Online' : 'Offline'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">@{friend.username}</p>
                  </div>

                  {selectedFriends.has(friend.id) && (
                    <Check className={`w-5 h-5 ${isLoversMode ? 'text-lovers-primary' : 'text-general-primary'}`} />
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex space-x-3">
        <Button
          variant="outline"
          onClick={onClose}
          className="flex-1 glass border-white/20"
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button
          onClick={handleCreateGroup}
          className={`flex-1 ${isLoversMode ? 'btn-lovers' : 'btn-general'}`}
          disabled={!groupName.trim() || selectedFriends.size === 0}
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Create Group
        </Button>
      </div>
    </div>
  );
};