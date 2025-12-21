import React from 'react';
import { cn } from '@/lib/utils';

interface OnlineStatusIndicatorProps {
  isOnline: boolean;
  size?: 'sm' | 'md' | 'lg';
  showPulse?: boolean;
  className?: string;
}

export const OnlineStatusIndicator: React.FC<OnlineStatusIndicatorProps> = ({
  isOnline,
  size = 'md',
  showPulse = true,
  className
}) => {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'rounded-full border-2 border-background transition-colors duration-300',
          sizeClasses[size],
          isOnline ? 'bg-green-500' : 'bg-muted-foreground/50'
        )}
      />
      {isOnline && showPulse && (
        <div
          className={cn(
            'absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75',
            sizeClasses[size]
          )}
          style={{ animationDuration: '2s' }}
        />
      )}
    </div>
  );
};
