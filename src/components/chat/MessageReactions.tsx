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
    <div className="flex flex-wrap gap-1 mt-1.5 -mb-0.5">
      {Object.entries(groupedReactions).map(([emoji, { count, hasUserReacted }]) => (
        <button
          key={emoji}
          onClick={() => onReactionClick?.(emoji)}
          className={`
            inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
            transition-all hover:scale-110 active:scale-95
            ${hasUserReacted 
              ? isLoversMode 
                ? 'bg-lovers-primary/30 ring-1 ring-lovers-primary/50' 
                : 'bg-primary/20 ring-1 ring-primary/50'
              : 'bg-white/10 hover:bg-white/20'
            }
          `}
          title={hasUserReacted ? 'Click to remove your reaction' : 'Click to react'}
        >
          <span className="text-sm leading-none">{emoji}</span>
          <span className={`text-[10px] font-semibold ${
            hasUserReacted 
              ? isLoversMode ? 'text-lovers-primary' : 'text-primary' 
              : 'text-muted-foreground'
          }`}>
            {count}
          </span>
        </button>
      ))}
    </div>
  );
};
