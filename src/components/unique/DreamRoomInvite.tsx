import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  Copy, 
  Link2, 
  Shield, 
  Users,
  Clock,
  Star
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const DreamRoomInvite: React.FC = () => {
  const [roomName, setRoomName] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [isCreated, setIsCreated] = useState(false);
  const { toast } = useToast();

  const createDreamRoom = () => {
    if (!roomName.trim()) {
      toast({
        title: "Room name required",
        description: "Please enter a name for your dream room",
        variant: "destructive"
      });
      return;
    }

    const roomId = Math.random().toString(36).substr(2, 9);
    const link = `${window.location.origin}/dream-room/${roomId}?mode=lovers&creator=${encodeURIComponent(roomName)}`;
    setInviteLink(link);
    setIsCreated(true);
    
    toast({
      title: "Dream Room Created!",
      description: "Share the invite link with your partner",
    });
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    toast({
      title: "Link copied!",
      description: "Invite link copied to clipboard",
    });
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-lovers-primary/20 to-lovers-secondary/20 mb-6">
            <Heart className="w-10 h-10 text-lovers-primary animate-heart-beat" />
          </div>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-lovers-primary to-lovers-secondary bg-clip-text text-transparent">
            Create Dream Room
          </h1>
          <p className="text-muted-foreground">
            Create a private space to share with your partner
          </p>
        </div>

        {!isCreated ? (
          <Card className="glass border-lovers-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Star className="w-5 h-5 text-lovers-primary" />
                <span>Setup Your Dream Room</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Room Name</label>
                <Input
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Our Special Place..."
                  className="glass border-lovers-primary/30"
                />
              </div>

              <div className="space-y-3">
                <h3 className="font-medium flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-lovers-primary" />
                  <span>Security Features</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Badge variant="outline" className="p-2 border-lovers-primary/50 text-lovers-primary justify-center">
                    <Users className="w-4 h-4 mr-2" />
                    Lovers Mode Only
                  </Badge>
                  <Badge variant="outline" className="p-2 border-lovers-primary/50 text-lovers-primary justify-center">
                    <Clock className="w-4 h-4 mr-2" />
                    Time Restricted
                  </Badge>
                </div>
              </div>

              <Button 
                onClick={createDreamRoom}
                className="w-full btn-lovers"
                disabled={!roomName.trim()}
              >
                <Heart className="w-4 h-4 mr-2" />
                Create Dream Room
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="glass border-lovers-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Heart className="w-5 h-5 text-lovers-primary" />
                <span>Dream Room Created!</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-xl bg-lovers-primary/10 border border-lovers-primary/20">
                <h3 className="font-medium mb-2 text-lovers-primary">Room: {roomName}</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Share this secure link with your partner to access your private dream room
                </p>
                
                <div className="flex items-center space-x-2">
                  <Input
                    value={inviteLink}
                    readOnly
                    className="flex-1 glass border-lovers-primary/30 text-xs"
                  />
                  <Button
                    onClick={copyInviteLink}
                    size="sm"
                    className="btn-lovers"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-medium">Important Notes:</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Only accessible in Lovers Mode</li>
                  <li>• Available during restricted hours (12 AM - 5 AM)</li>
                  <li>• Link expires after first use by partner</li>
                  <li>• All activities are private and secure</li>
                </ul>
              </div>

              <div className="flex space-x-3">
                <Button 
                  onClick={() => {
                    setIsCreated(false);
                    setRoomName('');
                    setInviteLink('');
                  }}
                  variant="outline"
                  className="flex-1 border-lovers-primary/50 text-lovers-primary"
                >
                  Create Another
                </Button>
                <Button 
                  onClick={copyInviteLink}
                  className="flex-1 btn-lovers"
                >
                  <Link2 className="w-4 h-4 mr-2" />
                  Copy Link
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};