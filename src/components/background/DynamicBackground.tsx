import React, { useEffect, useState } from 'react';
import { useChat } from '@/contexts/ChatContext';

export const DynamicBackground = () => {
  const { mode } = useChat();
  const [isDay, setIsDay] = useState(true);
  const [elements, setElements] = useState<Array<{id: number, left: number, top: number, delay: number, duration: number}>>([]);
  
  useEffect(() => {
    const checkTime = () => {
      const hour = new Date().getHours();
      setIsDay(hour >= 6 && hour < 18);
    };
    
    checkTime();
    const interval = setInterval(checkTime, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const newElements = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 8,
      duration: Math.random() * 4 + 4,
    }));
    setElements(newElements);
  }, [mode, isDay]);

  const getDayNightClass = () => {
    if (mode === 'lovers') {
      return isDay ? 'bg-gradient-to-br from-pink-50 via-purple-50 to-pink-100' 
                   : 'bg-gradient-to-br from-purple-950 via-pink-950 to-indigo-950';
    }
    return isDay ? 'bg-gradient-to-br from-sky-50 via-blue-50 to-teal-100'
                 : 'bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950';
  };

  return (
    <div className={`fixed inset-0 -z-10 transition-colors duration-1000 ${getDayNightClass()}`}>
      {/* Day elements */}
      {isDay && mode === 'lovers' && (
        <div className="floating-hearts">
          {elements.map((element) => (
            <div
              key={element.id}
              className="absolute text-4xl animate-float opacity-30"
              style={{
                left: `${element.left}%`,
                top: `${element.top}%`,
                animationDelay: `${element.delay}s`,
                animationDuration: `${element.duration}s`,
              }}
            >
              💕
            </div>
          ))}
        </div>
      )}

      {isDay && mode !== 'lovers' && (
        <div className="floating-elements">
          {elements.map((element) => (
            <div
              key={element.id}
              className="absolute text-3xl animate-float opacity-20"
              style={{
                left: `${element.left}%`,
                top: `${element.top}%`,
                animationDelay: `${element.delay}s`,
                animationDuration: `${element.duration}s`,
              }}
            >
              ✨
            </div>
          ))}
        </div>
      )}

      {/* Night elements */}
      {!isDay && (
        <>
          {/* Stars */}
          <div className="stars-container">
            {elements.map((element) => (
              <div
                key={`star-${element.id}`}
                className="absolute w-1 h-1 bg-white rounded-full animate-twinkle"
                style={{
                  left: `${element.left}%`,
                  top: `${element.top}%`,
                  animationDelay: `${element.delay}s`,
                }}
              />
            ))}
          </div>
          
          {/* Moon */}
          <div className="absolute top-20 right-20 w-24 h-24 rounded-full bg-gradient-to-br from-yellow-100 to-yellow-200 shadow-2xl shadow-yellow-200/50 animate-pulse-slow" />
          
          {/* Shooting stars */}
          {mode === 'lovers' && (
            <div className="shooting-stars">
              {[0, 1, 2].map((i) => (
                <div
                  key={`shooting-${i}`}
                  className="absolute w-1 h-1 bg-pink-300 rounded-full animate-shooting-star"
                  style={{
                    left: `${20 + i * 30}%`,
                    top: `${10 + i * 15}%`,
                    animationDelay: `${i * 8}s`,
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
