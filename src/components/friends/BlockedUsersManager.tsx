import React from 'react';
import { useBlockedUsers } from '@/hooks/useBlockedUsers';
import { useChat } from '@/contexts/ChatContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  ShieldOff, 
  VolumeX, 
  UserX2,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';

export const BlockedUsersManager: React.FC = () => {
  const { mode } = useChat();
  const isLoversMode = mode === 'lovers';
  const { blockedUsers, loading, unblockUser, refresh } = useBlockedUsers();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (blockedUsers.length === 0) {
    return (
      <Card className="glass border-white/20">
        <CardContent className="p-8 text-center">
          <ShieldOff className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="font-semibold mb-2">No blocked users</h3>
          <p className="text-muted-foreground text-sm">
            You haven't blocked or muted anyone yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserX2 className="w-5 h-5 text-destructive" />
          <h3 className="font-semibold">Blocked & Muted Users</h3>
          <Badge variant="secondary">{blockedUsers.length}</Badge>
        </div>
        <Button onClick={refresh} variant="ghost" size="sm">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-3">
        {blockedUsers.map((blocked) => (
          <Card key={blocked.id} className="glass border-white/20 animate-slide-in-right">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={blocked.profile?.avatarUrl || undefined} />
                    <AvatarFallback className="bg-muted">
                      {blocked.profile?.displayName?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">
                        {blocked.profile?.displayName || 'Unknown User'}
                      </p>
                      <Badge 
                        variant={blocked.blockType === 'block' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {blocked.blockType === 'block' ? (
                          <>
                            <ShieldOff className="w-3 h-3 mr-1" />
                            Blocked
                          </>
                        ) : (
                          <>
                            <VolumeX className="w-3 h-3 mr-1" />
                            Muted
                          </>
                        )}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      @{blocked.profile?.username || 'unknown'}
                    </p>
                    {blocked.reason && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        Reason: {blocked.reason}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {blocked.blockType === 'block' ? 'Blocked' : 'Muted'} on{' '}
                      {format(new Date(blocked.createdAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => unblockUser(blocked.id)}
                  className={`
                    ${blocked.blockType === 'block' 
                      ? 'hover:bg-green-500/10 hover:text-green-500 hover:border-green-500' 
                      : 'hover:bg-blue-500/10 hover:text-blue-500 hover:border-blue-500'
                    }
                  `}
                >
                  {blocked.blockType === 'block' ? 'Unblock' : 'Unmute'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
