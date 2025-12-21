import React from 'react';

interface Reaction {
  emoji: string;
  user_id: string;
}

interface MessageReactionsProps {
  reactions: Reaction[];
  onReactionClick?: (emoji: string) => void;
  currentUserId?: string;
  isLoversMode?: boolean;
}

export const MessageReactions: React.FC<MessageReactionsProps> = ({
  reactions,
  onReactionClick,
  currentUserId,
  isLoversMode = false
}) => {
  if (!reactions || reactions.length === 0) return null;

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, r) => {
    if (!acc[r.emoji]) {
      acc[r.emoji] = { count: 0, hasUserReacted: false };
    }
    acc[r.emoji].count++;
    if (r.user_id === currentUserId) {
      acc[r.emoji].hasUserReacted = true;
    }
    return acc;
  }, {} as Record<string, { count: number; hasUserReacted: boolean }>);

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {Object.entries(groupedReactions).map(([emoji, { count, hasUserReacted }]) => (
        <button
          key={emoji}
          onClick={() => onReactionClick?.(emoji)}
          className={`
            inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs
            transition-all hover:scale-105
            ${hasUserReacted 
              ? isLoversMode 
                ? 'bg-lovers-primary/30 ring-1 ring-lovers-primary/50' 
                : 'bg-primary/20 ring-1 ring-primary/50'
              : 'bg-white/10 hover:bg-white/20'
            }
          `}
        >
          <span className="text-sm">{emoji}</span>
          {count > 1 && (
            <span className={`font-medium ${hasUserReacted ? 'text-lovers-primary' : 'text-muted-foreground'}`}>
              {count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};
