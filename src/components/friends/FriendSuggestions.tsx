import React, { useState } from 'react';
import { useFriendSuggestions } from '@/hooks/useFriendSuggestions';
import { useFriendRequests } from '@/hooks/useFriendRequests';
import { useChat } from '@/contexts/ChatContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { OnlineStatusIndicator } from './OnlineStatusIndicator';
import { 
  Loader2, 
  UserPlus, 
  X, 
  Users, 
  RefreshCw,
  Sparkles
} from 'lucide-react';

export const FriendSuggestions: React.FC = () => {
  const { mode } = useChat();
  const isLoversMode = mode === 'lovers';
  const { suggestions, loading, dismissSuggestion, refresh } = useFriendSuggestions(10);
  const { sendRequest } = useFriendRequests();
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  const handleSendRequest = async (username: string, userId: string) => {
    setSendingTo(userId);
    await sendRequest(username);
    dismissSuggestion(userId);
    setSendingTo(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <Card className="glass border-white/20">
        <CardContent className="p-8 text-center">
          <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="font-semibold mb-2">No suggestions yet</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Add more friends to see suggestions based on mutual connections!
          </p>
          <Button onClick={refresh} variant="outline" className="glass border-white/20">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className={`w-5 h-5 ${isLoversMode ? 'text-lovers-primary' : 'text-general-primary'}`} />
          <h3 className="font-semibold">People you may know</h3>
        </div>
        <Button onClick={refresh} variant="ghost" size="sm">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {suggestions.map((suggestion) => (
          <Card 
            key={suggestion.userId} 
            className="glass border-white/20 animate-slide-in-right overflow-hidden"
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="relative shrink-0">
                  <Avatar className="w-14 h-14">
                    <AvatarImage src={suggestion.avatarUrl || undefined} />
                    <AvatarFallback className={`
                      text-white text-lg
                      ${isLoversMode 
                        ? 'bg-gradient-to-br from-lovers-primary to-lovers-secondary' 
                        : 'bg-gradient-to-br from-general-primary to-general-secondary'
                      }
                    `}>
                      {suggestion.displayName[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <OnlineStatusIndicator 
                    isOnline={suggestion.isOnline} 
                    className="absolute -bottom-1 -right-1"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{suggestion.displayName}</p>
                  <p className="text-sm text-muted-foreground truncate">@{suggestion.username}</p>
                  
                  <div className="flex items-center gap-1 mt-1">
                    <Users className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {suggestion.mutualFriendCount} mutual friend{suggestion.mutualFriendCount !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {suggestion.isOnline && (
                    <Badge variant="secondary" className="mt-2 bg-green-500/20 text-green-400 text-xs">
                      Online now
                    </Badge>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => dismissSuggestion(suggestion.userId)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <Button
                className={`w-full mt-3 ${isLoversMode ? 'btn-lovers' : 'btn-general'}`}
                size="sm"
                disabled={sendingTo === suggestion.userId}
                onClick={() => handleSendRequest(suggestion.username, suggestion.userId)}
              >
                {sendingTo === suggestion.userId ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Friend
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
