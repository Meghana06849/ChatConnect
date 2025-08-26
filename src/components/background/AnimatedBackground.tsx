import React, { useEffect, useState } from 'react';
import { useChat } from '@/contexts/ChatContext';

interface FloatingElement {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
}

export const AnimatedBackground = () => {
  const { mode } = useChat();
  const [elements, setElements] = useState<FloatingElement[]>([]);
  
  useEffect(() => {
    // Create floating elements
    const newElements = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 8,
      duration: Math.random() * 4 + 6, // 6-10 seconds
      size: Math.random() * 0.5 + 0.5, // 0.5-1x size
    }));
    setElements(newElements);
  }, [mode]);

  if (mode === 'lovers') {
    return (
      <div className="floating-hearts">
        {elements.map((element) => (
          <div
            key={element.id}
            className="floating-heart"
            style={{
              '--random-left': `${element.left}%`,
              '--random-delay': `${element.delay}s`,
              '--random-duration': `${element.duration}s`,
              '--random-size': element.size,
            } as React.CSSProperties}
          >
            💕
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="floating-stars">
      {elements.map((element) => (
        <div
          key={element.id}
          className="floating-star"
          style={{
            '--random-left': `${element.left}%`,
            '--random-delay': `${element.delay}s`,
            '--random-duration': `${element.duration}s`,
            '--random-size': element.size,
          } as React.CSSProperties}
        >
          ✨
        </div>
      ))}
    </div>
  );
};