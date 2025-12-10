import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { 
  Phone, 
  Video, 
  Users,
  Plus,
  Settings,
  MessageCircle,
  PhoneCall
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DynamicBackground } from '@/components/background/DynamicBackground';
import { useCall } from './CallProvider';

interface Contact {
  id: string;
  name: string;
  userId: string;
  status: 'online' | 'offline' | 'busy';
  avatar?: string;
}

interface CallInterfaceProps {
  isLoversMode?: boolean;
}

export const CallInterface: React.FC<CallInterfaceProps> = ({ isLoversMode = false }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const { startCall, isCallActive } = useCall();

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data?.user?.id || null);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const loadContacts = async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .or(`user_id.eq.${userId},contact_user_id.eq.${userId}`)
        .eq('status', 'accepted');

      if (error) {
        console.error('Error loading contacts:', error);
        return;
      }

      // Get contact user IDs
      const contactUserIds = (data || []).map(contact => 
        contact.user_id === userId ? contact.contact_user_id : contact.user_id
      );

      if (contactUserIds.length === 0) {
        setContacts([]);
        return;
      }

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, username, avatar_url, is_online')
        .in('user_id', contactUserIds);

      const contactsList: Contact[] = (profiles || []).map(profile => ({
        id: profile.user_id,
        userId: profile.user_id,
        name: profile.display_name || profile.username || 'Unknown',
        status: profile.is_online ? 'online' : 'offline',
        avatar: profile.avatar_url || undefined
      }));

      setContacts(contactsList);
    };

    loadContacts();
  }, [userId]);

  const groups = [
    { id: '1', name: 'Family Group', members: 5, online: 3 },
    { id: '2', name: 'Work Team', members: 8, online: 4 },
    { id: '3', name: 'Study Group', members: 6, online: 2 },
  ];

  const handleStartCall = async (contact: Contact, isVideo: boolean) => {
    if (contact.status === 'offline') {
      toast({
        title: "Contact unavailable",
        description: `${contact.name} is currently offline`,
        variant: "destructive"
      });
      return;
    }
    
    await startCall(contact.userId, contact.name, isVideo);
  };

  const startGroupCall = (group: any) => {
    toast({
      title: "Group call starting",
      description: `Connecting to ${group.name}...`,
    });
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto relative">
      <DynamicBackground />
      <div className="max-w-4xl mx-auto space-y-6 relative z-10">
        <div className="text-center mb-8">
          <PhoneCall className={`w-16 h-16 mx-auto mb-4 ${isLoversMode ? 'text-lovers-primary' : 'text-primary'}`} />
          <h1 className="text-3xl font-bold mb-2">Calls</h1>
          <p className="text-muted-foreground">Voice and video calls with friends</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Direct Calls */}
          <Card className="glass border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Phone className={`w-5 h-5 ${isLoversMode ? 'text-lovers-primary' : 'text-primary'}`} />
                  <span>Direct Calls</span>
                </div>
                <Badge className={`${isLoversMode ? 'bg-lovers-primary/20 text-lovers-primary' : 'bg-primary/20 text-primary'}`}>
                  {contacts.filter(c => c.status === 'online').length} online
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {contacts.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No contacts yet</p>
              ) : (
                contacts.map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Avatar>
                          <AvatarFallback className={`${isLoversMode ? 'bg-gradient-to-br from-lovers-primary to-lovers-secondary' : 'bg-gradient-to-br from-primary to-primary/60'} text-white`}>
                            {contact.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background ${
                          contact.status === 'online' ? 'bg-green-500' : 
                          contact.status === 'busy' ? 'bg-yellow-500' : 'bg-gray-500'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium">{contact.name}</p>
                        <p className="text-sm text-muted-foreground capitalize">{contact.status}</p>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStartCall(contact, false)}
                        disabled={contact.status === 'offline'}
                        className="rounded-full p-2"
                      >
                        <Phone className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStartCall(contact, true)}
                        disabled={contact.status === 'offline'}
                        className="rounded-full p-2"
                      >
                        <Video className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Group Calls */}
          <Card className="glass border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className={`w-5 h-5 ${isLoversMode ? 'text-lovers-primary' : 'text-primary'}`} />
                  <span>Group Calls</span>
                </div>
                <Button size="sm" variant="outline" className="rounded-full">
                  <Plus className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {groups.map((group) => (
                <div key={group.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarFallback className={`${isLoversMode ? 'bg-gradient-to-br from-lovers-primary to-lovers-secondary' : 'bg-gradient-to-br from-primary to-primary/60'} text-white`}>
                        <Users className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{group.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {group.online}/{group.members} online
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startGroupCall(group)}
                      className="rounded-full p-2"
                    >
                      <Phone className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startGroupCall(group)}
                      className="rounded-full p-2"
                    >
                      <Video className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="glass border-white/20">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-4 justify-center">
              <Button className={`${isLoversMode ? 'btn-lovers' : 'bg-primary hover:bg-primary/90'}`}>
                <MessageCircle className="w-4 h-4 mr-2" />
                Voice Message
              </Button>
              <Button variant="outline" className={`${isLoversMode ? 'border-lovers-primary/50 text-lovers-primary' : 'border-primary/50 text-primary'}`}>
                <Settings className="w-4 h-4 mr-2" />
                Call Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
