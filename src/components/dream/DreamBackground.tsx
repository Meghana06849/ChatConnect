import React, { useMemo } from 'react';

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  brightness: number;
}

interface FloatingHeart {
  id: number;
  x: number;
  delay: number;
  duration: number;
  size: number;
}

interface DreamBackgroundProps {
  showAurora?: boolean;
  showMoon?: boolean;
  density?: 'light' | 'medium' | 'dense';
}

const generateStars = (count: number): Star[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2.5 + 0.5,
    delay: Math.random() * 8,
    duration: Math.random() * 4 + 3,
    brightness: Math.random() * 0.5 + 0.5,
  }));
};

const generateHearts = (count: number): FloatingHeart[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 15,
    duration: Math.random() * 10 + 15,
    size: Math.random() * 0.8 + 0.4,
  }));
};

export const DreamBackground: React.FC<DreamBackgroundProps> = ({
  showAurora = true,
  showMoon = true,
  density = 'medium',
}) => {
  const starCount = density === 'dense' ? 80 : density === 'medium' ? 50 : 30;
  const heartCount = density === 'dense' ? 12 : density === 'medium' ? 8 : 5;

  const stars = useMemo(() => generateStars(starCount), [starCount]);
  const hearts = useMemo(() => generateHearts(heartCount), [heartCount]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Base gradient - midnight sky */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, hsl(280 60% 6%) 0%, hsl(260 50% 12%) 30%, hsl(300 40% 15%) 70%, hsl(320 35% 18%) 100%)',
        }}
      />

      {/* Aurora layer */}
      {showAurora && (
        <div className="absolute inset-0 dream-aurora">
          <div 
            className="absolute inset-0 opacity-30"
            style={{
              background: 'radial-gradient(ellipse 150% 80% at 20% 10%, hsla(320, 80%, 50%, 0.3) 0%, transparent 50%)',
            }}
          />
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              background: 'radial-gradient(ellipse 120% 60% at 80% 20%, hsla(200, 80%, 50%, 0.25) 0%, transparent 40%)',
            }}
          />
          <div 
            className="absolute inset-0 opacity-25"
            style={{
              background: 'radial-gradient(ellipse 100% 100% at 50% 80%, hsla(270, 60%, 40%, 0.2) 0%, transparent 50%)',
            }}
          />
        </div>
      )}

      {/* Moon */}
      {showMoon && (
        <div 
          className="absolute top-16 right-20 w-24 h-24 rounded-full dream-moon-glow"
          style={{
            background: 'radial-gradient(circle at 35% 35%, hsl(45, 100%, 97%), hsl(45, 90%, 80%), hsl(45, 70%, 60%))',
            boxShadow: '0 0 80px 30px hsla(45, 100%, 85%, 0.25), 0 0 120px 60px hsla(45, 100%, 80%, 0.1)',
          }}
        >
          {/* Moon craters subtle effect */}
          <div 
            className="absolute w-4 h-4 rounded-full top-6 left-8"
            style={{ background: 'hsla(45, 50%, 70%, 0.3)' }}
          />
          <div 
            className="absolute w-3 h-3 rounded-full top-12 left-14"
            style={{ background: 'hsla(45, 50%, 70%, 0.2)' }}
          />
        </div>
      )}

      {/* Stars layer */}
      <div className="absolute inset-0">
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full dream-star-twinkle"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              background: `hsla(45, 100%, 90%, ${star.brightness})`,
              boxShadow: `0 0 ${star.size * 2}px ${star.size}px hsla(45, 100%, 90%, ${star.brightness * 0.3})`,
              animationDelay: `${star.delay}s`,
              animationDuration: `${star.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Floating hearts */}
      <div className="absolute inset-0">
        {hearts.map((heart) => (
          <div
            key={heart.id}
            className="absolute dream-floating-heart"
            style={{
              left: `${heart.x}%`,
              bottom: '-10%',
              animationDelay: `${heart.delay}s`,
              animationDuration: `${heart.duration}s`,
              fontSize: `${heart.size * 1.5}rem`,
              opacity: 0.15,
            }}
          >
            💕
          </div>
        ))}
      </div>

      {/* Shooting star (occasional) */}
      <div className="absolute top-20 left-10 dream-shooting-star">
        <div 
          className="w-1 h-1 rounded-full bg-white"
          style={{
            boxShadow: '0 0 4px 2px rgba(255, 255, 255, 0.8), 20px 0 30px 10px rgba(255, 255, 255, 0.3)',
          }}
        />
      </div>

      {/* Soft vignette overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 0%, hsla(280, 50%, 5%, 0.4) 100%)',
        }}
      />
    </div>
  );
};
