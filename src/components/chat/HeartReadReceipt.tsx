import React from 'react';
import { Heart, Check, CheckCheck } from 'lucide-react';

interface HeartReadReceiptProps {
  status: 'sending' | 'sent' | 'delivered' | 'seen';
  isLoversMode?: boolean;
  seenAt?: string;
}

export const HeartReadReceipt: React.FC<HeartReadReceiptProps> = ({ 
  status, 
  isLoversMode = false,
  seenAt 
}) => {
  if (status === 'sending') {
    return (
      <div className="flex items-center gap-0.5">
        <div className="w-3 h-3 rounded-full border border-current opacity-50 animate-pulse" />
      </div>
    );
  }

  if (status === 'sent') {
    return (
      <Check className="w-3 h-3 opacity-60" />
    );
  }

  if (status === 'delivered') {
    return (
      <CheckCheck className="w-3 h-3 opacity-70" />
    );
  }

  // Seen status with heart animation for lovers mode
  if (isLoversMode) {
    return (
      <div className="relative flex items-center">
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

  return (
    <CheckCheck className="w-3 h-3 text-blue-400" />
  );
};
