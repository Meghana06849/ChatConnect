import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';

interface DreamRoomProps {
  isTimeRestricted?: boolean;
}

// Cozy room decoration items with positions
const roomDecorations = {
  candles: [
    { id: 1, x: '8%', y: '65%', size: 'text-2xl', delay: '0s' },
    { id: 2, x: '88%', y: '60%', size: 'text-xl', delay: '1.5s' },
    { id: 3, x: '15%', y: '72%', size: 'text-lg', delay: '0.8s' },
    { id: 4, x: '82%', y: '70%', size: 'text-2xl', delay: '2s' },
  ],
  plants: [
    { id: 1, x: '5%', y: '80%', emoji: '🪴', size: 'text-3xl' },
    { id: 2, x: '92%', y: '78%', emoji: '🌿', size: 'text-2xl' },
    { id: 3, x: '72%', y: '85%', emoji: '🌱', size: 'text-xl' },
  ],
  sparkles: Array.from({ length: 15 }, (_, i) => ({
    id: i,
    x: `${5 + Math.random() * 90}%`,
    y: `${5 + Math.random() * 40}%`,
    delay: `${Math.random() * 5}s`,
    duration: `${2 + Math.random() * 3}s`,
    size: Math.random() * 3 + 1,
  })),
};

export const DreamRoom: React.FC<DreamRoomProps> = ({ isTimeRestricted = false }) => {
  const [showWelcome, setShowWelcome] = useState(true);
  const [currentView, setCurrentView] = useState<'main' | 'calendar' | 'vault' | 'games'>('main');
  const [loveLevel, setLoveLevel] = useState(42);
  const [loveStreak, setLoveStreak] = useState(0);
  const [togetherSince, setTogetherSince] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState('Your Love');

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

  if (showWelcome) {
    return <DreamRoomWelcome onEnter={() => setShowWelcome(false)} />;
  }

  // Sub-views with back button
  if (currentView !== 'main') {
    const viewMap: Record<string, React.ReactNode> = {
      calendar: <CoupleCalendar />,
      vault: <LoveVault />,
      games: <div className="pt-16 px-4 md:px-6"><GamesHub /></div>,
    };
    return (
      <div className="relative min-h-screen">
        <DreamRoomBackground />
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
      <DreamRoomBackground />

      {/* Room Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4 md:p-6">
        <div className="w-full max-w-3xl mx-auto">

          {/* Room Interior Scene */}
          <div className="relative w-full aspect-[16/10] md:aspect-[16/9] rounded-3xl overflow-hidden border border-[hsl(var(--lovers-primary)/0.3)] shadow-2xl mb-6"
            style={{
              background: 'linear-gradient(180deg, hsl(280 40% 12%) 0%, hsl(320 30% 15%) 40%, hsl(340 25% 18%) 70%, hsl(20 30% 14%) 100%)',
            }}
          >
            {/* Warm ambient glow */}
            <div className="absolute inset-0" style={{
              background: 'radial-gradient(ellipse 80% 60% at 50% 70%, hsla(340, 60%, 40%, 0.25) 0%, transparent 70%)',
            }} />
            <div className="absolute inset-0" style={{
              background: 'radial-gradient(circle at 20% 80%, hsla(30, 80%, 50%, 0.15) 0%, transparent 40%)',
            }} />
            <div className="absolute inset-0" style={{
              background: 'radial-gradient(circle at 80% 75%, hsla(30, 80%, 50%, 0.12) 0%, transparent 35%)',
            }} />

            {/* Window with moonlight */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 w-24 h-20 md:w-32 md:h-24 rounded-t-full border-2 border-[hsl(var(--lovers-primary)/0.3)]"
              style={{
                background: 'linear-gradient(180deg, hsla(220, 60%, 30%, 0.6) 0%, hsla(260, 40%, 20%, 0.8) 100%)',
                boxShadow: '0 0 40px 15px hsla(220, 60%, 40%, 0.1)',
              }}
            >
              {/* Moon in window */}
              <div className="absolute top-3 right-4 w-6 h-6 md:w-8 md:h-8 rounded-full animate-float"
                style={{
                  background: 'radial-gradient(circle at 30% 30%, hsl(45 100% 95%), hsl(45 80% 75%))',
                  boxShadow: '0 0 20px 8px hsla(45, 100%, 85%, 0.3)',
                }}
              />
              {/* Stars in window */}
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

            {/* Heart Wall Frame - Glowing */}
            <div className="absolute top-8 md:top-6 right-6 md:right-10">
              <div className="relative animate-heart-beat">
                <Heart className="w-10 h-10 md:w-14 md:h-14 text-[hsl(var(--lovers-primary))]" fill="hsl(var(--lovers-primary))" />
                <div className="absolute inset-0 blur-md">
                  <Heart className="w-10 h-10 md:w-14 md:h-14 text-[hsl(var(--lovers-primary))]" fill="hsl(var(--lovers-primary))" />
                </div>
              </div>
            </div>

            {/* Small framed photo on wall */}
            <div className="absolute top-10 left-6 md:left-10 w-8 h-10 md:w-10 md:h-12 rounded-sm border border-[hsl(var(--lovers-primary)/0.4)]"
              style={{ background: 'linear-gradient(135deg, hsla(320, 60%, 50%, 0.3), hsla(270, 50%, 40%, 0.3))' }}
            >
              <div className="flex items-center justify-center h-full text-sm md:text-base">💑</div>
            </div>

            {/* Cozy Couch - Centerpiece */}
            <div className="absolute bottom-[18%] left-1/2 -translate-x-1/2 flex flex-col items-center">
              <div className="text-4xl md:text-6xl" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))' }}>
                🛋️
              </div>
              {/* Cushion glow */}
              <div className="absolute -bottom-2 w-20 h-4 rounded-full blur-lg" style={{
                background: 'hsla(340, 60%, 40%, 0.3)',
              }} />
            </div>

            {/* Candles with flicker glow */}
            {roomDecorations.candles.map((candle) => (
              <div key={candle.id} className={`absolute ${candle.size}`} style={{ left: candle.x, top: candle.y }}>
                <div className="relative">
                  <span>🕯️</span>
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full blur-sm animate-pulse"
                    style={{
                      background: 'hsla(35, 100%, 60%, 0.6)',
                      animationDelay: candle.delay,
                    }}
                  />
                </div>
              </div>
            ))}

            {/* Plants */}
            {roomDecorations.plants.map((plant) => (
              <div key={plant.id} className={`absolute ${plant.size}`} style={{ left: plant.x, top: plant.y }}>
                {plant.emoji}
              </div>
            ))}

            {/* Rose petals scattered */}
            {['🌹', '🥀', '🌸'].map((rose, i) => (
              <div key={i} className="absolute text-lg opacity-60 animate-float"
                style={{
                  left: `${25 + i * 25}%`,
                  top: `${75 + Math.random() * 10}%`,
                  animationDelay: `${i * 1.2}s`,
                }}
              >
                {rose}
              </div>
            ))}

            {/* Fairy lights string across top */}
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

            {/* Partner presence indicator */}
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

          {/* Together Since & Love Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            {/* Together Since */}
            <div className="col-span-2 md:col-span-1 rounded-2xl p-4 text-center border border-[hsl(var(--lovers-primary)/0.2)]"
              style={{ background: 'linear-gradient(135deg, hsla(320, 50%, 20%, 0.6), hsla(270, 40%, 18%, 0.6))' }}
            >
              <Heart className="w-5 h-5 text-[hsl(var(--lovers-primary))] mx-auto mb-1 animate-heart-beat" />
              <p className="text-xs text-white/60">Together Since</p>
              <p className="text-lg font-bold text-white">
                {togetherSince ? new Date(togetherSince).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Today 💕'}
              </p>
              <p className="text-xs text-[hsl(var(--lovers-primary))]">{daysTogether} days of love</p>
            </div>

            {/* Love Streak */}
            <div className="rounded-2xl p-4 text-center border border-[hsl(var(--lovers-primary)/0.2)]"
              style={{ background: 'linear-gradient(135deg, hsla(340, 50%, 20%, 0.6), hsla(20, 40%, 18%, 0.6))' }}
            >
              <Flame className="w-5 h-5 text-orange-400 mx-auto mb-1 animate-pulse" />
              <p className="text-xs text-white/60">Love Streak</p>
              <p className="text-lg font-bold text-white">{loveStreak} 🔥</p>
              <p className="text-xs text-orange-400">days</p>
            </div>

            {/* Love Level */}
            <div className="rounded-2xl p-4 text-center border border-[hsl(var(--lovers-primary)/0.2)]"
              style={{ background: 'linear-gradient(135deg, hsla(280, 50%, 20%, 0.6), hsla(320, 40%, 18%, 0.6))' }}
            >
              <Sparkles className="w-5 h-5 text-[hsl(var(--lovers-secondary))] mx-auto mb-1" />
              <p className="text-xs text-white/60">Love Level</p>
              <p className="text-lg font-bold text-white">Lv.{loveLevel}</p>
              <div className="w-full h-1.5 bg-white/10 rounded-full mt-1 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--lovers-primary))] to-[hsl(var(--lovers-secondary))]"
                  style={{ width: '73%' }}
                />
              </div>
            </div>
          </div>

          {/* Feature Navigation */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Calendar, label: 'Calendar', emoji: '📅', view: 'calendar' as const },
              { icon: Lock, label: 'Love Vault', emoji: '🔐', view: 'vault' as const },
              { icon: Gamepad2, label: 'Games', emoji: '🎮', view: 'games' as const },
              { icon: Music, label: 'Playlist', emoji: '🎵', view: 'main' as const },
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
    </div>
  );
};

/** Ambient background with warm pink/purple lighting and floating particles */
const DreamRoomBackground: React.FC = () => {
  const particles = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 15,
      duration: 12 + Math.random() * 10,
      size: 0.4 + Math.random() * 0.6,
      emoji: i % 3 === 0 ? '✨' : '💕',
    })), []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      {/* Base warm dark gradient */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(180deg, hsl(280 45% 8%) 0%, hsl(320 35% 12%) 40%, hsl(340 30% 16%) 70%, hsl(20 25% 10%) 100%)',
      }} />
      {/* Warm ambient light pools */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse 60% 50% at 30% 80%, hsla(320, 70%, 45%, 0.12) 0%, transparent 60%)',
      }} />
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse 50% 40% at 70% 75%, hsla(30, 80%, 50%, 0.08) 0%, transparent 50%)',
      }} />
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse 80% 40% at 50% 20%, hsla(270, 50%, 30%, 0.15) 0%, transparent 60%)',
      }} />
      {/* Floating particles */}
      {particles.map((p) => (
        <div key={p.id} className="absolute dream-floating-heart"
          style={{
            left: `${p.x}%`,
            bottom: '-5%',
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            fontSize: `${p.size * 1.2}rem`,
            opacity: 0.12,
          }}
        >
          {p.emoji}
        </div>
      ))}
      {/* Soft vignette */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse 70% 70% at 50% 50%, transparent 0%, hsla(280, 40%, 5%, 0.5) 100%)',
      }} />
    </div>
  );
};
