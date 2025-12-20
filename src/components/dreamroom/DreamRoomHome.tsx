import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { 
  Heart, 
  Moon, 
  Star, 
  Sparkles, 
  MessageCircle,
  Calendar,
  Music,
  Lock,
  Flame,
  Clock
} from 'lucide-react';

interface DreamRoomHomeProps {
  onNavigate: (section: string) => void;
}

export const DreamRoomHome: React.FC<DreamRoomHomeProps> = ({ onNavigate }) => {
  const { profile } = useProfile();
  const [loveStreak, setLoveStreak] = useState(0);
  const [partnerName, setPartnerName] = useState('Your Love');
  const [currentMood, setCurrentMood] = useState('💕');
  const [greeting, setGreeting] = useState('');
  
  const currentHour = new Date().getHours();
  const isNightTime = currentHour >= 18 || currentHour <= 6;

  useEffect(() => {
    // Set romantic greeting based on time
    if (currentHour >= 5 && currentHour < 12) {
      setGreeting('Good morning, my love');
    } else if (currentHour >= 12 && currentHour < 17) {
      setGreeting('Thinking of you');
    } else if (currentHour >= 17 && currentHour < 21) {
      setGreeting('Good evening, sweetheart');
    } else {
      setGreeting('Sweet dreams await');
    }

    // Load love streak and partner info
    const loadData = async () => {
      if (!profile?.user_id) return;
      
      const { data: streakData } = await supabase
        .from('love_streaks')
        .select('current_streak')
        .eq('user_id', profile.user_id)
        .maybeSingle();
      
      if (streakData) {
        setLoveStreak(streakData.current_streak || 0);
      }

      // Get partner profile if connected
      if (profile.lovers_partner_id) {
        const { data: partnerData } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', profile.lovers_partner_id)
          .maybeSingle();
        
        if (partnerData?.display_name) {
          setPartnerName(partnerData.display_name);
        }
      }
    };

    loadData();
  }, [profile, currentHour]);

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        {/* Romantic Header */}
        <div className="text-center mb-8 relative">
          {/* Floating hearts background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <Heart
                key={i}
                className="absolute text-lovers-primary/10 animate-float"
                style={{
                  left: `${10 + Math.random() * 80}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  width: `${16 + Math.random() * 16}px`,
                  height: `${16 + Math.random() * 16}px`,
                }}
              />
            ))}
          </div>

          {/* Connection Hearts */}
          <div className="relative mb-6">
            <div className="inline-flex items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 animate-pulse blur-xl bg-gradient-to-r from-lovers-primary/40 to-lovers-secondary/40 rounded-full scale-150" />
                <div className="relative flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-lovers-primary to-lovers-secondary flex items-center justify-center shadow-lg shadow-lovers-primary/30">
                    <Heart className="w-10 h-10 text-white animate-heart-beat" />
                  </div>
                  <div className="flex flex-col items-center">
                    <Sparkles className="w-6 h-6 text-lovers-secondary animate-pulse" />
                    <div className="text-2xl my-1">💞</div>
                    <Sparkles className="w-6 h-6 text-lovers-primary animate-pulse" style={{ animationDelay: '0.5s' }} />
                  </div>
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-lovers-secondary to-lovers-primary flex items-center justify-center shadow-lg shadow-lovers-secondary/30">
                    <Heart className="w-10 h-10 text-white animate-heart-beat" style={{ animationDelay: '0.3s' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Greeting */}
          <h1 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-lovers-primary via-lovers-secondary to-lovers-primary bg-clip-text text-transparent">
            {greeting} ✨
          </h1>
          <p className="text-lg text-muted-foreground">
            Welcome to your Dream Room
          </p>

          {/* Love Streak Badge */}
          {loveStreak > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-lovers-primary/20 to-lovers-secondary/20 border border-lovers-primary/30">
              <Flame className="w-5 h-5 text-orange-400 animate-pulse" />
              <span className="font-semibold text-lovers-primary">{loveStreak} Day Streak</span>
              <span className="text-xl">🔥</span>
            </div>
          )}
        </div>

        {/* Main Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Love Chat */}
          <Card 
            className="glass border-lovers-primary/20 hover:border-lovers-primary/40 cursor-pointer group transition-all hover:shadow-lg hover:shadow-lovers-primary/10"
            onClick={() => onNavigate('chats')}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-lovers-primary to-lovers-secondary flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                  <MessageCircle className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-1">Love Messages</h3>
                  <p className="text-sm text-muted-foreground">Send sweet messages to {partnerName}</p>
                </div>
                <Heart className="w-5 h-5 text-lovers-primary/50 group-hover:text-lovers-primary transition-colors" />
              </div>
            </CardContent>
          </Card>

          {/* Dream Room */}
          <Card 
            className="glass border-lovers-primary/20 hover:border-lovers-primary/40 cursor-pointer group transition-all hover:shadow-lg hover:shadow-lovers-primary/10"
            onClick={() => onNavigate('dreamroom')}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-lovers-secondary to-lovers-primary flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                  <Moon className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-1">Dream Room</h3>
                  <p className="text-sm text-muted-foreground">Your private virtual sanctuary</p>
                </div>
                <Star className="w-5 h-5 text-lovers-secondary/50 group-hover:text-lovers-secondary transition-colors" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Romantic Features */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-lovers-primary" />
            <span>Our Special Features</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Calendar, label: 'Our Calendar', section: 'dreamroom', emoji: '📅' },
              { icon: Lock, label: 'Love Vault', section: 'vault', emoji: '🔐' },
              { icon: Music, label: 'Our Playlist', section: 'music-notes', emoji: '🎵' },
              { icon: Heart, label: 'Mood Sync', section: 'mood-sync', emoji: '💫' },
            ].map((item, idx) => (
              <Card 
                key={idx}
                className="glass border-white/10 hover:border-lovers-primary/30 cursor-pointer group transition-all"
                onClick={() => onNavigate(item.section)}
              >
                <CardContent className="p-4 text-center">
                  <div className="text-2xl mb-2">{item.emoji}</div>
                  <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                    {item.label}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Night Mode Indicator */}
        {isNightTime && (
          <Card className="glass border-lovers-primary/20 bg-gradient-to-r from-lovers-primary/5 to-lovers-secondary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Moon className="w-5 h-5 text-lovers-primary" />
                  <div>
                    <p className="font-medium">Night Mode Active</p>
                    <p className="text-sm text-muted-foreground">Dream Room is open for you both</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className="w-4 h-4 text-yellow-400 blink-star" 
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <Button 
            variant="outline" 
            className="h-auto py-4 flex-col gap-2 border-lovers-primary/30 hover:bg-lovers-primary/10"
            onClick={() => onNavigate('calls')}
          >
            <span className="text-xl">📞</span>
            <span className="text-xs">Voice Call</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex-col gap-2 border-lovers-primary/30 hover:bg-lovers-primary/10"
            onClick={() => onNavigate('games')}
          >
            <span className="text-xl">🎮</span>
            <span className="text-xs">Play Together</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex-col gap-2 border-lovers-primary/30 hover:bg-lovers-primary/10"
            onClick={() => onNavigate('stories')}
          >
            <span className="text-xl">📸</span>
            <span className="text-xs">Moments</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
