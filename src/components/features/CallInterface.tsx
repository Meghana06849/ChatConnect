import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Phone, 
  PhoneOff, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Speaker, 
  Volume2,
  Users,
  Plus,
  Settings,
  MessageCircle,
  Clock,
  PhoneCall
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FloatingBackground } from '@/components/background/FloatingBackground';

interface Contact {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'busy';
  avatar?: string;
}

interface CallInterfaceProps {
  isLoversMode?: boolean;
}

export const CallInterface: React.FC<CallInterfaceProps> = ({ isLoversMode = false }) => {
  const [activeCall, setActiveCall] = useState<Contact | null>(null);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const { toast } = useToast();

  const contacts: Contact[] = [
    { id: '1', name: 'Sarah', status: 'online' },
    { id: '2', name: 'Mike', status: 'online' },
    { id: '3', name: 'Emma', status: 'busy' },
    { id: '4', name: 'Alex', status: 'offline' },
  ];

  const groups = [
    { id: '1', name: 'Family Group', members: 5, online: 3 },
    { id: '2', name: 'Work Team', members: 8, online: 4 },
    { id: '3', name: 'Study Group', members: 6, online: 2 },
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeCall) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeCall]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startCall = (contact: Contact, video = false) => {
    if (contact.status === 'offline') {
      toast({
        title: "Contact unavailable",
        description: `${contact.name} is currently offline`,
        variant: "destructive"
      });
      return;
    }
    
    setActiveCall(contact);
    setIsVideoCall(video);
    setCallDuration(0);
    toast({
      title: `${video ? 'Video' : 'Voice'} call started`,
      description: `Calling ${contact.name}...`,
    });
  };

  const endCall = () => {
    setActiveCall(null);
    setIsVideoCall(false);
    setCallDuration(0);
    setIsMuted(false);
    setIsSpeakerOn(false);
    toast({
      title: "Call ended",
      description: `Call duration: ${formatDuration(callDuration)}`,
    });
  };

  const startGroupCall = (group: any) => {
    toast({
      title: "Group call starting",
      description: `Connecting to ${group.name}...`,
    });
  };

  if (activeCall) {
    return (
      <div className="flex-1 relative">
        <FloatingBackground />
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <Card className={`w-full max-w-md glass border-white/20 ${isLoversMode ? 'border-lovers-primary/30' : ''}`}>
            <CardContent className="p-8 text-center">
              <div className="mb-6">
                <Avatar className="w-32 h-32 mx-auto mb-4">
                  <AvatarFallback className={`text-4xl ${isLoversMode ? 'bg-gradient-to-br from-lovers-primary to-lovers-secondary' : 'bg-gradient-to-br from-general-primary to-general-secondary'} text-white`}>
                    {activeCall.name[0]}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-2xl font-bold mb-2">{activeCall.name}</h2>
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{formatDuration(callDuration)}</span>
                </div>
                <Badge className={`${isLoversMode ? 'bg-lovers-primary/20 text-lovers-primary' : 'bg-general-primary/20 text-general-primary'}`}>
                  {isVideoCall ? 'Video Call' : 'Voice Call'}
                </Badge>
              </div>

              {isVideoCall && (
                <div className="w-full h-48 bg-black/20 rounded-xl mb-6 flex items-center justify-center">
                  <Video className="w-12 h-12 text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Video Preview</span>
                </div>
              )}

              <div className="flex justify-center space-x-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setIsMuted(!isMuted)}
                  className={`rounded-full p-4 ${isMuted ? 'bg-destructive/20 text-destructive' : ''}`}
                >
                  {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                  className={`rounded-full p-4 ${isSpeakerOn ? 'bg-primary/20 text-primary' : ''}`}
                >
                  {isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <Speaker className="w-6 h-6" />}
                </Button>

                {isVideoCall && (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setIsVideoCall(false)}
                    className="rounded-full p-4"
                  >
                    <VideoOff className="w-6 h-6" />
                  </Button>
                )}

                <Button
                  variant="destructive"
                  size="lg"
                  onClick={endCall}
                  className="rounded-full p-4"
                >
                  <PhoneOff className="w-6 h-6" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto relative">
      <FloatingBackground />
      <div className="max-w-4xl mx-auto space-y-6 relative z-10">
        <div className="text-center mb-8">
          <PhoneCall className={`w-16 h-16 mx-auto mb-4 ${isLoversMode ? 'text-lovers-primary' : 'text-general-primary'}`} />
          <h1 className="text-3xl font-bold mb-2">Calls</h1>
          <p className="text-muted-foreground">Voice and video calls with friends</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Direct Calls */}
          <Card className="glass border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Phone className={`w-5 h-5 ${isLoversMode ? 'text-lovers-primary' : 'text-general-primary'}`} />
                  <span>Direct Calls</span>
                </div>
                <Badge className={`${isLoversMode ? 'bg-lovers-primary/20 text-lovers-primary' : 'bg-general-primary/20 text-general-primary'}`}>
                  {contacts.filter(c => c.status === 'online').length} online
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {contacts.map((contact) => (
                <div key={contact.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Avatar>
                        <AvatarFallback className={`${isLoversMode ? 'bg-gradient-to-br from-lovers-primary to-lovers-secondary' : 'bg-gradient-to-br from-general-primary to-general-secondary'} text-white`}>
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
                      onClick={() => startCall(contact, false)}
                      disabled={contact.status === 'offline'}
                      className="rounded-full p-2"
                    >
                      <Phone className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startCall(contact, true)}
                      disabled={contact.status === 'offline'}
                      className="rounded-full p-2"
                    >
                      <Video className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Group Calls */}
          <Card className="glass border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className={`w-5 h-5 ${isLoversMode ? 'text-lovers-primary' : 'text-general-primary'}`} />
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
                      <AvatarFallback className={`${isLoversMode ? 'bg-gradient-to-br from-lovers-primary to-lovers-secondary' : 'bg-gradient-to-br from-general-primary to-general-secondary'} text-white`}>
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
              <Button className={`${isLoversMode ? 'btn-lovers' : 'btn-general'}`}>
                <MessageCircle className="w-4 h-4 mr-2" />
                Voice Message
              </Button>
              <Button variant="outline" className={`${isLoversMode ? 'border-lovers-primary/50 text-lovers-primary' : 'border-general-primary/50 text-general-primary'}`}>
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