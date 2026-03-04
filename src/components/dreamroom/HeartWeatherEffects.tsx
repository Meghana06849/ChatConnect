import React, { useMemo } from 'react';

type TimeOfDay = 'midnight' | 'night' | 'dawn' | 'morning' | 'day' | 'sunset' | 'evening';

const getTimeOfDay = (): TimeOfDay => {
  const h = new Date().getHours();
  if (h >= 0 && h < 3) return 'midnight';
  if (h >= 3 && h < 5) return 'night';
  if (h >= 5 && h < 7) return 'dawn';
  if (h >= 7 && h < 10) return 'morning';
  if (h >= 10 && h < 17) return 'day';
  if (h >= 17 && h < 20) return 'sunset';
  return 'evening';
};

const getSkyGradient = (time: TimeOfDay): string => {
  switch (time) {
    case 'midnight':
      return 'linear-gradient(180deg, hsl(240 60% 5%) 0%, hsl(260 50% 10%) 50%, hsl(280 40% 15%) 100%)';
    case 'night':
      return 'linear-gradient(180deg, hsl(250 55% 8%) 0%, hsl(270 45% 14%) 50%, hsl(290 38% 18%) 100%)';
    case 'dawn':
      return 'linear-gradient(180deg, hsl(260 40% 15%) 0%, hsl(280 35% 25%) 40%, hsl(20 60% 40%) 80%, hsl(35 80% 55%) 100%)';
    case 'morning':
      return 'linear-gradient(180deg, hsl(210 50% 55%) 0%, hsl(30 70% 65%) 60%, hsl(45 90% 75%) 100%)';
    case 'day':
      return 'linear-gradient(180deg, hsl(210 60% 60%) 0%, hsl(200 50% 70%) 50%, hsl(190 40% 80%) 100%)';
    case 'sunset':
      return 'linear-gradient(180deg, hsl(260 40% 25%) 0%, hsl(340 60% 40%) 40%, hsl(20 80% 50%) 70%, hsl(40 90% 60%) 100%)';
    case 'evening':
      return 'linear-gradient(180deg, hsl(250 55% 12%) 0%, hsl(270 45% 18%) 40%, hsl(300 40% 25%) 80%, hsl(320 35% 22%) 100%)';
  }
};

export const HeartWeatherEffects: React.FC = () => {
  const time = useMemo(getTimeOfDay, []);

  const raindrops = useMemo(() =>
    Array.from({ length: 25 }, (_, i) => ({
      id: i,
      left: 5 + Math.random() * 90,
      delay: Math.random() * 2,
      duration: 0.6 + Math.random() * 0.4,
      height: 8 + Math.random() * 12,
    })), []);

  const midnightStars = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: 5 + Math.random() * 90,
      y: 5 + Math.random() * 70,
      size: 0.8 + Math.random() * 2.5,
      delay: Math.random() * 4,
      duration: 1.5 + Math.random() * 3,
    })), []);

  const showRain = time === 'night' || time === 'evening';
  const showSunrise = time === 'dawn' || time === 'morning';
  const showMidnightStars = time === 'midnight';
  const showSunset = time === 'sunset';

  return (
    <>
      {/* Dynamic sky overlay */}
      <div className="absolute inset-0 transition-all duration-1000" style={{
        background: getSkyGradient(time),
        opacity: 0.85,
      }} />

      {/* Midnight: dense bright stars */}
      {showMidnightStars && midnightStars.map(s => (
        <div key={s.id} className="absolute rounded-full dream-star-twinkle" style={{
          left: `${s.x}%`,
          top: `${s.y}%`,
          width: `${s.size}px`,
          height: `${s.size}px`,
          background: 'hsl(45 100% 95%)',
          boxShadow: `0 0 ${s.size * 4}px ${s.size * 1.5}px hsla(45 100% 90% / 0.6)`,
          animationDuration: `${s.duration}s`,
          animationDelay: `${s.delay}s`,
        }} />
      ))}

      {/* Rain effect for night/evening */}
      {showRain && raindrops.map(r => (
        <div key={r.id} className="absolute dream-raindrop" style={{
          left: `${r.left}%`,
          top: '-5%',
          width: '1px',
          height: `${r.height}px`,
          background: 'linear-gradient(180deg, transparent, hsla(210 80% 75% / 0.6))',
          animationDelay: `${r.delay}s`,
          animationDuration: `${r.duration}s`,
        }} />
      ))}

      {/* Sunrise warm glow */}
      {showSunrise && (
        <>
          <div className="absolute bottom-0 left-0 right-0 h-[60%] dream-sunrise-pulse" style={{
            background: 'radial-gradient(ellipse 100% 80% at 50% 100%, hsla(35 100% 65% / 0.4) 0%, hsla(20 80% 55% / 0.2) 40%, transparent 70%)',
          }} />
          <div className="absolute bottom-[20%] left-1/2 -translate-x-1/2 w-[60%] h-[30%] rounded-full blur-2xl dream-sunrise-pulse" style={{
            background: 'hsla(40 100% 70% / 0.3)',
            animationDelay: '1s',
          }} />
        </>
      )}

      {/* Sunset amber glow */}
      {showSunset && (
        <div className="absolute bottom-0 left-0 right-0 h-[50%]" style={{
          background: 'radial-gradient(ellipse 120% 70% at 50% 100%, hsla(15 90% 50% / 0.35) 0%, hsla(340 60% 40% / 0.2) 50%, transparent 80%)',
        }} />
      )}
    </>
  );
};
