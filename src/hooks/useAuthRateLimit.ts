import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type AttemptType = 'login' | 'signup' | 'password_reset';

interface RateLimitResult {
  allowed: boolean;
  remainingAttempts?: number;
  blocked?: boolean;
  blockedUntil?: string;
  remainingMinutes?: number;
  message?: string;
}

export const useAuthRateLimit = () => {
  const [isBlocked, setIsBlocked] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [blockExpiry, setBlockExpiry] = useState<Date | null>(null);

  const checkRateLimit = useCallback(async (
    identifier: string,
    attemptType: AttemptType = 'login'
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('rate-limit-auth', {
        body: { action: 'check', identifier, attemptType }
      });

      if (error) {
        console.error('Rate limit check error:', error);
        // Allow on error to not block legitimate users
        return true;
      }

      const result = data as RateLimitResult;
      
      setIsBlocked(result.blocked || false);
      setRemainingAttempts(result.remainingAttempts ?? null);
      
      if (result.blockedUntil) {
        setBlockExpiry(new Date(result.blockedUntil));
      }

      if (!result.allowed && result.message) {
        toast({
          title: "Rate Limited",
          description: result.message,
          variant: "destructive"
        });
      }

      return result.allowed;
    } catch (error) {
      console.error('Rate limit check failed:', error);
      return true; // Allow on error
    }
  }, []);

  const recordFailedAttempt = useCallback(async (
    identifier: string,
    attemptType: AttemptType = 'login'
  ): Promise<void> => {
    try {
      const { data, error } = await supabase.functions.invoke('rate-limit-auth', {
        body: { action: 'record', identifier, attemptType }
      });

      if (error) {
        console.error('Rate limit record error:', error);
        return;
      }

      const result = data as RateLimitResult;
      
      setRemainingAttempts(result.remainingAttempts ?? null);
      setIsBlocked(result.blocked || false);
      
      if (result.blockedUntil) {
        setBlockExpiry(new Date(result.blockedUntil));
        toast({
          title: "Too Many Attempts",
          description: `You've been temporarily blocked. Please try again later.`,
          variant: "destructive"
        });
      } else if (result.remainingAttempts !== undefined && result.remainingAttempts <= 2) {
        toast({
          title: "Warning",
          description: `${result.remainingAttempts} attempts remaining before temporary block.`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Rate limit record failed:', error);
    }
  }, []);

  const resetRateLimit = useCallback(async (
    identifier: string,
    attemptType: AttemptType = 'login'
  ): Promise<void> => {
    try {
      await supabase.functions.invoke('rate-limit-auth', {
        body: { action: 'reset', identifier, attemptType }
      });
      
      setIsBlocked(false);
      setRemainingAttempts(null);
      setBlockExpiry(null);
    } catch (error) {
      console.error('Rate limit reset failed:', error);
    }
  }, []);

  return {
    isBlocked,
    remainingAttempts,
    blockExpiry,
    checkRateLimit,
    recordFailedAttempt,
    resetRateLimit
  };
};