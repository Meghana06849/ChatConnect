import React from 'react';
import { Timer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DisappearingMessageIndicatorProps {
  mode: 'off' | '30s' | '1min' | 'on_seen';
  isLoversMode?: boolean;
}

export const DisappearingMessageIndicator: React.FC<DisappearingMessageIndicatorProps> = ({
  mode,
  isLoversMode = false,
}) => {
  if (mode === 'off') return null;

  const getModeLabel = () => {
    switch (mode) {
      case '30s': return '30s';
      case '1min': return '1m';
      case 'on_seen': return '👁️';
      default: return '';
    }
  };

  return (
    <div className={cn(
      "flex items-center gap-1 px-2 py-1 rounded-full text-xs",
      isLoversMode
        ? "bg-lovers-primary/20 text-lovers-primary"
        : "bg-general-primary/20 text-general-primary"
    )}>
      <Timer className="w-3 h-3" />
      <span>{getModeLabel()}</span>
    </div>
  );
};
