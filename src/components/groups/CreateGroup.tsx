import React, { useState, useEffect } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Users, 
  Search, 
  UserPlus, 
  Check,
  X,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Friend {
  id: string;
  user_id: string;
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
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const isLoversMode = mode === 'lovers';

  // Load real friends from database
  useEffect(() => {
    const loadFriends = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get accepted contacts
        const { data: contacts, error } = await supabase
          .from('contacts')
          .select('user_id, contact_user_id')
          .or(`user_id.eq.${user.id},contact_user_id.eq.${user.id}`)
          .eq('status', 'accepted');

        if (error) throw error;

        // Get friend user IDs
        const friendIds = contacts?.map(c => 
          c.user_id === user.id ? c.contact_user_id : c.user_id
        ) || [];

        if (friendIds.length === 0) {
          setFriends([]);
          setLoading(false);
          return;
        }

        // Get friend profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, display_name, username, avatar_url, is_online')
          .in('user_id', friendIds);

        if (profilesError) throw profilesError;

        const formattedFriends: Friend[] = (profiles || []).map(p => ({
          id: p.user_id,
          user_id: p.user_id,
          name: p.display_name || p.username || 'Unknown',
          username: p.username || 'unknown',
          avatar: p.avatar_url,
          isOnline: p.is_online || false
        }));

        setFriends(formattedFriends);
      } catch (error) {
        console.error('Error loading friends:', error);
        toast({
          title: 'Error',
          description: 'Failed to load friends',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    loadFriends();
  }, [toast]);

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

    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create the group
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: groupName,
          description: groupDescription || null,
          created_by: user.id,
          is_private: false
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add creator as admin
      const { error: adminError } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: user.id,
          role: 'admin'
        });

      if (adminError) throw adminError;

      // Add selected friends as members
      const memberInserts = Array.from(selectedFriends).map(friendId => ({
        group_id: group.id,
        user_id: friendId,
        role: 'member'
      }));

      const { error: membersError } = await supabase
        .from('group_members')
        .insert(memberInserts);

      if (membersError) throw membersError;

      // Create conversation for the group
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          name: groupName,
          type: 'group',
          group_id: group.id,
          created_by: user.id
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add all participants to conversation
      const allParticipants = [user.id, ...Array.from(selectedFriends)];
      const participantInserts = allParticipants.map(userId => ({
        conversation_id: conversation.id,
        user_id: userId
      }));

      await supabase
        .from('conversation_participants')
        .insert(participantInserts);

      onGroupCreated(group);
      toast({
        title: "Group created!",
        description: `${groupName} has been created with ${selectedFriends.size} members`,
      });
      onClose();
    } catch (error: any) {
      console.error('Error creating group:', error);
      toast({
        title: "Failed to create group",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Users className={cn(
          "w-12 h-12 mx-auto mb-4",
          isLoversMode ? "text-lovers-primary" : "text-general-primary"
        )} />
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
            <Badge variant="outline" className={cn(
              isLoversMode 
                ? "border-lovers-primary/50 text-lovers-primary" 
                : "border-general-primary/50 text-general-primary"
            )}>
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
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 mx-auto mb-2 text-muted-foreground animate-spin" />
                <p className="text-muted-foreground">Loading friends...</p>
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  {friends.length === 0 
                    ? "No friends yet. Add friends first!" 
                    : "No friends found"}
                </p>
              </div>
            ) : (
              filteredFriends.map((friend) => (
                <div
                  key={friend.id}
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer",
                    selectedFriends.has(friend.user_id)
                      ? isLoversMode 
                        ? "bg-lovers-primary/10 border-lovers-primary/30"
                        : "bg-general-primary/10 border-general-primary/30"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  )}
                  onClick={() => toggleFriendSelection(friend.user_id)}
                >
                  <Checkbox
                    checked={selectedFriends.has(friend.user_id)}
                    onChange={() => toggleFriendSelection(friend.user_id)}
                    className="pointer-events-none"
                  />
                  
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={friend.avatar} />
                    <AvatarFallback className={cn(
                      "text-white",
                      isLoversMode 
                        ? "bg-gradient-to-br from-lovers-primary to-lovers-secondary" 
                        : "bg-gradient-to-br from-general-primary to-general-secondary"
                    )}>
                      {friend.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium">{friend.name}</h4>
                      <Badge 
                        variant={friend.isOnline ? "default" : "secondary"}
                        className={friend.isOnline 
                          ? (isLoversMode ? 'bg-lovers-primary' : 'bg-general-primary') 
                          : ''}
                      >
                        {friend.isOnline ? 'Online' : 'Offline'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">@{friend.username}</p>
                  </div>

                  {selectedFriends.has(friend.user_id) && (
                    <Check className={cn(
                      "w-5 h-5",
                      isLoversMode ? "text-lovers-primary" : "text-general-primary"
                    )} />
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
          disabled={creating}
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button
          onClick={handleCreateGroup}
          className={cn("flex-1", isLoversMode ? "btn-lovers" : "btn-general")}
          disabled={!groupName.trim() || selectedFriends.size === 0 || creating}
        >
          {creating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <UserPlus className="w-4 h-4 mr-2" />
          )}
          {creating ? 'Creating...' : 'Create Group'}
        </Button>
      </div>
    </div>
  );
};