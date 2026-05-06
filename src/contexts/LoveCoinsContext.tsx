/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LoveCoinsContextType {
  coins: number;
  earnCoins: (amount: number, activity: string) => Promise<void>;
  spendCoins: (amount: number, item: string) => Promise<boolean>;
  dailyStreak: number;
  lastLoginDate: string | null;
  updateStreak: () => Promise<void>;
  isLoading: boolean;
}

const LoveCoinsContext = createContext<LoveCoinsContextType | undefined>(undefined);

export const useLoveCoins = () => {
  const context = useContext(LoveCoinsContext);
  if (context === undefined) {
    throw new Error('useLoveCoins must be used within a LoveCoinsProvider');
  }
  return context;
};

export const LoveCoinsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [coins, setCoins] = useState(100);
  const [dailyStreak, setDailyStreak] = useState(0);
  const [lastLoginDate, setLastLoginDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const streakStorageKey = 'chatconnect_daily_streak';
  const lastLoginStorageKey = 'chatconnect_last_login';

  // Initialize user and load coins (combined to avoid race conditions)
  useEffect(() => {
    const initializeCoins = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        setCurrentUserId(user.id);

        // Load coins from database
        const { data, error } = await supabase
          .from('profiles')
          .select('love_coins')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (data) {
          setCoins(data.love_coins || 100);
        } else {
          // Initialize if new user
          await supabase.from('profiles').upsert({
            user_id: user.id,
            love_coins: 100,
          });
          setCoins(100);
        }

        // Load streak data from localStorage
        const storedStreak = localStorage.getItem(streakStorageKey);
        const storedLastLogin = localStorage.getItem(lastLoginStorageKey);
        setDailyStreak(storedStreak ? parseInt(storedStreak, 10) : 0);
        setLastLoginDate(storedLastLogin || null);
      } catch (error) {
        console.error('Error initializing love coins:', error);
        // Fallback to localStorage
        const stored = localStorage.getItem('chatconnect_love_coins');
        setCoins(stored ? parseInt(stored) : 100);
      } finally {
        setIsLoading(false);
      }
    };

    initializeCoins();
  }, [streakStorageKey, lastLoginStorageKey]);

  // Subscribe to real-time updates (separate effect to avoid race conditions)
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`user:${currentUserId}:profiles`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${currentUserId}`
        },
        (payload) => {
          if (payload.new && typeof payload.new === 'object') {
            const newData = payload.new as Record<string, unknown>;
            if (typeof newData.love_coins === 'number') setCoins(newData.love_coins);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [currentUserId]);

  const earnCoins = async (amount: number, activity: string) => {
    if (!currentUserId) return;

    const newCoins = coins + amount;
    setCoins(newCoins);

    try {
      await supabase
        .from('profiles')
        .update({ love_coins: newCoins })
        .eq('user_id', currentUserId);

      toast({
        title: `+${amount} 💕`,
        description: `Earned from ${activity}!`,
      });

      console.log(`+${amount} Love Coins for ${activity}! 💕`);
    } catch (error) {
      console.error('Error earning coins:', error);
      toast({
        title: 'Error',
        description: 'Could not update love coins',
        variant: 'destructive'
      });
    }
  };

  const spendCoins = async (amount: number, item: string): Promise<boolean> => {
    if (!currentUserId) return false;

    if (coins >= amount) {
      const newCoins = coins - amount;
      setCoins(newCoins);

      try {
        await supabase
          .from('profiles')
          .update({ love_coins: newCoins })
          .eq('user_id', currentUserId);

        toast({
          title: `-${amount} 💸`,
          description: `Spent on ${item}`,
        });

        console.log(`Spent ${amount} Love Coins on ${item}! 💸`);
        return true;
      } catch (error) {
        console.error('Error spending coins:', error);
        setCoins(coins); // Revert on error
        toast({
          title: 'Error',
          description: 'Could not deduct love coins',
          variant: 'destructive'
        });
        return false;
      }
    }

    toast({
      title: 'Insufficient Love Coins',
      description: `You need ${amount} coins, but only have ${coins}`,
      variant: 'destructive'
    });

    console.log('Not enough Love Coins! 💔');
    return false;
  };

  const updateStreak = async () => {
    if (!currentUserId) return;

    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    try {
      if (lastLoginDate === yesterday) {
        // Continue streak
        const newStreak = dailyStreak + 1;
        const bonusCoins = 10 + newStreak * 2;
        
        setDailyStreak(newStreak);
        setLastLoginDate(today);
        setCoins(coins + bonusCoins);
        localStorage.setItem(streakStorageKey, String(newStreak));
        localStorage.setItem(lastLoginStorageKey, today);

        await supabase
          .from('profiles')
          .update({
            love_coins: coins + bonusCoins
          })
          .eq('user_id', currentUserId);

        await earnCoins(bonusCoins, `Day ${newStreak} Login Streak`);
      } else if (lastLoginDate !== today) {
        // Start new streak or reset
        const loginCoins = 10;
        
        setDailyStreak(1);
        setLastLoginDate(today);
        setCoins(coins + loginCoins);
        localStorage.setItem(streakStorageKey, '1');
        localStorage.setItem(lastLoginStorageKey, today);

        await supabase
          .from('profiles')
          .update({
            love_coins: coins + loginCoins
          })
          .eq('user_id', currentUserId);

        await earnCoins(loginCoins, 'Daily Login');
      }
    } catch (error) {
      console.error('Error updating streak:', error);
      toast({
        title: 'Error',
        description: 'Could not update daily streak',
        variant: 'destructive'
      });
    }
  };

  return (
    <LoveCoinsContext.Provider
      value={{
        coins,
        earnCoins,
        spendCoins,
        dailyStreak,
        lastLoginDate,
        updateStreak,
        isLoading
      }}
    >
      {children}
    </LoveCoinsContext.Provider>
  );
};