import React, { useMemo, useRef, useEffect } from 'react';
import { Heart, Video, Phone, PhoneOff, Mic, MicOff } from 'lucide-react';
import { HeartWeatherEffects } from './HeartWeatherEffects';
import { RoomDecorations } from './RoomDecorations';

interface DreamRoomSceneProps {
  partnerOnline: boolean;
  loveStreak: number;
  isCallActive: boolean;
  remoteStream: MediaStream | null;
  localStream: MediaStream | null;
  onStartVideoCall: () => void;
  onStartVoiceCall: () => void;
  onEndCall: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  callDuration: number;
  onNavigate: (view: 'calendar' | 'vault' | 'games' | 'main') => void;
  profile: any;
}

export const DreamRoomScene: React.FC<DreamRoomSceneProps> = ({
  partnerOnline,
  loveStreak,
  isCallActive,
  remoteStream,
  localStream,
  onStartVideoCall,
  onStartVoiceCall,
  onEndCall,
  isMuted,
  onToggleMute,
  callDuration,
  onNavigate,
  profile,
}) => {
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  // Attach video streams
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Moon phase based on streak
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
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: 10 + Math.random() * 80,
      y: 5 + Math.random() * 50,
      size: 1 + Math.random() * 2,
      delay: Math.random() * 5,
      duration: 2 + Math.random() * 3,
    })), []);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full max-w-lg mx-auto px-3 flex-1 flex flex-col items-center justify-center"
      style={{ minHeight: 'clamp(280px, 50vh, 420px)' }}>

      {/* Room decorations system */}
      <RoomDecorations />

      {/* Fairy lights across top */}
      <div className="absolute top-0 left-4 right-4 z-20">
        <svg viewBox="0 0 400 30" className="w-full h-8" preserveAspectRatio="none">
          {/* Wire */}
          <path d="M 10 8 Q 60 22 110 10 Q 160 0 200 12 Q 240 24 290 8 Q 340 -4 390 10"
            fill="none" stroke="hsla(0,0%,100%,0.15)" strokeWidth="1" />
          {/* Bulbs */}
          {[40, 90, 150, 200, 255, 310, 370].map((x, i) => (
            <g key={i}>
              <circle cx={x} cy={i % 2 === 0 ? 12 : 16} r="4"
                fill={i % 3 === 0 ? 'hsla(45,100%,75%,0.9)' : i % 3 === 1 ? 'hsla(320,100%,70%,0.8)' : 'hsla(30,100%,70%,0.85)'}
                className="blink-star" style={{ animationDelay: `${i * 0.4}s` }} />
              <circle cx={x} cy={i % 2 === 0 ? 12 : 16} r="8"
                fill={i % 3 === 0 ? 'hsla(45,100%,75%,0.15)' : 'hsla(320,100%,70%,0.12)'}
                className="blink-star" style={{ animationDelay: `${i * 0.4}s` }} />
            </g>
          ))}
        </svg>
      </div>

      {/* Heart-shaped night window */}
      <div className="relative mt-6 mb-2" style={{ width: 'clamp(220px, 65vw, 320px)', height: 'clamp(180px, 50vw, 260px)' }}>
        {/* Heart border glow */}
        <div className="absolute inset-0" style={{
          clipPath: 'path("M 160 30 C 200 -10, 280 10, 280 70 C 280 140, 160 220, 160 220 C 160 220, 40 140, 40 70 C 40 10, 120 -10, 160 30 Z")',
          transform: 'scale(1.05)',
          background: partnerOnline
            ? 'linear-gradient(135deg, hsla(320 100% 65% / 0.6), hsla(270 60% 55% / 0.5))'
            : 'linear-gradient(135deg, hsla(320 80% 55% / 0.3), hsla(270 50% 45% / 0.3))',
          filter: 'blur(8px)',
        }} />

        {/* Heart shape main */}
        <div className="absolute inset-0 overflow-hidden" style={{
          clipPath: 'path("M 160 30 C 200 -10, 280 10, 280 70 C 280 140, 160 220, 160 220 C 160 220, 40 140, 40 70 C 40 10, 120 -10, 160 30 Z")',
        }}>
          {/* Dynamic weather-based sky */}
          <HeartWeatherEffects />

          {/* Clouds at bottom of heart */}
          <div className="absolute bottom-0 left-0 right-0 h-[40%]" style={{
            background: 'radial-gradient(ellipse 120% 60% at 50% 100%, hsla(280 40% 30% / 0.8) 0%, hsla(300 35% 25% / 0.5) 40%, transparent 70%)',
          }} />
          <div className="absolute bottom-0 left-0 right-0 h-[30%]" style={{
            background: 'radial-gradient(ellipse 80% 50% at 30% 100%, hsla(310 45% 35% / 0.5) 0%, transparent 60%)',
          }} />

          {/* Stars inside heart */}
          {stars.map(s => (
            <div key={s.id} className="absolute rounded-full dream-star-twinkle" style={{
              left: `${s.x}%`, top: `${s.y}%`,
              width: `${s.size}px`, height: `${s.size}px`,
              background: 'hsl(45 100% 90%)',
              boxShadow: `0 0 ${s.size * 3}px ${s.size}px hsla(45 100% 90% / 0.4)`,
              animationDuration: `${s.duration}s`,
              animationDelay: `${s.delay}s`,
            }} />
          ))}

          {/* Moon */}
          <div className="absolute top-[18%] left-1/2 -translate-x-1/2">
            <span className="text-3xl md:text-4xl drop-shadow-lg">{moonPhase}</span>
            <div className="absolute -inset-6 rounded-full blur-xl" style={{
              background: 'radial-gradient(circle, hsla(45 100% 85% / 0.3) 0%, transparent 70%)',
            }} />
          </div>

          {/* Floating hearts inside window */}
          {['❤', '💕', '❤'].map((h, i) => (
            <div key={i} className="absolute text-sm animate-float" style={{
              left: `${20 + i * 25}%`,
              top: `${30 + i * 12}%`,
              color: 'hsl(var(--lovers-primary))',
              opacity: 0.5,
              animationDelay: `${i * 1.5}s`,
              animationDuration: `${3 + i}s`,
            }}>
              {h}
            </div>
          ))}

          {/* VIDEO CALL - renders inside heart */}
          {isCallActive && remoteStream && (
            <>
              <video ref={remoteVideoRef} autoPlay playsInline
                className="absolute inset-0 w-full h-full object-cover" />
              {/* Local video pip */}
              <video ref={localVideoRef} autoPlay playsInline muted
                className="absolute bottom-2 right-2 w-16 h-12 object-cover rounded-lg border border-white/20"
                style={{ boxShadow: '0 2px 8px hsla(0 0% 0% / 0.5)' }} />
              {/* Call duration */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] text-white font-medium"
                style={{ background: 'hsla(0 0% 0% / 0.5)', backdropFilter: 'blur(8px)' }}>
                {formatDuration(callDuration)}
              </div>
              {/* In-call controls */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
                <button onClick={onToggleMute}
                  className="w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md"
                  style={{ background: isMuted ? 'hsla(0 70% 50% / 0.8)' : 'hsla(0 0% 100% / 0.2)' }}>
                  {isMuted ? <MicOff className="w-3.5 h-3.5 text-white" /> : <Mic className="w-3.5 h-3.5 text-white" />}
                </button>
                <button onClick={onEndCall}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'hsla(0 70% 50% / 0.9)' }}>
                  <PhoneOff className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Heart border ring */}
        <div className="absolute inset-0 pointer-events-none" style={{
          clipPath: 'path("M 160 30 C 200 -10, 280 10, 280 70 C 280 140, 160 220, 160 220 C 160 220, 40 140, 40 70 C 40 10, 120 -10, 160 30 Z")',
          border: '2px solid hsla(320 100% 65% / 0.4)',
          boxShadow: partnerOnline
            ? '0 0 30px 5px hsla(320 100% 60% / 0.25), inset 0 0 20px 5px hsla(320 80% 55% / 0.15)'
            : '0 0 15px 3px hsla(320 100% 60% / 0.1)',
        }} />

        {/* Call buttons - top right of heart area */}
        {!isCallActive && (
          <div className="absolute -top-1 -right-1 z-20 flex gap-1.5">
            <button onClick={onStartVideoCall}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, hsla(320 80% 55% / 0.85), hsla(270 60% 50% / 0.85))',
                boxShadow: '0 0 12px 2px hsla(320 100% 60% / 0.3)',
                border: '1px solid hsla(320 80% 65% / 0.3)',
              }}>
              <Video className="w-4 h-4 text-white" />
            </button>
            <button onClick={onStartVoiceCall}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, hsla(270 60% 50% / 0.85), hsla(320 80% 55% / 0.85))',
                boxShadow: '0 0 12px 2px hsla(270 70% 55% / 0.3)',
                border: '1px solid hsla(270 60% 60% / 0.3)',
              }}>
              <Phone className="w-4 h-4 text-white" />
            </button>
          </div>
        )}
      </div>

      {/* Partner avatars on sides */}
      <div className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-1">
        {/* User avatar */}
        <div className="w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, hsla(220 60% 50% / 0.6), hsla(270 50% 45% / 0.6))',
            border: '2px solid hsla(270 60% 55% / 0.5)',
            boxShadow: '0 0 16px 3px hsla(270 50% 50% / 0.2)',
          }}>
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="You" className="w-full h-full rounded-full object-cover" />
          ) : (
            <div className="text-2xl">👤</div>
          )}
        </div>
        <button onClick={() => onNavigate('vault')}
          className="text-[10px] text-white/60 hover:text-white/90 transition-colors mt-1">
          Memories
        </button>
      </div>

      <div className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-1">
        {/* Partner avatar */}
        <div className="w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center relative"
          style={{
            background: 'linear-gradient(135deg, hsla(320 60% 50% / 0.6), hsla(340 50% 45% / 0.6))',
            border: `2px solid ${partnerOnline ? 'hsla(320 100% 65% / 0.6)' : 'hsla(320 50% 40% / 0.3)'}`,
            boxShadow: partnerOnline ? '0 0 16px 3px hsla(320 80% 55% / 0.3)' : '0 0 8px 2px hsla(320 50% 40% / 0.1)',
          }}>
          <div className="text-2xl">👤</div>
          {/* Online indicator */}
          {partnerOnline && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-400 border-2 animate-pulse"
              style={{ borderColor: 'hsl(270 50% 10%)' }} />
          )}
        </div>
        <button onClick={() => onNavigate('games')}
          className="text-[10px] text-white/60 hover:text-white/90 transition-colors mt-1">
          Games
        </button>
      </div>

      {/* Couch below heart */}
      <div className="relative -mt-4 z-10">
        <div className="text-5xl md:text-6xl" style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.6))' }}>
          🛋️
        </div>
        {/* Heart cushions on couch */}
        <div className="absolute top-1 left-2 text-sm animate-float" style={{ animationDelay: '0.5s' }}>❤️</div>
        <div className="absolute top-1 right-2 text-sm animate-float" style={{ animationDelay: '1.5s' }}>❤️</div>
      </div>

      {/* Coffee table with candles */}
      <div className="relative -mt-1 z-10 flex items-end gap-1">
        <span className="text-xs opacity-70">🕯️</span>
        <div className="w-16 h-3 rounded-full" style={{
          background: 'linear-gradient(180deg, hsla(20 40% 35% / 0.8), hsla(20 30% 25% / 0.9))',
          boxShadow: '0 3px 8px hsla(0 0% 0% / 0.5)',
        }} />
        <span className="text-xs opacity-70">🕯️</span>
        {/* Candle glow */}
        <div className="absolute -top-3 left-0 w-4 h-4 rounded-full blur-md animate-pulse" style={{
          background: 'hsla(35 100% 65% / 0.6)',
        }} />
        <div className="absolute -top-3 right-0 w-4 h-4 rounded-full blur-md animate-pulse" style={{
          background: 'hsla(35 100% 65% / 0.5)',
          animationDelay: '1s',
        }} />
      </div>

      {/* Floor cushions */}
      <div className="flex justify-between w-48 -mt-1 z-10">
        <div className="text-lg opacity-40">🟤</div>
        <div className="text-lg opacity-40">🟤</div>
      </div>

      {/* Ambient glow from candles on scene */}
      <div className="absolute bottom-[15%] left-1/2 -translate-x-1/2 w-48 h-24 rounded-full blur-3xl pointer-events-none" style={{
        background: partnerOnline
          ? 'radial-gradient(ellipse, hsla(30 80% 55% / 0.12) 0%, transparent 70%)'
          : 'radial-gradient(ellipse, hsla(30 70% 50% / 0.06) 0%, transparent 70%)',
      }} />

      {/* Side furniture - Memories shelf */}
      <div className="absolute left-2 md:left-6 bottom-[22%] z-10">
        <button onClick={() => onNavigate('vault')}
          className="w-12 h-10 md:w-14 md:h-12 rounded-lg flex items-center justify-center transition-all hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, hsla(320 40% 18% / 0.6), hsla(280 35% 15% / 0.6))',
            border: '1px solid hsla(320 50% 40% / 0.2)',
          }}>
          <div className="text-lg">📷</div>
        </button>
      </div>

      {/* Side furniture - Calendar */}
      <div className="absolute right-2 md:right-6 bottom-[22%] z-10">
        <button onClick={() => onNavigate('calendar')}
          className="w-12 h-10 md:w-14 md:h-12 rounded-lg flex items-center justify-center transition-all hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, hsla(280 35% 15% / 0.6), hsla(320 40% 18% / 0.6))',
            border: '1px solid hsla(280 50% 40% / 0.2)',
          }}>
          <div className="text-lg">📅</div>
        </button>
      </div>

      {/* Partner presence */}
      <div className="absolute bottom-[12%] left-1/2 -translate-x-1/2 z-10">
        {partnerOnline ? (
          <div className="flex items-center gap-1 px-3 py-1 rounded-full text-[11px] text-white/80 backdrop-blur-sm"
            style={{ background: 'hsla(320 60% 40% / 0.4)', border: '1px solid hsla(320 80% 60% / 0.2)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Your Love is here 💕
          </div>
        ) : (
          <div className="flex items-center gap-1 px-3 py-1 rounded-full text-[11px] text-white/50 backdrop-blur-sm"
            style={{ background: 'hsla(0 0% 0% / 0.3)', border: '1px solid hsla(0 0% 100% / 0.08)' }}>
            Your Love is away 💭
          </div>
        )}
      </div>
    </div>
  );
};
