import React from 'react';
import { Heart, Check, CheckCheck, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeartReadReceiptProps {
  status: 'sending' | 'sent' | 'delivered' | 'seen';
  isLoversMode?: boolean;
  seenAt?: string;
  deliveredAt?: string;
}

export const HeartReadReceipt: React.FC<HeartReadReceiptProps> = ({ 
  status, 
  isLoversMode = false,
  seenAt,
  deliveredAt
}) => {
  if (status === 'sending') {
    return (
      <div className="flex items-center gap-0.5" title="Sending...">
        <Clock className="w-3 h-3 opacity-50 animate-pulse" />
      </div>
    );
  }

  if (status === 'sent') {
    return (
      <div title="Sent">
        <Check className={cn(
          "w-3 h-3",
          isLoversMode ? "text-white/60" : "text-muted-foreground"
        )} />
      </div>
    );
  }

  if (status === 'delivered') {
    const title = deliveredAt 
      ? `Delivered at ${new Date(deliveredAt).toLocaleTimeString()}` 
      : 'Delivered';
    return (
      <div title={title}>
        <CheckCheck className={cn(
          "w-3.5 h-3.5",
          isLoversMode ? "text-white/80" : "text-muted-foreground"
        )} />
      </div>
    );
  }

  // Seen status
  const seenTitle = seenAt 
    ? `Seen at ${new Date(seenAt).toLocaleTimeString()}` 
    : 'Seen';

  // Heart animation for lovers mode
  if (isLoversMode) {
    return (
      <div className="relative flex items-center" title={seenTitle}>
        <Heart 
          className="w-3.5 h-3.5 text-lovers-primary fill-lovers-primary animate-heart-seen" 
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Heart 
            className="w-3.5 h-3.5 text-lovers-secondary fill-lovers-secondary animate-heart-pulse-out opacity-0" 
          />
        </div>
      </div>
    );
  }

  // Blue double check for general mode
  return (
    <div title={seenTitle}>
      <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
    </div>
  );
};
