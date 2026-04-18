import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProfile } from '@/hooks/useProfile';
import { useDreamRoomPresence } from '@/hooks/useDreamRoomPresence';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
  Wifi,
  WifiOff,
  Phone,
  Video,
  UserPlus,
  LinkIcon,
} from 'lucide-react';

interface DreamRoomHomeProps {
  onNavigate: (section: string) => void;
}

interface LoversFriend {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  is_online: boolean | null;
}

export const DreamRoomHome: React.FC<DreamRoomHomeProps> = ({ onNavigate }) => {
  const { profile, linkLoversPartner } = useProfile();
  const { 
    partnerOnline, 
    partnerName: presencePartnerName, 
    partnerMood,
    isConnected 
  } = useDreamRoomPresence();
  const { toast } = useToast();
  
  const [loveStreak, setLoveStreak] = useState(0);
  const [partnerName, setPartnerName] = useState('Your Love');
  const [greeting, setGreeting] = useState('');
  const [partnerLinkStatus, setPartnerLinkStatus] = useState<'linked' | 'pending' | 'not_linked'>('not_linked');
  const [availableLovers, setAvailableLovers] = useState<LoversFriend[]>([]);
  const [linking, setLinking] = useState(false);

  const navigateWithAccess = (section: string) => {
    const dreamLockedSections = new Set(['dreamroom', 'dreamroom-call', 'dreamroom-video-call', 'games', 'vault']);
    if (dreamLockedSections.has(section) && partnerLinkStatus !== 'linked') {
      toast({
        title: 'Link required',
        description: 'Link your partner first to unlock Dream Room features.',
      });
      onNavigate('friends');
      return;
    }
    onNavigate(section);
  };
  
  const currentHour = new Date().getHours();
  const isNightTime = currentHour >= 18 || currentHour <= 6;

  useEffect(() => {
    if (presencePartnerName) setPartnerName(presencePartnerName);
  }, [presencePartnerName]);

  // Check partner link status
  useEffect(() => {
    const checkPartnerLinkStatus = async () => {
      if (!profile?.user_id || !profile?.lovers_partner_id) {
        setPartnerLinkStatus('not_linked');
        return;
      }

      const { data, error } = await supabase.rpc('are_linked_lovers', {
        _user_a: profile.user_id,
        _user_b: profile.lovers_partner_id,
      });

      if (error) {
        setPartnerLinkStatus('pending');
        return;
      }

      setPartnerLinkStatus(data ? 'linked' : 'pending');
    };

    checkPartnerLinkStatus();
  }, [profile?.user_id, profile?.lovers_partner_id]);

  // Auto-detect available Lovers Mode friends when not linked
  useEffect(() => {
    const loadAvailableLovers = async () => {
      if (!profile?.user_id || profile?.lovers_partner_id) {
        setAvailableLovers([]);
        return;
      }

      // Find accepted friends who have lovers_mode_enabled
      const { data: contacts } = await supabase
        .from('contacts')
        .select('user_id, contact_user_id')
        .or(`user_id.eq.${profile.user_id},contact_user_id.eq.${profile.user_id}`)
        .eq('status', 'accepted');

      if (!contacts?.length) return;

      const friendIds = contacts.map(c =>
        c.user_id === profile.user_id ? c.contact_user_id : c.user_id
      );

      const { data: loversProfiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, is_online')
        .in('user_id', friendIds)
        .eq('lovers_mode_enabled', true)
        .is('lovers_partner_id', null);

      setAvailableLovers(loversProfiles || []);
    };

    loadAvailableLovers();
  }, [profile?.user_id, profile?.lovers_partner_id]);

  // Handle one-tap partner linking
  const handleLinkPartner = async (partnerId: string, name: string) => {
    setLinking(true);
    try {
      await linkLoversPartner(partnerId);
      toast({
        title: '💜 Dream Partner Linked!',
        description: `You and ${name} are now connected in the Dream Room.`,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not link partner.';
      toast({
        title: 'Linking failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLinking(false);
    }
  };

  useEffect(() => {
    if (currentHour >= 5 && currentHour < 12) {
      setGreeting('Good morning, my love');
    } else if (currentHour >= 12 && currentHour < 17) {
      setGreeting('Thinking of you');
    } else if (currentHour >= 17 && currentHour < 21) {
      setGreeting('Good evening, sweetheart');
    } else {
      setGreeting('Sweet dreams await');
    }

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

      if (profile.lovers_partner_id && !presencePartnerName) {
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
  }, [profile, currentHour, presencePartnerName]);

  const romanticCardClass = 'border-lovers-primary/25 bg-gradient-to-br from-white/40 via-rose-50/20 to-fuchsia-100/15 backdrop-blur-xl shadow-[0_12px_36px_rgba(236,72,153,0.16)]';
  const romanticSoftCardClass = 'border-lovers-secondary/25 bg-gradient-to-br from-white/30 via-fuchsia-50/15 to-violet-100/10 backdrop-blur-xl shadow-[0_8px_28px_rgba(192,132,252,0.14)]';

  return (
    <div className="relative flex-1 min-h-full overflow-y-auto">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 bg-[linear-gradient(165deg,rgba(253,242,248,0.96)_0%,rgba(252,231,243,0.9)_34%,rgba(245,208,254,0.86)_68%,rgba(224,231,255,0.84)_100%)]" />
        <div className="absolute -top-24 -left-20 h-80 w-80 rounded-full bg-gradient-to-br from-rose-300/35 to-fuchsia-500/0 blur-3xl animate-pulse motion-reduce:animate-none" />
        <div className="absolute -right-20 top-1/3 h-72 w-72 rounded-full bg-gradient-to-br from-violet-300/30 to-indigo-500/0 blur-3xl animate-pulse [animation-delay:1.1s] motion-reduce:animate-none" />
        <div className="absolute inset-x-10 bottom-8 h-24 rounded-full bg-gradient-to-r from-transparent via-white/50 to-transparent blur-2xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto p-6">
        {/* Romantic Header */}
        <div className="text-center mb-8 relative">
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
                <div className={`absolute inset-0 blur-xl rounded-full scale-150 transition-all duration-500 ${
                  partnerOnline 
                    ? 'animate-pulse bg-gradient-to-r from-lovers-primary/50 to-lovers-secondary/50' 
                    : 'bg-gradient-to-r from-lovers-primary/20 to-lovers-secondary/20'
                }`} />
                <div className="relative flex items-center gap-4">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-lovers-primary to-lovers-secondary flex items-center justify-center shadow-lg shadow-lovers-primary/30">
                      <Heart className="w-10 h-10 text-white animate-heart-beat" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 border-2 border-background flex items-center justify-center">
                      <Wifi className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center">
                    <Sparkles className={`w-6 h-6 animate-pulse ${partnerOnline ? 'text-lovers-secondary' : 'text-muted-foreground/50'}`} />
                    <div className="text-2xl my-1">{partnerOnline ? '💞' : '💭'}</div>
                    <Sparkles className={`w-6 h-6 animate-pulse ${partnerOnline ? 'text-lovers-primary' : 'text-muted-foreground/50'}`} style={{ animationDelay: '0.5s' }} />
                  </div>
                  
                  <div className="relative">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-500 ${
                      partnerOnline 
                        ? 'bg-gradient-to-br from-lovers-secondary to-lovers-primary shadow-lovers-secondary/30' 
                        : 'bg-gradient-to-br from-muted to-muted-foreground/20 shadow-muted/30'
                    }`}>
                      <Heart className={`w-10 h-10 ${partnerOnline ? 'text-white animate-heart-beat' : 'text-muted-foreground/50'}`} style={{ animationDelay: '0.3s' }} />
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-background flex items-center justify-center ${
                      partnerOnline ? 'bg-green-500' : 'bg-muted-foreground/50'
                    }`}>
                      {partnerOnline ? <Wifi className="w-3 h-3 text-white" /> : <WifiOff className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              {partnerLinkStatus === 'linked' && partnerOnline ? (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-green-400 mr-2 animate-ping" />
                  {partnerName} is here with you {partnerMood || '💕'}
                </Badge>
              ) : partnerLinkStatus === 'linked' ? (
                <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground mr-2" />
                  {partnerName} is away
                </Badge>
              ) : null}
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-lovers-primary via-lovers-secondary to-lovers-primary bg-clip-text text-transparent">
            {greeting} ✨
          </h1>
          <p className="text-lg text-muted-foreground">
            {partnerLinkStatus === 'linked' && partnerOnline 
              ? `You and ${partnerName} are connected` 
              : partnerLinkStatus === 'linked'
                ? 'Welcome to your Dream Room'
                : 'Link your partner to unlock the Dream Room'
            }
          </p>

          {loveStreak > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-lovers-primary/20 to-lovers-secondary/20 border border-lovers-primary/30">
              <Flame className="w-5 h-5 text-orange-400 animate-pulse" />
              <span className="font-semibold text-lovers-primary">{loveStreak} Day Streak</span>
              <span className="text-xl">🔥</span>
            </div>
          )}
        </div>

        {/* Partner Link Status Card */}
        <Card className={`${romanticCardClass} mb-6`}>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  partnerLinkStatus === 'linked'
                    ? 'bg-lovers-primary/15 text-lovers-primary'
                    : partnerLinkStatus === 'pending'
                      ? 'bg-lovers-secondary/15 text-lovers-secondary'
                      : 'bg-muted text-muted-foreground'
                }`}>
                  {partnerLinkStatus === 'linked' ? (
                    <Heart className="w-5 h-5" />
                  ) : partnerLinkStatus === 'pending' ? (
                    <Moon className="w-5 h-5" />
                  ) : (
                    <Lock className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <p className="font-semibold">
                    {partnerLinkStatus === 'linked'
                      ? `Linked with ${partnerName}`
                      : partnerLinkStatus === 'pending'
                        ? 'Partner link pending'
                        : 'No Dream partner linked'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {partnerLinkStatus === 'linked'
                      ? 'Dream Room chat and calls are unlocked for both of you.'
                      : partnerLinkStatus === 'pending'
                        ? `Waiting for ${partnerName}... They need to enable Lovers Mode and link you back from their Friends list to activate Dream Room.`
                        : 'Link a Lovers Mode friend below or from Friends to unlock Dream Room.'}
                  </p>
                </div>
              </div>

              {partnerLinkStatus === 'linked' ? (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="btn-lovers gap-2"
                    onClick={() => navigateWithAccess('dreamroom')}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Chat
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-lovers-primary/30 hover:bg-lovers-primary/10 gap-2"
                    onClick={() => navigateWithAccess('dreamroom-video-call')}
                  >
                    <Video className="w-4 h-4" />
                    Video
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => navigateWithAccess('friends')}
                >
                  Go to Friends
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Status Legend Card */}
        {partnerLinkStatus === 'pending' && (
          <Card className={`${romanticSoftCardClass} mb-6`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Moon className="w-5 h-5 text-lovers-secondary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-lovers-secondary mb-1">What happens next?</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>✓ You've requested to link with {partnerName}</li>
                    <li>⏳ {partnerName} needs to enable Lovers Mode if they haven't already</li>
                    <li>💌 Then they'll link you back from their Friends list</li>
                    <li>💞 Once they do, Dream Room will activate!</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {partnerLinkStatus === 'not_linked' && availableLovers.length > 0 && (
          <Card className={`${romanticSoftCardClass} mb-6 animate-fade-in`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <UserPlus className="w-4 h-4 text-lovers-secondary" />
                <p className="font-semibold text-sm">Available Lovers Mode Friends</p>
              </div>
              <div className="space-y-2">
                {availableLovers.map(friend => (
                  <div key={friend.user_id} className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-lovers-primary/10 via-white/30 to-lovers-secondary/10 border border-lovers-primary/15 shadow-[0_8px_22px_rgba(244,114,182,0.12)]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-lovers-primary to-lovers-secondary flex items-center justify-center text-white font-bold text-sm">
                        {(friend.display_name || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{friend.display_name || 'Friend'}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${friend.is_online ? 'bg-green-400' : 'bg-muted-foreground/50'}`} />
                          {friend.is_online ? 'Online' : 'Offline'} · Lovers Mode enabled
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="btn-lovers gap-1.5"
                      disabled={linking}
                      onClick={() => handleLinkPartner(friend.user_id, friend.display_name || 'Partner')}
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      Link
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card 
            className={`${romanticCardClass} hover:border-lovers-primary/45 cursor-pointer group transition-all hover:shadow-[0_18px_44px_rgba(236,72,153,0.22)]`}
            onClick={() => navigateWithAccess('chats')}
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

          <Card 
            className={`${romanticCardClass} hover:border-lovers-primary/45 cursor-pointer group transition-all hover:shadow-[0_18px_44px_rgba(236,72,153,0.22)]`}
            onClick={() => navigateWithAccess('dreamroom')}
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
                className={`${romanticSoftCardClass} hover:border-lovers-primary/35 cursor-pointer group transition-all hover:-translate-y-0.5`}
                onClick={() => navigateWithAccess(item.section)}
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
          <Card className={`${romanticSoftCardClass} bg-gradient-to-r from-lovers-primary/12 via-white/30 to-lovers-secondary/12`}>
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
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Button 
            variant="outline" 
            className="h-auto py-4 flex-col gap-2 border-lovers-primary/35 bg-white/25 backdrop-blur-md hover:bg-lovers-primary/12"
            onClick={() => navigateWithAccess('dreamroom-call')}
          >
            <span className="text-xl">📞</span>
            <span className="text-xs">Voice Call</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex-col gap-2 border-lovers-primary/35 bg-white/25 backdrop-blur-md hover:bg-lovers-primary/12"
            onClick={() => navigateWithAccess('dreamroom-video-call')}
          >
            <span className="text-xl">🎥</span>
            <span className="text-xs">Video Call</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex-col gap-2 border-lovers-primary/35 bg-white/25 backdrop-blur-md hover:bg-lovers-primary/12"
            onClick={() => navigateWithAccess('games')}
          >
            <span className="text-xl">🎮</span>
            <span className="text-xs">Play Together</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex-col gap-2 border-lovers-primary/35 bg-white/25 backdrop-blur-md hover:bg-lovers-primary/12"
            onClick={() => navigateWithAccess('stories')}
          >
            <span className="text-xl">📸</span>
            <span className="text-xs">Moments</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
