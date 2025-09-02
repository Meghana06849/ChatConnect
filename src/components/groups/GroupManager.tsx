import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Users, 
  Plus, 
  MessageCircle, 
  Crown, 
  UserPlus, 
  Settings,
  Gamepad2,
  Video,
  Phone
} from 'lucide-react';
import { CreateGroup } from './CreateGroup';
import { useToast } from '@/hooks/use-toast';

interface Group {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  created_by: string;
  is_private: boolean;
  created_at: string;
  member_count?: number;
  user_role?: string;
}

interface GroupMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: {
    display_name?: string;
    username?: string;
    avatar_url?: string;
  };
}

export const GroupManager: React.FC = () => {
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const { toast } = useToast();

  // Create group form state
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    isPrivate: false
  });

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select(`
          *,
          group_members!inner(role)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process groups with member count and user role
      const processedGroups = data?.map(group => ({
        ...group,
        member_count: group.group_members?.length || 0,
        user_role: group.group_members?.[0]?.role || 'member'
      })) || [];

      setGroups(processedGroups);
    } catch (error: any) {
      toast({
        title: "Error loading groups",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createGroup = async () => {
    if (!newGroup.name.trim()) {
      toast({
        title: "Group name required",
        description: "Please provide a name for your group",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create group
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: newGroup.name,
          description: newGroup.description || null,
          is_private: newGroup.isPrivate,
          created_by: user.id
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add creator as admin member
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: groupData.id,
          user_id: user.id,
          role: 'admin'
        });

      if (memberError) throw memberError;

      toast({
        title: "Group created!",
        description: `"${newGroup.name}" has been created successfully.`,
      });

      setNewGroup({ name: '', description: '', isPrivate: false });
      setShowCreateDialog(false);
      loadGroups();
    } catch (error: any) {
      toast({
        title: "Error creating group",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loadGroupMembers = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          *,
          profiles!inner(display_name, username, avatar_url)
        `)
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true });

      if (error) throw error;

      const members = data?.map(member => ({
        ...member,
        profile: member.profiles
      })) || [];

      setGroupMembers(members as GroupMember[]);
    } catch (error: any) {
      toast({
        title: "Error loading members",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openGroupMembers = (group: Group) => {
    setSelectedGroup(group);
    loadGroupMembers(group.id);
    setShowMembersDialog(true);
  };

  const startGroupChat = (group: Group) => {
    toast({
      title: "Group Chat",
      description: `Starting chat with ${group.name}`,
    });
    // TODO: Implement group chat navigation
  };

  const startGroupGame = (group: Group) => {
    toast({
      title: "Group Games",
      description: `Starting games with ${group.name}`,
    });
    // TODO: Implement group games
  };

  const startGroupCall = (group: Group, type: 'voice' | 'video') => {
    toast({
      title: `Group ${type === 'voice' ? 'Voice' : 'Video'} Call`,
      description: `Starting ${type} call with ${group.name}`,
    });
    // TODO: Implement group calls
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Users className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">My Groups</h2>
        </div>
        
        <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-accent">
              <Plus className="w-4 h-4 mr-2" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent className="glass border-white/20 max-w-2xl max-h-[90vh] overflow-y-auto">
            <CreateGroup 
              onClose={() => setShowCreateGroup(false)}
              onGroupCreated={(group) => {
                setGroups(prev => [group, ...prev]);
                setShowCreateGroup(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {groups.length === 0 ? (
        <Card className="glass border-white/20">
          <CardContent className="p-8 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No groups yet</h3>
            <p className="text-muted-foreground mb-4">Create or join groups to start chatting with friends</p>
            <Button onClick={() => setShowCreateGroup(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <Card key={group.id} className="glass border-white/20 hover:border-white/30 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white">
                        {group.name[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{group.name}</CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {group.member_count} members
                        </Badge>
                        {group.user_role === 'admin' && (
                          <Crown className="w-4 h-4 text-yellow-500" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {group.description && (
                  <p className="text-sm text-muted-foreground mt-2">{group.description}</p>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    onClick={() => startGroupChat(group)}
                    className="glass border-white/20"
                  >
                    <MessageCircle className="w-4 h-4 mr-1" />
                    Chat
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => startGroupGame(group)}
                    variant="outline"
                    className="glass border-white/20"
                  >
                    <Gamepad2 className="w-4 h-4 mr-1" />
                    Games
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => startGroupCall(group, 'voice')}
                    variant="outline"
                    className="glass border-white/20"
                  >
                    <Phone className="w-4 h-4 mr-1" />
                    Voice
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => startGroupCall(group, 'video')}
                    variant="outline"
                    className="glass border-white/20"
                  >
                    <Video className="w-4 h-4 mr-1" />
                    Video
                  </Button>
                </div>
                <div className="flex justify-between mt-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openGroupMembers(group)}
                  >
                    <Users className="w-4 h-4 mr-1" />
                    Members
                  </Button>
                  {group.user_role === 'admin' && (
                    <Button size="sm" variant="ghost">
                      <Settings className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Group Members Dialog */}
      <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
        <DialogContent className="glass border-white/20">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>{selectedGroup?.name} Members</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {groupMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-sm">
                      {member.profile?.display_name?.[0] || member.profile?.username?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">
                      {member.profile?.display_name || member.profile?.username}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Joined {new Date(member.joined_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {member.role === 'admin' && (
                    <Crown className="w-4 h-4 text-yellow-500" />
                  )}
                  <Badge variant={member.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                    {member.role}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};