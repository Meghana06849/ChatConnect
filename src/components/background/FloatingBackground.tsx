import React, { useEffect, useState } from 'react';
import { useChat } from '@/contexts/ChatContext';

export const FloatingBackground = () => {
  const { mode } = useChat();
  const [elements, setElements] = useState<Array<{id: number, left: number, delay: number, duration: number}>>([]);
  
  useEffect(() => {
    // Create floating elements
    const newElements = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 8,
      duration: Math.random() * 4 + 4, // 4-8 seconds
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
          } as React.CSSProperties}
        >
          ✨
        </div>
      ))}
    </div>
  );
};