import React, { useMemo } from 'react';
import { Heart, Video, Phone } from 'lucide-react';

interface DreamNightWindowProps {
  partnerOnline: boolean;
  inCall: boolean;
  onToggleCall: () => void;
  loveStreak: number;
}

export const DreamNightWindow: React.FC<DreamNightWindowProps> = ({
  partnerOnline,
  inCall,
  onToggleCall,
  loveStreak,
}) => {
  // Moon phase based on streak (0-7 phases)
  const moonPhase = useMemo(() => {
    const phase = loveStreak % 30;
    if (phase < 4) return '🌑';
    if (phase < 8) return '🌒';
    if (phase < 12) return '🌓';
    if (phase < 16) return '🌔';
    if (phase < 20) return '🌕';
    if (phase < 24) return '🌖';
    if (phase < 28) return '🌗';
    return '🌘';
  }, [loveStreak]);

  const stars = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: 8 + Math.random() * 84,
      y: 8 + Math.random() * 60,
      size: 1 + Math.random() * 1.5,
      delay: Math.random() * 4,
      duration: 2 + Math.random() * 3,
    })), []);

  return (
    <div className="relative w-full aspect-[16/7] md:aspect-[16/6] rounded-2xl overflow-hidden mb-3">
      {/* Night sky gradient */}
      <div className="absolute inset-0 transition-all duration-1000" style={{
        background: partnerOnline
          ? 'linear-gradient(180deg, hsl(240 50% 8%) 0%, hsl(270 40% 14%) 40%, hsl(310 35% 18%) 80%, hsl(330 30% 22%) 100%)'
          : 'linear-gradient(180deg, hsl(240 50% 6%) 0%, hsl(260 35% 10%) 40%, hsl(280 30% 14%) 80%, hsl(300 25% 16%) 100%)',
      }} />

      {/* Soft vignette */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse 70% 70% at 50% 50%, transparent 30%, hsla(260 40% 5% / 0.6) 100%)',
      }} />

      {/* Ambient candle glow - bottom */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse 50% 30% at 20% 90%, hsla(30 80% 55% / 0.12) 0%, transparent 60%)',
      }} />
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse 50% 30% at 80% 85%, hsla(30 80% 55% / 0.1) 0%, transparent 60%)',
      }} />

      {/* Moon */}
      <div className="absolute top-3 right-8 md:right-12 dream-moon">
        <div className="relative">
          <span className="text-3xl md:text-4xl">{moonPhase}</span>
          <div className="absolute -inset-4 rounded-full blur-xl" style={{
            background: 'radial-gradient(circle, hsla(45 100% 85% / 0.25) 0%, transparent 70%)',
          }} />
        </div>
      </div>

      {/* Stars */}
      {stars.map((s) => (
        <div key={s.id} className="absolute rounded-full dream-star-twinkle" style={{
          left: `${s.x}%`,
          top: `${s.y}%`,
          width: `${s.size}px`,
          height: `${s.size}px`,
          background: 'hsl(45 100% 90%)',
          boxShadow: `0 0 ${s.size * 2}px ${s.size}px hsla(45 100% 90% / 0.4)`,
          animationDuration: `${s.duration}s`,
          animationDelay: `${s.delay}s`,
        }} />
      ))}

      {/* Warm pulse when both online */}
      {partnerOnline && (
        <div className="absolute inset-0 animate-pulse-slow" style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 70%, hsla(320 80% 55% / 0.08) 0%, transparent 60%)',
        }} />
      )}

      {/* Heart wall frame - glowing */}
      <div className="absolute top-4 left-5 md:left-8">
        <div className={`relative ${partnerOnline ? 'animate-heart-beat' : ''}`}>
          <Heart className="w-8 h-8 md:w-10 md:h-10 text-[hsl(var(--lovers-primary))]" fill="hsl(var(--lovers-primary))" />
          <div className="absolute inset-0 blur-md opacity-60">
            <Heart className="w-8 h-8 md:w-10 md:h-10 text-[hsl(var(--lovers-primary))]" fill="hsl(var(--lovers-primary))" />
          </div>
        </div>
      </div>

      {/* Framed couple photo */}
      <div className="absolute top-6 left-16 md:left-24 w-7 h-9 md:w-9 md:h-11 rounded-sm border border-[hsl(var(--lovers-primary)/0.4)]"
        style={{ background: 'linear-gradient(135deg, hsla(320 60% 50% / 0.25), hsla(270 50% 40% / 0.25))' }}>
        <div className="flex items-center justify-center h-full text-xs md:text-sm">💑</div>
      </div>

      {/* Call buttons */}
      <div className="absolute top-3 right-3 z-10 flex gap-1.5">
        <button onClick={onToggleCall}
          className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center backdrop-blur-sm transition-all hover:scale-110 active:scale-95"
          style={{
            background: inCall
              ? 'hsla(0 70% 50% / 0.85)'
              : 'linear-gradient(135deg, hsla(320 80% 55% / 0.7), hsla(270 60% 50% / 0.7))',
            boxShadow: '0 0 12px 2px hsla(320 100% 60% / 0.2)',
          }}>
          <Video className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
        </button>
        <button className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center backdrop-blur-sm transition-all hover:scale-110 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, hsla(320 80% 55% / 0.7), hsla(270 60% 50% / 0.7))',
            boxShadow: '0 0 12px 2px hsla(320 100% 60% / 0.2)',
          }}>
          <Phone className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
        </button>
      </div>

      {/* In-call heart frame */}
      {inCall && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-20 h-18 md:w-28 md:h-24 rounded-2xl flex items-center justify-center border border-[hsl(var(--lovers-primary)/0.5)]"
            style={{
              background: 'linear-gradient(135deg, hsla(320 40% 25% / 0.85), hsla(270 30% 20% / 0.85))',
              boxShadow: '0 0 30px 8px hsla(320 80% 55% / 0.15)',
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            }}>
            <Heart className="w-7 h-7 md:w-9 md:h-9 text-[hsl(var(--lovers-primary))] animate-heart-beat" />
          </div>
          <div className="absolute -inset-2 rounded-2xl dream-heart-ring opacity-25"
            style={{ border: '1px solid hsl(var(--lovers-primary))' }} />
        </div>
      )}

      {/* Couch */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
        <div className="text-3xl md:text-4xl" style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.5))' }}>🛋️</div>
        <div className="absolute -bottom-1 w-16 h-3 rounded-full blur-md mx-auto left-1/2 -translate-x-1/2" style={{
          background: partnerOnline ? 'hsla(340 70% 50% / 0.35)' : 'hsla(340 60% 40% / 0.2)',
        }} />
      </div>

      {/* Candles */}
      {[
        { x: '8%', y: '70%', delay: '0s' },
        { x: '88%', y: '65%', delay: '1.5s' },
        { x: '14%', y: '78%', delay: '0.8s' },
        { x: '82%', y: '75%', delay: '2s' },
      ].map((c, i) => (
        <div key={i} className="absolute text-lg" style={{ left: c.x, top: c.y }}>
          <span>🕯️</span>
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full blur-sm animate-pulse"
            style={{
              background: partnerOnline ? 'hsla(35 100% 65% / 0.85)' : 'hsla(35 100% 60% / 0.5)',
              animationDelay: c.delay,
            }} />
        </div>
      ))}

      {/* Fairy lights across top */}
      <div className="absolute top-0 left-0 right-0 flex justify-around px-3 pt-1">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full blink-star"
            style={{
              background: i % 2 === 0 ? 'hsla(320 100% 70% / 0.8)' : 'hsla(45 100% 80% / 0.8)',
              boxShadow: `0 0 5px 1px ${i % 2 === 0 ? 'hsla(320 100% 70% / 0.3)' : 'hsla(45 100% 80% / 0.3)'}`,
              animationDelay: `${i * 0.3}s`,
            }} />
        ))}
      </div>

      {/* Rose petals */}
      {['🌹', '🥀', '🌸'].map((r, i) => (
        <div key={i} className="absolute text-sm opacity-50 animate-float"
          style={{ left: `${25 + i * 25}%`, top: `${78 + i * 2}%`, animationDelay: `${i * 1.2}s` }}>
          {r}
        </div>
      ))}

      {/* Partner presence badge */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-10">
        {partnerOnline ? (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] text-white/90 backdrop-blur-sm"
            style={{ background: 'hsla(320 60% 40% / 0.5)', border: '1px solid hsla(320 80% 60% / 0.3)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Your Love is here 💕
          </div>
        ) : (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] text-white/60 backdrop-blur-sm"
            style={{ background: 'hsla(0 0% 0% / 0.3)', border: '1px solid hsla(0 0% 100% / 0.1)' }}>
            Your Love is away 💭
          </div>
        )}
      </div>
    </div>
  );
};
