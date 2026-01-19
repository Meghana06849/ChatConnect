import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { useChat } from '@/contexts/ChatContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Activity, 
  Heart, 
  Users,
  MessageCircle,
  Phone,
  Coins
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { VerificationBadge } from './VerificationBadge';

interface RealMetrics {
  messagesCount: number;
  callsCount: number;
  friendsCount: number;
}

export const RealActivityDashboard: React.FC = () => {
  const { profile } = useProfile();
  const { mode } = useChat();
  const isLoversMode = mode === 'lovers';
  
  const [metrics, setMetrics] = useState<RealMetrics>({
    messagesCount: 0,
    callsCount: 0,
    friendsCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRealMetrics = async () => {
      if (!profile?.user_id) return;
      
      setLoading(true);
      try {
        // Get real message count
        const { count: messagesCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('sender_id', profile.user_id);

        // Get real calls count
        const { count: callsCount } = await supabase
          .from('call_history')
          .select('*', { count: 'exact', head: true })
          .or(`caller_id.eq.${profile.user_id},callee_id.eq.${profile.user_id}`);

        // Get real friends count (accepted contacts)
        const { count: friendsCount } = await supabase
          .from('contacts')
          .select('*', { count: 'exact', head: true })
          .or(`user_id.eq.${profile.user_id},contact_user_id.eq.${profile.user_id}`)
          .eq('status', 'accepted');

        setMetrics({
          messagesCount: messagesCount || 0,
          callsCount: callsCount || 0,
          friendsCount: friendsCount || 0,
        });
      } catch (error) {
        console.error('Error loading metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRealMetrics();
  }, [profile?.user_id]);

  return (
    <div className="space-y-6">
      {/* Profile Overview */}
      <Card className={cn(
        "glass border-white/20",
        isLoversMode && "border-lovers-primary/20"
      )}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className={cn(
              "w-5 h-5",
              isLoversMode ? "text-lovers-primary" : "text-general-primary"
            )} />
            <span>Profile Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="w-16 h-16">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className={cn(
                  "text-xl text-white",
                  isLoversMode 
                    ? "bg-gradient-to-br from-lovers-primary to-lovers-secondary"
                    : "bg-gradient-to-br from-general-primary to-general-secondary"
                )}>
                  {profile?.display_name?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              {profile?.is_verified && (
                <VerificationBadge 
                  isVerified={true}
                  verificationType={profile.verification_type}
                  className="absolute -bottom-1 -right-1"
                />
              )}
            </div>
            
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{profile?.display_name || 'User'}</h3>
              <p className="text-sm text-muted-foreground">@{profile?.username}</p>
              {profile?.bio && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {profile.bio}
                </p>
              )}
            </div>

            {/* Love Coins - Only in Lovers Mode */}
            {isLoversMode && (
              <div className={cn(
                "text-center px-4 py-2 rounded-xl",
                "bg-lovers-primary/10 border border-lovers-primary/20"
              )}>
                <div className="flex items-center gap-1 justify-center">
                  <Coins className="w-4 h-4 text-lovers-primary" />
                  <span className="text-xl font-bold text-lovers-primary">
                    {profile?.love_coins || 0}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Love Coins</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Real Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        <Card className={cn(
          "glass border-white/20 text-center p-4",
          isLoversMode && "border-lovers-primary/20"
        )}>
          <MessageCircle className={cn(
            "w-8 h-8 mx-auto mb-2",
            isLoversMode ? "text-lovers-primary" : "text-blue-500"
          )} />
          <p className="text-2xl font-bold">
            {loading ? '...' : metrics.messagesCount}
          </p>
          <p className="text-xs text-muted-foreground">Messages Sent</p>
        </Card>
        
        <Card className={cn(
          "glass border-white/20 text-center p-4",
          isLoversMode && "border-lovers-primary/20"
        )}>
          <Phone className={cn(
            "w-8 h-8 mx-auto mb-2",
            isLoversMode ? "text-lovers-secondary" : "text-green-500"
          )} />
          <p className="text-2xl font-bold">
            {loading ? '...' : metrics.callsCount}
          </p>
          <p className="text-xs text-muted-foreground">Calls Made</p>
        </Card>
        
        <Card className={cn(
          "glass border-white/20 text-center p-4",
          isLoversMode && "border-lovers-primary/20"
        )}>
          <Users className={cn(
            "w-8 h-8 mx-auto mb-2",
            isLoversMode ? "text-lovers-accent" : "text-orange-500"
          )} />
          <p className="text-2xl font-bold">
            {loading ? '...' : metrics.friendsCount}
          </p>
          <p className="text-xs text-muted-foreground">Friends</p>
        </Card>
      </div>
    </div>
  );
};
