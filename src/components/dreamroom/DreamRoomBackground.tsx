import React, { useMemo } from 'react';

interface DreamRoomBackgroundProps {
  bothOnline: boolean;
}

export const DreamRoomBackground: React.FC<DreamRoomBackgroundProps> = ({ bothOnline }) => {
  const particles = useMemo(() =>
    Array.from({ length: bothOnline ? 16 : 8 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 15,
      duration: 14 + Math.random() * 10,
      size: 0.4 + Math.random() * 0.5,
      emoji: i % 3 === 0 ? '✨' : '💕',
    })), [bothOnline]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      {/* Deep luxury gradient */}
      <div className="absolute inset-0 transition-all duration-1000" style={{
        background: bothOnline
          ? 'linear-gradient(180deg, hsl(270 50% 8%) 0%, hsl(300 40% 12%) 30%, hsl(330 35% 16%) 60%, hsl(350 30% 12%) 85%, hsl(0 0% 5%) 100%)'
          : 'linear-gradient(180deg, hsl(270 50% 6%) 0%, hsl(290 35% 9%) 30%, hsl(320 30% 12%) 60%, hsl(340 25% 9%) 85%, hsl(0 0% 4%) 100%)',
      }} />

      {/* Rose-gold highlight glow */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse 50% 40% at 30% 70%, hsla(320 70% 50% / 0.08) 0%, transparent 60%)',
        opacity: bothOnline ? 1 : 0.6,
      }} />
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse 40% 30% at 70% 80%, hsla(30 80% 55% / 0.06) 0%, transparent 50%)',
      }} />

      {/* Volumetric top glow */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse 80% 30% at 50% 10%, hsla(270 50% 30% / 0.12) 0%, transparent 60%)',
      }} />

      {/* Warm pulse when both online */}
      {bothOnline && (
        <div className="absolute inset-0 animate-pulse-slow" style={{
          background: 'radial-gradient(circle at 50% 50%, hsla(320 80% 55% / 0.04) 0%, transparent 50%)',
        }} />
      )}

      {/* Floating particles */}
      {particles.map((p) => (
        <div key={p.id} className="absolute dream-floating-heart"
          style={{
            left: `${p.x}%`,
            bottom: '-5%',
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            fontSize: `${p.size}rem`,
            opacity: bothOnline ? 0.15 : 0.08,
          }}>
          {p.emoji}
        </div>
      ))}

      {/* Screen-edge vignette for privacy feel */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse 75% 75% at 50% 50%, transparent 40%, hsla(270 40% 5% / 0.6) 100%)',
      }} />
    </div>
  );
};
