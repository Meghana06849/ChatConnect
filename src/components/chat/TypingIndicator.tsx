import React from 'react';
import { useChat } from '@/contexts/ChatContext';

interface TypingIndicatorProps {
  typingUsers: { userId: string; displayName: string }[];
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ typingUsers }) => {
  const { mode } = useChat();
  const isLoversMode = mode === 'lovers';

  if (typingUsers.length === 0) return null;

  const displayText = typingUsers.length === 1
    ? `${typingUsers[0].displayName} is typing`
    : typingUsers.length === 2
    ? `${typingUsers[0].displayName} and ${typingUsers[1].displayName} are typing`
    : `${typingUsers.length} people are typing`;

  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className="flex items-center gap-1">
        {/* Animated dots */}
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full animate-bounce ${
                isLoversMode ? 'bg-lovers-primary' : 'bg-general-primary'
              }`}
              style={{
                animationDelay: `${i * 0.15}s`,
                animationDuration: '0.6s',
              }}
            />
          ))}
        </div>
      </div>
      <span className="text-sm text-muted-foreground italic">
        {displayText}
        {isLoversMode && ' 💕'}
      </span>
    </div>
  );
};
