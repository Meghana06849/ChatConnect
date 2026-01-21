import React from 'react';
import { Heart } from 'lucide-react';

interface DreamTypingIndicatorProps {
  partnerName?: string;
}

export const DreamTypingIndicator: React.FC<DreamTypingIndicatorProps> = ({
  partnerName = 'They',
}) => {
  return (
    <div className="flex justify-start">
      <div className="relative">
        {/* Soft glow behind */}
        <div 
          className="absolute inset-0 rounded-2xl blur-lg opacity-30"
          style={{
            background: 'linear-gradient(135deg, hsla(320, 80%, 60%, 0.3), hsla(270, 60%, 50%, 0.3))',
            transform: 'scale(1.2)',
          }}
        />

        <div className="relative flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
          {/* Animated hearts */}
          <div className="flex items-center gap-1">
            <Heart 
              className="w-4 h-4 text-lovers-primary fill-lovers-primary dream-typing-heart" 
              style={{ animationDelay: '0s' }}
            />
            <Heart 
              className="w-4 h-4 text-lovers-primary fill-lovers-primary dream-typing-heart" 
              style={{ animationDelay: '0.2s' }}
            />
            <Heart 
              className="w-4 h-4 text-lovers-primary fill-lovers-primary dream-typing-heart" 
              style={{ animationDelay: '0.4s' }}
            />
          </div>

          <span className="text-sm text-white/60 italic">
            {partnerName} is writing with love...
          </span>
        </div>
      </div>
    </div>
  );
};
