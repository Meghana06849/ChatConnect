import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { useChat } from '@/contexts/ChatContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Activity, 
  Users,
  MessageCircle,
  Phone,
  Calendar,
  Target,
  TrendingUp,
  Coins
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { VerificationBadge } from './VerificationBadge';

interface ActivityMetrics {
  messagesCount: number;
  callsCount: number;
  momentsCount: number;
  friendsCount: number;
  loveCoins: number;
}

export const ActivityDashboard: React.FC = () => {
  const { profile } = useProfile();
  const { mode } = useChat();
  const isLoversMode = mode === 'lovers';
  
  const [metrics, setMetrics] = useState<ActivityMetrics>({
    messagesCount: 0,
    callsCount: 0,
    momentsCount: 0,
    friendsCount: 0,
    loveCoins: 0
  });
  const [loading, setLoading] = useState(true);

  // Load REAL metrics from database
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

        // Get real moments count
        const { count: momentsCount } = await supabase
          .from('moments')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.user_id);

        // Get real friends count (accepted contacts)
        const { count: friendsCount } = await supabase
          .from('contacts')
          .select('*', { count: 'exact', head: true })
          .or(`user_id.eq.${profile.user_id},contact_user_id.eq.${profile.user_id}`)
          .eq('status', 'accepted');

        setMetrics({
          messagesCount: messagesCount || 0,
          callsCount: callsCount || 0,
          momentsCount: momentsCount || 0,
          friendsCount: friendsCount || 0,
          loveCoins: profile?.love_coins || 0
        });
      } catch (error) {
        console.error('Error loading metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRealMetrics();
  }, [profile?.user_id, profile?.love_coins]);

  const getActivityLevel = () => {
    const totalActivity = metrics.messagesCount + metrics.callsCount + metrics.momentsCount;
    if (totalActivity >= 100) return { level: 'Very Active', color: 'text-green-500', bg: 'bg-green-500/20', percent: 95 };
    if (totalActivity >= 50) return { level: 'Active', color: 'text-blue-500', bg: 'bg-blue-500/20', percent: 70 };
    if (totalActivity >= 20) return { level: 'Moderate', color: 'text-yellow-500', bg: 'bg-yellow-500/20', percent: 45 };
    if (totalActivity >= 5) return { level: 'Starter', color: 'text-orange-500', bg: 'bg-orange-500/20', percent: 20 };
    return { level: 'New User', color: 'text-gray-500', bg: 'bg-gray-500/20', percent: 5 };
  };

  const activityLevel = getActivityLevel();

  return (
    <div className="space-y-6">
      {/* Activity Overview */}
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
            <span>Activity Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className={cn(
                    "text-white",
                    isLoversMode 
                      ? "bg-gradient-to-br from-lovers-primary to-lovers-secondary"
                      : "bg-gradient-to-br from-general-primary to-general-secondary"
                  )}>
                    {profile?.display_name?.[0] || profile?.username?.[0] || 'U'}
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
              <div>
                <h3 className="font-semibold">{profile?.display_name || 'User'}</h3>
                <Badge className={`${activityLevel.bg} ${activityLevel.color}`}>
                  {loading ? '...' : activityLevel.level}
                </Badge>
              </div>
            </div>
            {isLoversMode && (
              <div className="text-right">
                <div className="flex items-center gap-1 justify-end">
                  <Coins className="w-4 h-4 text-lovers-primary" />
                  <p className="text-2xl font-bold text-lovers-primary">
                    {loading ? '...' : metrics.loveCoins}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">Love Coins</p>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Activity Level</span>
              <span>{loading ? '...' : `${activityLevel.percent}%`}</span>
            </div>
            <Progress value={loading ? 0 : activityLevel.percent} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={cn(
          "glass border-white/20 text-center p-4",
          isLoversMode && "border-lovers-primary/20"
        )}>
          <MessageCircle className={cn(
            "w-8 h-8 mx-auto mb-2",
            isLoversMode ? "text-lovers-primary" : "text-blue-500"
          )} />
          <p className="text-2xl font-bold">{loading ? '...' : metrics.messagesCount}</p>
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
          <p className="text-2xl font-bold">{loading ? '...' : metrics.callsCount}</p>
          <p className="text-xs text-muted-foreground">Calls Made</p>
        </Card>
        
        <Card className={cn(
          "glass border-white/20 text-center p-4",
          isLoversMode && "border-lovers-primary/20"
        )}>
          <Calendar className={cn(
            "w-8 h-8 mx-auto mb-2",
            isLoversMode ? "text-lovers-accent" : "text-purple-500"
          )} />
          <p className="text-2xl font-bold">{loading ? '...' : metrics.momentsCount}</p>
          <p className="text-xs text-muted-foreground">Moments</p>
        </Card>
        
        <Card className={cn(
          "glass border-white/20 text-center p-4",
          isLoversMode && "border-lovers-primary/20"
        )}>
          <Users className={cn(
            "w-8 h-8 mx-auto mb-2",
            isLoversMode ? "text-lovers-primary" : "text-orange-500"
          )} />
          <p className="text-2xl font-bold">{loading ? '...' : metrics.friendsCount}</p>
          <p className="text-xs text-muted-foreground">Friends</p>
        </Card>
      </div>

      {/* Stats Summary */}
      <Card className={cn(
        "glass border-white/20",
        isLoversMode && "border-lovers-primary/20"
      )}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className={cn(
              "w-5 h-5",
              isLoversMode ? "text-lovers-primary" : "text-green-500"
            )} />
            <span>Your Stats</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 rounded-lg bg-white/5">
              <Target className={cn(
                "w-6 h-6 mx-auto mb-2",
                isLoversMode ? "text-lovers-primary" : "text-primary"
              )} />
              <p className="text-lg font-bold">
                {loading ? '...' : metrics.messagesCount + metrics.callsCount}
              </p>
              <p className="text-xs text-muted-foreground">Total Interactions</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-white/5">
              <Activity className={cn(
                "w-6 h-6 mx-auto mb-2",
                isLoversMode ? "text-lovers-secondary" : "text-primary"
              )} />
              <p className="text-lg font-bold">
                {loading ? '...' : metrics.momentsCount + metrics.friendsCount}
              </p>
              <p className="text-xs text-muted-foreground">Social Activity</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};