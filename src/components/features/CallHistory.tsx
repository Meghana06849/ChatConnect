import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { 
  Phone, 
  Video, 
  PhoneCall, 
  Search, 
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CallRecord {
  id: string;
  caller_id: string;
  callee_id: string;
  call_type: 'voice' | 'video';
  status: string;
  duration_seconds: number;
  created_at: string;
  contact_name?: string;
  contact_avatar?: string;
  direction: 'incoming' | 'outgoing';
}

interface CallHistoryProps {
  onStartCall?: (contactId: string, contactName: string, isVideo: boolean) => void;
}

export const CallHistory: React.FC<CallHistoryProps> = ({ onStartCall }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [callHistory, setCallHistory] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data?.user?.id || null);
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const loadCallHistory = async () => {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('call_history')
        .select('*')
        .or(`caller_id.eq.${userId},callee_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading call history:', error);
        setLoading(false);
        return;
      }

      // Fetch profile info for contacts
      const contactIds = (data || []).map(call => 
        call.caller_id === userId ? call.callee_id : call.caller_id
      );
      const uniqueContactIds = [...new Set(contactIds)];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, username, avatar_url')
        .in('user_id', uniqueContactIds);

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, p])
      );

      const enrichedHistory: CallRecord[] = (data || []).map(call => {
        const contactId = call.caller_id === userId ? call.callee_id : call.caller_id;
        const profile = profileMap.get(contactId);
        
        return {
          ...call,
          call_type: call.call_type as 'voice' | 'video',
          contact_name: profile?.display_name || profile?.username || 'Unknown',
          contact_avatar: profile?.avatar_url,
          direction: call.caller_id === userId ? 'outgoing' : 'incoming'
        };
      });

      setCallHistory(enrichedHistory);
      setLoading(false);
    };

    loadCallHistory();

    // Subscribe to new calls
    const channel = supabase
      .channel('call-history-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'call_history',
        filter: `caller_id=eq.${userId}`
      }, () => loadCallHistory())
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'call_history',
        filter: `callee_id=eq.${userId}`
      }, () => loadCallHistory())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const filteredCalls = callHistory.filter(call =>
    call.contact_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCallsByType = (type: 'all' | 'missed' | 'outgoing' | 'incoming') => {
    switch (type) {
      case 'missed':
        return filteredCalls.filter(c => c.status === 'missed');
      case 'outgoing':
        return filteredCalls.filter(c => c.direction === 'outgoing');
      case 'incoming':
        return filteredCalls.filter(c => c.direction === 'incoming');
      default:
        return filteredCalls;
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return 'No answer';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCallIcon = (call: CallRecord) => {
    if (call.status === 'missed') {
      return <PhoneMissed className="w-4 h-4 text-destructive" />;
    }
    if (call.direction === 'incoming') {
      return <PhoneIncoming className="w-4 h-4 text-green-500" />;
    }
    return <PhoneOutgoing className="w-4 h-4 text-blue-500" />;
  };

  const renderCallList = (calls: CallRecord[]) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (calls.length === 0) {
      return (
        <div className="text-center p-8">
          <Phone className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">No calls found</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {calls.map(call => (
          <div 
            key={call.id} 
            className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-white">
                  {call.contact_name?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{call.contact_name}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {getCallIcon(call)}
                  <span>{call.call_type === 'video' ? 'Video' : 'Voice'}</span>
                  <span>•</span>
                  <span>{formatDuration(call.duration_seconds)}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(call.created_at), { addSuffix: true })}
              </span>
              {onStartCall && (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onStartCall(
                      call.caller_id === userId ? call.callee_id : call.caller_id,
                      call.contact_name || 'Unknown',
                      false
                    )}
                    className="rounded-full p-2 h-8 w-8"
                  >
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onStartCall(
                      call.caller_id === userId ? call.callee_id : call.caller_id,
                      call.contact_name || 'Unknown',
                      true
                    )}
                    className="rounded-full p-2 h-8 w-8"
                  >
                    <Video className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <Phone className="w-16 h-16 mx-auto mb-4 text-primary" />
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
            <TabsTrigger value="all">All ({getCallsByType('all').length})</TabsTrigger>
            <TabsTrigger value="missed">Missed ({getCallsByType('missed').length})</TabsTrigger>
            <TabsTrigger value="outgoing">Outgoing ({getCallsByType('outgoing').length})</TabsTrigger>
            <TabsTrigger value="incoming">Incoming ({getCallsByType('incoming').length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <Card className="glass border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Recent Calls</span>
                  <Badge variant="outline" className="text-primary border-primary/50">
                    {getCallsByType('all').length} calls
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderCallList(getCallsByType('all'))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="missed">
            <Card className="glass border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PhoneMissed className="w-5 h-5 text-destructive" />
                  Missed Calls
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderCallList(getCallsByType('missed'))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="outgoing">
            <Card className="glass border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PhoneOutgoing className="w-5 h-5 text-blue-500" />
                  Outgoing Calls
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderCallList(getCallsByType('outgoing'))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="incoming">
            <Card className="glass border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PhoneIncoming className="w-5 h-5 text-green-500" />
                  Incoming Calls
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderCallList(getCallsByType('incoming'))}
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
