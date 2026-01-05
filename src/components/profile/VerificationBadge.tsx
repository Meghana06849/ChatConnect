import React from 'react';
import { BadgeCheck, Shield, Star, Crown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface VerificationBadgeProps {
  isVerified: boolean;
  verificationType?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  isVerified,
  verificationType,
  size = 'md',
  className
}) => {
  if (!isVerified) return null;

  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const getBadgeInfo = () => {
    switch (verificationType) {
      case 'premium':
        return {
          icon: Crown,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/20',
          label: 'Premium User'
        };
      case 'verified':
        return {
          icon: BadgeCheck,
          color: 'text-blue-500',
          bgColor: 'bg-blue-500/20',
          label: 'Verified User'
        };
      case 'creator':
        return {
          icon: Star,
          color: 'text-purple-500',
          bgColor: 'bg-purple-500/20',
          label: 'Content Creator'
        };
      case 'official':
        return {
          icon: Shield,
          color: 'text-green-500',
          bgColor: 'bg-green-500/20',
          label: 'Official Account'
        };
      default:
        return {
          icon: BadgeCheck,
          color: 'text-blue-500',
          bgColor: 'bg-blue-500/20',
          label: 'Verified'
        };
    }
  };

  const { icon: Icon, color, bgColor, label } = getBadgeInfo();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn(
            'inline-flex items-center justify-center rounded-full p-0.5',
            bgColor,
            className
          )}>
            <Icon className={cn(sizeClasses[size], color)} />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
