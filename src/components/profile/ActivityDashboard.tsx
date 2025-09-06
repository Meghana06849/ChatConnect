import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Activity, 
  Heart, 
  Trophy, 
  Star, 
  Users,
  MessageCircle,
  Phone,
  Calendar,
  Shield,
  Zap,
  Target,
  TrendingUp
} from 'lucide-react';

interface ActivityMetrics {
  messagesCount: number;
  callsCount: number;
  storiesCount: number;
  friendsCount: number;
  loginStreak: number;
  loveCoins: number;
  weeklyActivity: number;
  achievements: string[];
}

export const ActivityDashboard: React.FC = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [metrics, setMetrics] = useState<ActivityMetrics>({
    messagesCount: 0,
    callsCount: 0,
    storiesCount: 0,
    friendsCount: 0,
    loginStreak: 0,
    loveCoins: profile?.love_coins || 0,
    weeklyActivity: 0,
    achievements: []
  });

  // Simulate loading real metrics (in a real app, fetch from database)
  useEffect(() => {
    const loadMetrics = async () => {
      // Simulate API call
      setMetrics(prev => ({
        ...prev,
        messagesCount: Math.floor(Math.random() * 100) + 50,
        callsCount: Math.floor(Math.random() * 20) + 5,
        storiesCount: Math.floor(Math.random() * 15) + 3,
        friendsCount: Math.floor(Math.random() * 25) + 10,
        loginStreak: Math.floor(Math.random() * 30) + 1,
        weeklyActivity: Math.floor(Math.random() * 80) + 20,
        achievements: ['First Message', 'Daily User', 'Social Butterfly'],
        loveCoins: profile?.love_coins || 100
      }));
    };

    loadMetrics();
  }, [profile]);

  const getActivityLevel = () => {
    if (metrics.weeklyActivity >= 70) return { level: 'Very Active', color: 'text-green-500', bg: 'bg-green-500/20' };
    if (metrics.weeklyActivity >= 40) return { level: 'Active', color: 'text-blue-500', bg: 'bg-blue-500/20' };
    if (metrics.weeklyActivity >= 20) return { level: 'Moderate', color: 'text-yellow-500', bg: 'bg-yellow-500/20' };
    return { level: 'Low', color: 'text-gray-500', bg: 'bg-gray-500/20' };
  };

  const activityLevel = getActivityLevel();

  return (
    <div className="space-y-6">
      {/* Activity Overview */}
      <Card className="glass border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-primary" />
            <span>Activity Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Avatar className="w-12 h-12">
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white">
                  {profile?.display_name?.[0] || user?.email?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">{profile?.display_name || 'User'}</h3>
                <Badge className={`${activityLevel.bg} ${activityLevel.color}`}>
                  {activityLevel.level}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{metrics.loveCoins}</p>
              <p className="text-xs text-muted-foreground">Love Coins</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Weekly Activity</span>
              <span>{metrics.weeklyActivity}%</span>
            </div>
            <Progress value={metrics.weeklyActivity} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass border-white/20 text-center p-4">
          <MessageCircle className="w-8 h-8 text-blue-500 mx-auto mb-2" />
          <p className="text-2xl font-bold">{metrics.messagesCount}</p>
          <p className="text-xs text-muted-foreground">Messages</p>
        </Card>
        
        <Card className="glass border-white/20 text-center p-4">
          <Phone className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <p className="text-2xl font-bold">{metrics.callsCount}</p>
          <p className="text-xs text-muted-foreground">Calls</p>
        </Card>
        
        <Card className="glass border-white/20 text-center p-4">
          <Calendar className="w-8 h-8 text-purple-500 mx-auto mb-2" />
          <p className="text-2xl font-bold">{metrics.storiesCount}</p>
          <p className="text-xs text-muted-foreground">Stories</p>
        </Card>
        
        <Card className="glass border-white/20 text-center p-4">
          <Users className="w-8 h-8 text-orange-500 mx-auto mb-2" />
          <p className="text-2xl font-bold">{metrics.friendsCount}</p>
          <p className="text-xs text-muted-foreground">Friends</p>
        </Card>
      </div>

      {/* Achievements */}
      <Card className="glass border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <span>Recent Achievements</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {metrics.achievements.map((achievement, index) => (
              <div key={index} className="flex items-center space-x-3 p-2 rounded-lg bg-white/5">
                <Star className="w-5 h-5 text-yellow-500" />
                <span className="flex-1">{achievement}</span>
                <Badge variant="outline">New</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Login Streak */}
      <Card className="glass border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="w-5 h-5 text-red-500" />
            <span>Login Streak</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary mb-2">{metrics.loginStreak}</div>
            <p className="text-muted-foreground">Days in a row</p>
            <div className="mt-4 flex justify-center space-x-1">
              {Array.from({ length: 7 }, (_, i) => (
                <div
                  key={i}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                    i < metrics.loginStreak % 7 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-white/10 text-muted-foreground'
                  }`}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card className="glass border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <span>This Week</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-xl font-bold text-green-500">+{Math.floor(metrics.messagesCount * 0.3)}</p>
              <p className="text-xs text-muted-foreground">New Messages</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-blue-500">+{Math.floor(metrics.callsCount * 0.4)}</p>
              <p className="text-xs text-muted-foreground">Call Minutes</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};