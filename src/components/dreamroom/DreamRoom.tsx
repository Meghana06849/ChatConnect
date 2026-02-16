import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DreamRoomWelcome } from './DreamRoomWelcome';
import { CoupleCalendar } from './CoupleCalendar';
import { LoveVault } from './LoveVault';
import { GamesHub } from '@/components/features/GamesHub';
import { useProfile } from '@/hooks/useProfile';
import { useDreamRoomPresence } from '@/hooks/useDreamRoomPresence';
import { supabase } from '@/integrations/supabase/client';
import { 
  Home, 
  Heart,
  Sparkles,
  Calendar,
  Gamepad2,
  Lock,
  Music,
  Flame,
  Phone,
  Video,
  Send,
  Smile,
} from 'lucide-react';

interface DreamRoomProps {
  isTimeRestricted?: boolean;
}

const roomDecorations = {
  candles: [
    { id: 1, x: '8%', y: '65%', size: 'text-2xl', delay: '0s' },
    { id: 2, x: '88%', y: '60%', size: 'text-xl', delay: '1.5s' },
    { id: 3, x: '15%', y: '72%', size: 'text-lg', delay: '0.8s' },
    { id: 4, x: '82%', y: '70%', size: 'text-2xl', delay: '2s' },
  ],
};

export const DreamRoom: React.FC<DreamRoomProps> = ({ isTimeRestricted = false }) => {
  const [showWelcome, setShowWelcome] = useState(true);
  const [currentView, setCurrentView] = useState<'main' | 'calendar' | 'vault' | 'games'>('main');
  const [loveLevel, setLoveLevel] = useState(42);
  const [loveStreak, setLoveStreak] = useState(0);
  const [togetherSince, setTogetherSince] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState('Your Love');
  const [chatMessage, setChatMessage] = useState('');
  const [inCall, setInCall] = useState(false);

  const { profile } = useProfile();
  const { partnerOnline, partnerName: presencePartnerName } = useDreamRoomPresence();

  useEffect(() => {
    if (presencePartnerName) setPartnerName(presencePartnerName);
  }, [presencePartnerName]);

  useEffect(() => {
    const loadData = async () => {
      if (!profile?.user_id) return;

      const { data: streakData } = await supabase
        .from('love_streaks')
        .select('current_streak, created_at')
        .eq('user_id', profile.user_id)
        .maybeSingle();

      if (streakData) {
        setLoveStreak(streakData.current_streak || 0);
        setTogetherSince(streakData.created_at);
      }

      if (profile.lovers_partner_id && !presencePartnerName) {
        const { data: partnerData } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', profile.lovers_partner_id)
          .maybeSingle();
        if (partnerData?.display_name) setPartnerName(partnerData.display_name);
      }
    };
    loadData();
  }, [profile, presencePartnerName]);

  const daysTogether = useMemo(() => {
    if (!togetherSince) return 0;
    return Math.floor((Date.now() - new Date(togetherSince).getTime()) / 86400000);
  }, [togetherSince]);

  const handleSendChat = () => {
    if (!chatMessage.trim()) return;
    // TODO: integrate with dream chat send
    setChatMessage('');
  };

  if (showWelcome) {
    return <DreamRoomWelcome onEnter={() => setShowWelcome(false)} />;
  }

  if (currentView !== 'main') {
    const viewMap: Record<string, React.ReactNode> = {
      calendar: <CoupleCalendar />,
      vault: <LoveVault />,
      games: <div className="pt-16 px-4 md:px-6"><GamesHub /></div>,
    };
    return (
      <div className="relative min-h-screen">
        <DreamRoomBackground bothOnline={false} />
        <Button
          onClick={() => setCurrentView('main')}
          className="absolute top-4 left-4 z-20 bg-gradient-to-r from-[hsl(var(--lovers-primary))] to-[hsl(var(--lovers-secondary))] text-white shadow-lg"
          size="sm"
        >
          <Home className="w-4 h-4 mr-2" />
          Dream Room
        </Button>
        <div className="relative z-10">{viewMap[currentView]}</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <DreamRoomBackground bothOnline={partnerOnline} />

      <div className="relative z-10 flex flex-col items-center min-h-screen p-4 md:p-6 pb-24">
        <div className="w-full max-w-3xl mx-auto">

          {/* Room Interior Scene */}
          <div className={`relative w-full aspect-[16/10] md:aspect-[16/9] rounded-3xl overflow-hidden shadow-2xl mb-4 transition-all duration-1000 ${
            partnerOnline 
              ? 'border-2 border-[hsl(var(--lovers-primary)/0.5)]' 
              : 'border border-[hsl(var(--lovers-primary)/0.2)]'
          }`}
            style={{
              background: partnerOnline
                ? 'linear-gradient(180deg, hsl(280 40% 14%) 0%, hsl(320 35% 18%) 40%, hsl(340 30% 22%) 70%, hsl(20 35% 16%) 100%)'
                : 'linear-gradient(180deg, hsl(280 40% 10%) 0%, hsl(320 30% 13%) 40%, hsl(340 25% 16%) 70%, hsl(20 30% 12%) 100%)',
            }}
          >
            {/* Warm ambient glow - intensifies when both online */}
            <div className="absolute inset-0 transition-opacity duration-1000" style={{
              background: 'radial-gradient(ellipse 80% 60% at 50% 70%, hsla(340, 60%, 40%, 0.25) 0%, transparent 70%)',
              opacity: partnerOnline ? 1 : 0.6,
            }} />
            <div className="absolute inset-0" style={{
              background: 'radial-gradient(circle at 20% 80%, hsla(30, 80%, 50%, 0.15) 0%, transparent 40%)',
            }} />
            <div className="absolute inset-0" style={{
              background: 'radial-gradient(circle at 80% 75%, hsla(30, 80%, 50%, 0.12) 0%, transparent 35%)',
            }} />

            {/* Extra warm glow when both online */}
            {partnerOnline && (
              <div className="absolute inset-0 animate-pulse-slow" style={{
                background: 'radial-gradient(ellipse 60% 40% at 50% 60%, hsla(320, 80%, 50%, 0.12) 0%, transparent 60%)',
              }} />
            )}

            {/* Call button - top right */}
            <div className="absolute top-3 right-3 z-10 flex gap-2">
              <button
                onClick={() => setInCall(!inCall)}
                className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center backdrop-blur-sm transition-all hover:scale-110 active:scale-95"
                style={{
                  background: inCall
                    ? 'hsla(0, 70%, 50%, 0.8)'
                    : 'linear-gradient(135deg, hsla(320, 80%, 50%, 0.7), hsla(270, 60%, 45%, 0.7))',
                  boxShadow: '0 0 15px 3px hsla(320, 100%, 60%, 0.2)',
                }}
              >
                <Video className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </button>
              <button
                className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center backdrop-blur-sm transition-all hover:scale-110 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, hsla(320, 80%, 50%, 0.7), hsla(270, 60%, 45%, 0.7))',
                  boxShadow: '0 0 15px 3px hsla(320, 100%, 60%, 0.2)',
                }}
              >
                <Phone className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </button>
            </div>

            {/* Window / Heart video area */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2">
              {inCall ? (
                /* Heart-shaped video call window */
                <div className="relative">
                  <div className="w-28 h-24 md:w-40 md:h-32 overflow-hidden flex items-center justify-center rounded-3xl border-2 border-[hsl(var(--lovers-primary)/0.5)]"
                    style={{
                      background: 'linear-gradient(135deg, hsla(320, 40%, 25%, 0.9), hsla(270, 30%, 20%, 0.9))',
                      boxShadow: '0 0 30px 8px hsla(320, 80%, 50%, 0.15)',
                      clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                    }}
                  >
                    <div className="text-center">
                      <Heart className="w-8 h-8 md:w-10 md:h-10 text-[hsl(var(--lovers-primary))] mx-auto animate-heart-beat" />
                      <p className="text-[10px] text-white/60 mt-1">In Call</p>
                    </div>
                  </div>
                  {/* Glowing ring */}
                  <div className="absolute -inset-2 rounded-3xl dream-heart-ring opacity-30"
                    style={{ border: '1px solid hsl(var(--lovers-primary))' }}
                  />
                </div>
              ) : (
                /* Normal window with moonlight */
                <div className="w-24 h-20 md:w-32 md:h-24 rounded-t-full border-2 border-[hsl(var(--lovers-primary)/0.3)]"
                  style={{
                    background: 'linear-gradient(180deg, hsla(220, 60%, 30%, 0.6) 0%, hsla(260, 40%, 20%, 0.8) 100%)',
                    boxShadow: '0 0 40px 15px hsla(220, 60%, 40%, 0.1)',
                  }}
                >
                  <div className="absolute top-3 right-4 w-6 h-6 md:w-8 md:h-8 rounded-full animate-float"
                    style={{
                      background: 'radial-gradient(circle at 30% 30%, hsl(45 100% 95%), hsl(45 80% 75%))',
                      boxShadow: '0 0 20px 8px hsla(45, 100%, 85%, 0.3)',
                    }}
                  />
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="absolute rounded-full bg-white blink-star"
                      style={{
                        width: `${1 + Math.random()}px`,
                        height: `${1 + Math.random()}px`,
                        left: `${10 + Math.random() * 60}%`,
                        top: `${15 + Math.random() * 50}%`,
                        animationDelay: `${Math.random() * 3}s`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Heart Wall Frame - Glowing */}
            <div className="absolute top-8 md:top-6 left-6 md:left-10">
              <div className={`relative ${partnerOnline ? 'animate-heart-beat' : ''}`}>
                <Heart className="w-10 h-10 md:w-12 md:h-12 text-[hsl(var(--lovers-primary))]" fill="hsl(var(--lovers-primary))" />
                <div className="absolute inset-0 blur-md">
                  <Heart className="w-10 h-10 md:w-12 md:h-12 text-[hsl(var(--lovers-primary))]" fill="hsl(var(--lovers-primary))" />
                </div>
              </div>
            </div>

            {/* Small framed photo on wall */}
            <div className="absolute top-10 right-20 md:right-24 w-8 h-10 md:w-10 md:h-12 rounded-sm border border-[hsl(var(--lovers-primary)/0.4)]"
              style={{ background: 'linear-gradient(135deg, hsla(320, 60%, 50%, 0.3), hsla(270, 50%, 40%, 0.3))' }}
            >
              <div className="flex items-center justify-center h-full text-sm md:text-base">💑</div>
            </div>

            {/* Cozy Couch */}
            <div className="absolute bottom-[18%] left-1/2 -translate-x-1/2 flex flex-col items-center">
              <div className="text-4xl md:text-6xl" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))' }}>
                🛋️
              </div>
              <div className="absolute -bottom-2 w-20 h-4 rounded-full blur-lg" style={{
                background: partnerOnline ? 'hsla(340, 70%, 45%, 0.4)' : 'hsla(340, 60%, 40%, 0.25)',
              }} />
            </div>

            {/* Candles */}
            {roomDecorations.candles.map((candle) => (
              <div key={candle.id} className={`absolute ${candle.size}`} style={{ left: candle.x, top: candle.y }}>
                <div className="relative">
                  <span>🕯️</span>
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full blur-sm animate-pulse"
                    style={{
                      background: partnerOnline ? 'hsla(35, 100%, 65%, 0.8)' : 'hsla(35, 100%, 60%, 0.5)',
                      animationDelay: candle.delay,
                    }}
                  />
                </div>
              </div>
            ))}

            {/* Rose petals */}
            {['🌹', '🥀', '🌸'].map((rose, i) => (
              <div key={i} className="absolute text-lg opacity-60 animate-float"
                style={{
                  left: `${25 + i * 25}%`,
                  top: `${75 + i * 3}%`,
                  animationDelay: `${i * 1.2}s`,
                }}
              >
                {rose}
              </div>
            ))}

            {/* Fairy lights */}
            <div className="absolute top-1 left-0 right-0 flex justify-around px-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full blink-star"
                  style={{
                    background: i % 2 === 0
                      ? 'hsla(320, 100%, 70%, 0.8)'
                      : 'hsla(45, 100%, 80%, 0.8)',
                    boxShadow: `0 0 6px 2px ${i % 2 === 0 ? 'hsla(320, 100%, 70%, 0.4)' : 'hsla(45, 100%, 80%, 0.4)'}`,
                    animationDelay: `${i * 0.3}s`,
                  }}
                />
              ))}
            </div>

            {/* Partner presence */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
              {partnerOnline ? (
                <Badge className="bg-[hsl(var(--lovers-primary)/0.3)] text-white border-[hsl(var(--lovers-primary)/0.5)] backdrop-blur-sm text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mr-1.5 animate-pulse" />
                  {partnerName} is here 💕
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-black/30 text-white/70 border-white/20 backdrop-blur-sm text-xs">
                  {partnerName} is away 💭
                </Badge>
              )}
            </div>
          </div>

          {/* Compact stats strip */}
          <div className="flex items-center justify-center gap-3 md:gap-5 mb-4 text-xs text-white/70">
            <div className="flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-[hsl(var(--lovers-primary))]" />
              <span>{togetherSince ? new Date(togetherSince).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Today'}</span>
              <span className="text-[hsl(var(--lovers-primary))]">· {daysTogether}d</span>
            </div>
            <div className="w-px h-3 bg-white/20" />
            <div className="flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span>{loveStreak}🔥</span>
            </div>
            <div className="w-px h-3 bg-white/20" />
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[hsl(var(--lovers-secondary))]" />
              <span>Lv.{loveLevel}</span>
              <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--lovers-primary))] to-[hsl(var(--lovers-secondary))]"
                  style={{ width: '73%' }}
                />
              </div>
            </div>
          </div>

          {/* Feature Navigation */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Calendar', emoji: '📅', view: 'calendar' as const },
              { label: 'Love Vault', emoji: '🔐', view: 'vault' as const },
              { label: 'Games', emoji: '🎮', view: 'games' as const },
              { label: 'Playlist', emoji: '🎵', view: 'main' as const },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => setCurrentView(item.view)}
                className="rounded-2xl p-4 text-center border border-[hsl(var(--lovers-primary)/0.15)] hover:border-[hsl(var(--lovers-primary)/0.4)] transition-all hover:scale-105 active:scale-95"
                style={{ background: 'linear-gradient(135deg, hsla(320, 40%, 15%, 0.5), hsla(270, 30%, 12%, 0.5))' }}
              >
                <div className="text-2xl mb-1">{item.emoji}</div>
                <p className="text-xs font-medium text-white/80">{item.label}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Chat Bar - fixed at bottom */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 w-[calc(100%-2rem)] max-w-lg">
        <div className="flex items-center gap-2 rounded-full px-4 py-2 backdrop-blur-xl border border-[hsl(var(--lovers-primary)/0.3)]"
          style={{
            background: 'linear-gradient(135deg, hsla(320, 40%, 15%, 0.85), hsla(270, 30%, 12%, 0.9))',
            boxShadow: '0 8px 32px hsla(320, 50%, 20%, 0.3), inset 0 1px 0 hsla(320, 80%, 60%, 0.1)',
          }}
        >
          <button className="text-white/50 hover:text-white/80 transition-colors flex-shrink-0">
            <Smile className="w-5 h-5" />
          </button>
          <Input
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
            placeholder={`Whisper to ${partnerName}...`}
            className="flex-1 bg-transparent border-0 text-white placeholder:text-white/30 text-sm h-8 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <button
            onClick={handleSendChat}
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-110 active:scale-95"
            style={{
              background: chatMessage.trim()
                ? 'linear-gradient(135deg, hsl(var(--lovers-primary)), hsl(var(--lovers-secondary)))'
                : 'hsla(320, 40%, 30%, 0.5)',
            }}
          >
            <Send className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

