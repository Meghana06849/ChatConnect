import React, { useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, X } from 'lucide-react';

interface DreamIncomingCallProps {
  callerName: string;
  callerAvatar?: string;
  onAccept: () => void;
  onReject: () => void;
}

// Generate random stars for the background
const generateStars = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: Math.random() * 3 + 1,
    delay: Math.random() * 5,
    duration: Math.random() * 3 + 2,
  }));
};

export const DreamIncomingCall: React.FC<DreamIncomingCallProps> = ({
  callerName,
  callerAvatar,
  onAccept,
  onReject
}) => {
  const stars = useMemo(() => generateStars(40), []);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Midnight sky gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(270,60%,15%)] via-[hsl(250,50%,20%)] to-[hsl(220,60%,10%)]" />
      
      {/* Floating stars layer */}
      <div className="absolute inset-0 overflow-hidden">
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full bg-white dream-star"
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animationDelay: `${star.delay}s`,
              animationDuration: `${star.duration}s`,
            }}
          />
        ))}
      </div>
      
      {/* Moon */}
      <div 
        className="absolute top-12 right-16 w-20 h-20 rounded-full dream-moon"
        style={{
          background: 'radial-gradient(circle at 30% 30%, hsl(45, 100%, 96%), hsl(45, 80%, 70%))',
          boxShadow: '0 0 60px 20px hsla(45, 100%, 70%, 0.3)',
        }}
      />
      
      {/* Main content */}
      <div className="relative h-full flex flex-col items-center justify-center px-6">
        {/* Incoming call text */}
        <p className="text-lg text-white/60 font-light tracking-widest mb-8 animate-pulse">
          ✨ Incoming Dream Call ✨
        </p>
        
        {/* Caller avatar with pulsing ring */}
        <div className="relative mb-8">
          {/* Outer pulse rings */}
          <div className="absolute inset-0 -m-8 rounded-full bg-pink-400/20 dream-incoming-pulse" />
          <div className="absolute inset-0 -m-4 rounded-full bg-pink-400/30 dream-incoming-pulse" style={{ animationDelay: '0.5s' }} />
          
          {/* Glow */}
          <div 
            className="absolute inset-0 rounded-full blur-2xl"
            style={{
              background: 'radial-gradient(circle, hsla(320, 100%, 70%, 0.4) 0%, transparent 70%)',
              transform: 'scale(2)',
            }}
          />
          
          <Avatar className="w-36 h-36 border-4 border-pink-400/50 shadow-2xl relative z-10">
            {callerAvatar && <AvatarImage src={callerAvatar} />}
            <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-white text-5xl">
              {callerName[0]?.toUpperCase() || '💕'}
            </AvatarFallback>
          </Avatar>
        </div>
        
        {/* Caller name */}
        <h2 className="text-3xl font-light text-white/90 tracking-wide mb-2">
          {callerName}
        </h2>
        <p className="text-white/50 text-sm mb-16">wants to dream with you...</p>
        
        {/* Action buttons */}
        <div className="flex gap-12">
          {/* Reject button */}
          <div className="flex flex-col items-center gap-3">
            <Button
              variant="ghost"
              size="lg"
              onClick={onReject}
              className="rounded-full w-20 h-20 bg-red-500/30 border-2 border-red-400/50 backdrop-blur-sm hover:bg-red-500/50 transition-all duration-300"
            >
              <X className="w-9 h-9 text-red-300" />
            </Button>
            <span className="text-white/60 text-sm">Decline</span>
          </div>
          
          {/* Accept button */}
          <div className="flex flex-col items-center gap-3">
            <Button
              variant="ghost"
              size="lg"
              onClick={onAccept}
              className="rounded-full w-20 h-20 bg-pink-500/30 border-2 border-pink-400/50 backdrop-blur-sm hover:bg-pink-500/50 transition-all duration-300 dream-accept-pulse"
            >
              <Heart className="w-9 h-9 text-pink-300 fill-pink-300" />
            </Button>
            <span className="text-white/60 text-sm">Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
};