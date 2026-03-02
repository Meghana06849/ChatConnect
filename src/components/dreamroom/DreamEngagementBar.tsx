import React from 'react';
import { Heart, Flame, Sparkles } from 'lucide-react';

interface DreamEngagementBarProps {
  togetherSince: string | null;
  daysTogether: number;
  loveStreak: number;
  loveLevel: number;
}

export const DreamEngagementBar: React.FC<DreamEngagementBarProps> = ({
  togetherSince,
  daysTogether,
  loveStreak,
  loveLevel,
}) => {
  const xpPercent = (loveLevel % 10) * 10 + 3; // Simulated XP progress

  return (
    <div className="flex items-center justify-between gap-2 mb-3 px-1">
      {/* Together since */}
      <div className="flex items-center gap-1 text-[10px] text-white/60">
        <Heart className="w-3 h-3 text-[hsl(var(--lovers-primary))]" />
        <span>{togetherSince ? new Date(togetherSince).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Today'}</span>
        <span className="text-[hsl(var(--lovers-primary))]">·{daysTogether}d</span>
      </div>

      {/* Streak */}
      <div className="flex items-center gap-0.5 text-[10px] text-white/60">
        <Flame className="w-3 h-3 text-orange-400" />
        <span>{loveStreak}🔥</span>
      </div>

      {/* Level of Love XP bar */}
      <div className="flex items-center gap-1.5 flex-1 max-w-[140px]">
        <Sparkles className="w-3 h-3 text-[hsl(var(--lovers-secondary))] flex-shrink-0" />
        <span className="text-[10px] text-white/60 flex-shrink-0">Lv.{loveLevel}</span>
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{
          background: 'hsla(280 30% 20% / 0.6)',
          boxShadow: 'inset 0 1px 2px hsla(0 0% 0% / 0.3)',
        }}>
          <div className="h-full rounded-full transition-all duration-700" style={{
            width: `${xpPercent}%`,
            background: 'linear-gradient(90deg, hsl(var(--lovers-primary)), hsl(var(--lovers-secondary)))',
            boxShadow: '0 0 8px 1px hsla(320 100% 60% / 0.4)',
          }} />
        </div>
      </div>
    </div>
  );
};