/** Ambient background - reacts when both partners are online */
const DreamRoomBackground: React.FC<{ bothOnline: boolean }> = ({ bothOnline }) => {
  const particles = useMemo(() =>
    Array.from({ length: bothOnline ? 18 : 10 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 15,
      duration: 12 + Math.random() * 10,
      size: 0.4 + Math.random() * 0.6,
      emoji: i % 3 === 0 ? '✨' : '💕',
    })), [bothOnline]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      <div className="absolute inset-0 transition-all duration-1000" style={{
        background: bothOnline
          ? 'linear-gradient(180deg, hsl(280 45% 10%) 0%, hsl(320 40% 15%) 40%, hsl(340 35% 19%) 70%, hsl(20 30% 13%) 100%)'
          : 'linear-gradient(180deg, hsl(280 45% 8%) 0%, hsl(320 35% 12%) 40%, hsl(340 30% 16%) 70%, hsl(20 25% 10%) 100%)',
      }} />
      <div className="absolute inset-0 transition-opacity duration-1000" style={{
        background: 'radial-gradient(ellipse 60% 50% at 30% 80%, hsla(320, 70%, 45%, 0.12) 0%, transparent 60%)',
        opacity: bothOnline ? 1.5 : 1,
      }} />
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse 50% 40% at 70% 75%, hsla(30, 80%, 50%, 0.08) 0%, transparent 50%)',
      }} />
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse 80% 40% at 50% 20%, hsla(270, 50%, 30%, 0.15) 0%, transparent 60%)',
      }} />
      {/* Extra warm pulse when both online */}
      {bothOnline && (
        <div className="absolute inset-0 animate-pulse-slow" style={{
          background: 'radial-gradient(circle at 50% 50%, hsla(320, 80%, 50%, 0.06) 0%, transparent 50%)',
        }} />
      )}
      {particles.map((p) => (
        <div key={p.id} className="absolute dream-floating-heart"
          style={{
            left: `${p.x}%`,
            bottom: '-5%',
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            fontSize: `${p.size * 1.2}rem`,
            opacity: bothOnline ? 0.18 : 0.1,
          }}
        >
          {p.emoji}
        </div>
      ))}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse 70% 70% at 50% 50%, transparent 0%, hsla(280, 40%, 5%, 0.5) 100%)',
      }} />
    </div>
  );
};
