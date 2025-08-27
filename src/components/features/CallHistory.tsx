import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Phone, 
  Video, 
  PhoneCall, 
  Search, 
  MoreVertical,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Clock,
  User
} from 'lucide-react';

interface CallRecord {
  id: string;
  name: string;
  type: 'incoming' | 'outgoing' | 'missed';
  callType: 'voice' | 'video';
  duration: string;
  timestamp: Date;
  avatar?: string;
}

export const CallHistory: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  // Real call history will be loaded from database
  const [callHistory, setCallHistory] = useState<CallRecord[]>([]);

  const filteredCalls = callHistory.filter(call =>
    call.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // TODO: Load real call history from database
  // useEffect(() => {
  //   const loadCallHistory = async () => {
  //     // Load from Supabase call_history table
  //   };
  //   loadCallHistory();
  // }, []);

  const getCallIcon = (type: string, callType: string) => {
    if (type === 'incoming') return <PhoneIncoming className="w-4 h-4 text-green-500" />;
    if (type === 'outgoing') return <PhoneOutgoing className="w-4 h-4 text-blue-500" />;
    if (type === 'missed') return <PhoneMissed className="w-4 h-4 text-red-500" />;
    return <Phone className="w-4 h-4" />;
  };

  const getCallTypeIcon = (callType: string) => {
    return callType === 'video' ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />;
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return timestamp.toLocaleDateString();
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <Phone className="w-16 h-16 mx-auto mb-4 text-general-primary" />
          <h1 className="text-3xl font-bold mb-2">Call History</h1>
          <p className="text-muted-foreground">Your recent voice and video calls</p>
        </div>

        {/* Search */}
        <Card className="glass border-white/20">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search call history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 glass border-white/20"
              />
            </div>
          </CardContent>
        </Card>

        {/* Call History Tabs */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 glass border-white/20">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="missed">Missed</TabsTrigger>
            <TabsTrigger value="outgoing">Outgoing</TabsTrigger>
            <TabsTrigger value="incoming">Incoming</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <Card className="glass border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Recent Calls</span>
                  <Badge variant="outline" className="text-general-primary border-general-primary/50">
                    {filteredCalls.length} calls
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-muted-foreground">No call history available.</p>
                <div className="text-center p-8">
                  <Phone className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">
                    Make your first call to see history here
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="missed" className="space-y-4">
            <Card className="glass border-white/20">
              <CardContent className="p-6 text-center">
                <PhoneMissed className="w-16 h-16 mx-auto mb-4 text-red-500" />
                <h3 className="text-lg font-semibold mb-2">Missed Calls</h3>
                <p className="text-muted-foreground">
                  {filteredCalls.filter(call => call.type === 'missed').length} missed calls
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="outgoing" className="space-y-4">
            <Card className="glass border-white/20">
              <CardContent className="p-6 text-center">
                <PhoneOutgoing className="w-16 h-16 mx-auto mb-4 text-blue-500" />
                <h3 className="text-lg font-semibold mb-2">Outgoing Calls</h3>
                <p className="text-muted-foreground">
                  {filteredCalls.filter(call => call.type === 'outgoing').length} outgoing calls
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="incoming" className="space-y-4">
            <Card className="glass border-white/20">
              <CardContent className="p-6 text-center">
                <PhoneIncoming className="w-16 h-16 mx-auto mb-4 text-green-500" />
                <h3 className="text-lg font-semibold mb-2">Incoming Calls</h3>
                <p className="text-muted-foreground">
                  {filteredCalls.filter(call => call.type === 'incoming').length} incoming calls
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="glass border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Phone className="w-5 h-5 text-green-500" />
                <span>Voice Calls</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full bg-green-500 hover:bg-green-600 text-white">
                <PhoneCall className="w-4 h-4 mr-2" />
                Start Voice Call
              </Button>
              <p className="text-sm text-muted-foreground">High quality voice calling</p>
            </CardContent>
          </Card>

          <Card className="glass border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Video className="w-5 h-5 text-blue-500" />
                <span>Video Calls</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white">
                <Video className="w-4 h-4 mr-2" />
                Start Video Call
              </Button>
              <p className="text-sm text-muted-foreground">Face-to-face conversations</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};