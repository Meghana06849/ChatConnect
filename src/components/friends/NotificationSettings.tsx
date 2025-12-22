import React from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useChat } from '@/contexts/ChatContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Bell, 
  BellOff, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  Smartphone
} from 'lucide-react';

export const NotificationSettings: React.FC = () => {
  const { mode } = useChat();
  const isLoversMode = mode === 'lovers';
  const { 
    permission, 
    isSubscribed, 
    isSupported, 
    loading, 
    subscribe, 
    unsubscribe 
  } = usePushNotifications();

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  if (!isSupported) {
    return (
      <Card className="glass border-white/20 border-yellow-500/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="font-medium">Push notifications not supported</p>
              <p className="text-sm text-muted-foreground">
                Your browser doesn't support push notifications
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass border-white/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center
              ${isSubscribed 
                ? 'bg-green-500/20' 
                : 'bg-muted'
              }
            `}>
              {isSubscribed ? (
                <Bell className="w-5 h-5 text-green-500" />
              ) : (
                <BellOff className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="push-notifications" className="font-medium cursor-pointer">
                  Push Notifications
                </Label>
                {isSubscribed && (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {isSubscribed 
                  ? 'You will receive notifications when the app is in the background'
                  : 'Get notified about friend requests even when the app is closed'
                }
              </p>
              {permission === 'denied' && (
                <p className="text-xs text-yellow-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Permission blocked in browser settings
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : (
              <Switch
                id="push-notifications"
                checked={isSubscribed}
                onCheckedChange={handleToggle}
                disabled={permission === 'denied'}
                className={isSubscribed && isLoversMode ? 'data-[state=checked]:bg-lovers-primary' : ''}
              />
            )}
          </div>
        </div>

        {isSubscribed && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Smartphone className="w-4 h-4" />
              <span>Notifications are active on this device</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
