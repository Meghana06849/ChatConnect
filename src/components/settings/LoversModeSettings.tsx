import React, { useState } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Heart, Moon, Star, Sparkles, Lock, Bell, Palette,
  Music, Calendar, Shield, Gift, Crown, Gem, Users,
  Camera, MessageCircle, Phone, Eye, EyeOff, Coins,
  Zap, Flame, ChevronRight, ArrowLeft
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LoversModeSettingsProps {
  onBack: () => void;
}

export const LoversModeSettings: React.FC<LoversModeSettingsProps> = ({ onBack }) => {
  const { profile } = useProfile();
  const { toast } = useToast();
  
  // Settings state
  const [dreamNotifications, setDreamNotifications] = useState(true);
  const [heartbeatSync, setHeartbeatSync] = useState(true);
  const [moodSharing, setMoodSharing] = useState(true);
  const [dreamCallSounds, setDreamCallSounds] = useState(true);
  const [floatingHearts, setFloatingHearts] = useState(true);
  const [anniversaryReminders, setAnniversaryReminders] = useState(true);
  const [secretVaultPin, setSecretVaultPin] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(320,70%,8%)] via-[hsl(280,60%,12%)] to-[hsl(320,50%,10%)] relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating hearts */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-float-up opacity-20"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 10}s`,
              animationDuration: `${15 + Math.random() * 10}s`
            }}
          >
            <Heart className="w-4 h-4 text-lovers-primary" fill="currentColor" />
          </div>
        ))}
        
        {/* Sparkles */}
        {[...Array(30)].map((_, i) => (
          <div
            key={`sparkle-${i}`}
            className="absolute w-1 h-1 bg-white rounded-full animate-twinkle opacity-40"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`
            }}
          />
        ))}
        
        {/* Gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-lovers-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-lovers-secondary/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <ScrollArea className="h-screen">
        <div className="relative z-10 p-6 max-w-2xl mx-auto pb-20">
          {/* Header */}
          <div className="flex items-center space-x-4 mb-8">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onBack}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Heart className="w-10 h-10 text-lovers-primary animate-heart-beat" fill="currentColor" />
                  <Sparkles className="w-4 h-4 text-yellow-400 absolute -top-1 -right-1 animate-pulse" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Dream Room Settings</h1>
                  <p className="text-lovers-primary/70 text-sm">Your private romantic universe ✨</p>
                </div>
              </div>
            </div>
          </div>

          {/* Partner Card */}
          <Card className="bg-gradient-to-br from-lovers-primary/20 to-lovers-secondary/20 border-lovers-primary/30 backdrop-blur-xl mb-6 overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Avatar className="w-20 h-20 border-4 border-lovers-primary/50">
                    <AvatarFallback className="bg-gradient-to-br from-lovers-primary to-lovers-secondary text-white text-2xl">
                      {profile?.display_name?.[0] || '💕'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 bg-lovers-primary rounded-full p-1">
                    <Heart className="w-4 h-4 text-white" fill="currentColor" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white">{profile?.display_name || 'Dreamer'}</h3>
                  <p className="text-lovers-primary/80">Connected with love 💕</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge className="bg-lovers-primary/30 text-lovers-primary border-lovers-primary/50">
                      <Crown className="w-3 h-3 mr-1" />
                      Dream Partner
                    </Badge>
                    <Badge className="bg-yellow-500/30 text-yellow-400 border-yellow-500/50">
                      <Flame className="w-3 h-3 mr-1" />
                      7 Day Streak
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Love Coins Card */}
          <Card className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30 backdrop-blur-xl mb-6">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                    <Coins className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">Love Coins</h4>
                    <p className="text-yellow-400/80 text-sm">Unlock special features</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-yellow-400">{profile?.love_coins || 0}</p>
                  <Button size="sm" className="mt-1 bg-yellow-500/30 hover:bg-yellow-500/40 text-yellow-400 border border-yellow-500/50">
                    <Gift className="w-3 h-3 mr-1" />
                    Earn More
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dream Features Section */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-white flex items-center space-x-2">
                <Moon className="w-5 h-5 text-lovers-primary" />
                <span>Dream Features</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SettingToggle
                icon={<Heart className="w-5 h-5" />}
                title="Heartbeat Sync"
                description="Share your heartbeat live with your partner"
                checked={heartbeatSync}
                onCheckedChange={setHeartbeatSync}
              />
              <Separator className="bg-white/10" />
              <SettingToggle
                icon={<Sparkles className="w-5 h-5" />}
                title="Mood Sharing"
                description="Let your partner feel your emotions"
                checked={moodSharing}
                onCheckedChange={setMoodSharing}
              />
              <Separator className="bg-white/10" />
              <SettingToggle
                icon={<Heart className="w-5 h-5" />}
                title="Floating Hearts"
                description="Animated hearts in Dream Room"
                checked={floatingHearts}
                onCheckedChange={setFloatingHearts}
              />
            </CardContent>
          </Card>

          {/* Dream Calls Section */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-white flex items-center space-x-2">
                <Phone className="w-5 h-5 text-lovers-primary" />
                <span>Dream Calls</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SettingToggle
                icon={<Music className="w-5 h-5" />}
                title="Romantic Sound Effects"
                description="Soft chimes and heartbeat sounds"
                checked={dreamCallSounds}
                onCheckedChange={setDreamCallSounds}
              />
              <Separator className="bg-white/10" />
              <SettingItem
                icon={<Palette className="w-5 h-5" />}
                title="Call Background"
                description="Choose your dream call atmosphere"
                action={
                  <Button size="sm" variant="ghost" className="text-lovers-primary">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                }
              />
            </CardContent>
          </Card>

          {/* Notifications Section */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-white flex items-center space-x-2">
                <Bell className="w-5 h-5 text-lovers-primary" />
                <span>Dream Notifications</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SettingToggle
                icon={<MessageCircle className="w-5 h-5" />}
                title="Dream Messages"
                description="Notification for romantic messages"
                checked={dreamNotifications}
                onCheckedChange={setDreamNotifications}
              />
              <Separator className="bg-white/10" />
              <SettingToggle
                icon={<Calendar className="w-5 h-5" />}
                title="Anniversary Reminders"
                description="Never forget special dates"
                checked={anniversaryReminders}
                onCheckedChange={setAnniversaryReminders}
              />
            </CardContent>
          </Card>

          {/* Privacy & Security */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-white flex items-center space-x-2">
                <Shield className="w-5 h-5 text-lovers-primary" />
                <span>Privacy & Security</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SettingToggle
                icon={<Lock className="w-5 h-5" />}
                title="Vault PIN Required"
                description="Extra security for Love Vault"
                checked={secretVaultPin}
                onCheckedChange={setSecretVaultPin}
              />
              <Separator className="bg-white/10" />
              <SettingItem
                icon={<Eye className="w-5 h-5" />}
                title="Screenshot Protection"
                description="Block screenshots in Dream Room"
                action={
                  <Switch defaultChecked />
                }
              />
              <Separator className="bg-white/10" />
              <SettingItem
                icon={<Lock className="w-5 h-5" />}
                title="Change Dream PIN"
                description="Update your secret access code"
                action={
                  <Button size="sm" variant="ghost" className="text-lovers-primary">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                }
              />
            </CardContent>
          </Card>

          {/* Appearance Section */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-white flex items-center space-x-2">
                <Palette className="w-5 h-5 text-lovers-primary" />
                <span>Appearance</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SettingItem
                icon={<Star className="w-5 h-5" />}
                title="Theme"
                description="Moonlight, Sunset, Aurora"
                action={
                  <Badge className="bg-lovers-primary/30 text-lovers-primary">Moonlight</Badge>
                }
              />
              <Separator className="bg-white/10" />
              <SettingItem
                icon={<Camera className="w-5 h-5" />}
                title="Chat Wallpaper"
                description="Set romantic backgrounds"
                action={
                  <Button size="sm" variant="ghost" className="text-lovers-primary">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                }
              />
            </CardContent>
          </Card>
        </div>
      </ScrollArea>

      <style>{`
        @keyframes float-up {
          0% {
            transform: translateY(100vh) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.2;
          }
          90% {
            opacity: 0.2;
          }
          100% {
            transform: translateY(-100px) rotate(360deg);
            opacity: 0;
          }
        }
        
        @keyframes twinkle {
          0%, 100% {
            opacity: 0.2;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.5);
          }
        }
        
        .animate-float-up {
          animation: float-up linear infinite;
        }
        
        .animate-twinkle {
          animation: twinkle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

// Helper Components
const SettingToggle: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}> = ({ icon, title, description, checked, onCheckedChange }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center space-x-3">
      <div className="text-lovers-primary">{icon}</div>
      <div>
        <p className="text-white font-medium">{title}</p>
        <p className="text-white/50 text-sm">{description}</p>
      </div>
    </div>
    <Switch 
      checked={checked} 
      onCheckedChange={onCheckedChange}
      className="data-[state=checked]:bg-lovers-primary"
    />
  </div>
);

const SettingItem: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  action: React.ReactNode;
}> = ({ icon, title, description, action }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center space-x-3">
      <div className="text-lovers-primary">{icon}</div>
      <div>
        <p className="text-white font-medium">{title}</p>
        <p className="text-white/50 text-sm">{description}</p>
      </div>
    </div>
    {action}
  </div>
);