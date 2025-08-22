import React, { createContext, useContext, useState, useEffect } from 'react';

interface LoveCoinsContextType {
  coins: number;
  earnCoins: (amount: number, activity: string) => void;
  spendCoins: (amount: number, item: string) => boolean;
  dailyStreak: number;
  lastLoginDate: string | null;
  updateStreak: () => void;
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
  const [coins, setCoins] = useState(100); // Starting coins
  const [dailyStreak, setDailyStreak] = useState(0);
  const [lastLoginDate, setLastLoginDate] = useState<string | null>(null);

  useEffect(() => {
    // Load from localStorage
    const storedCoins = localStorage.getItem('chatconnect_love_coins');
    const storedStreak = localStorage.getItem('chatconnect_daily_streak');
    const storedLastLogin = localStorage.getItem('chatconnect_last_login');
    
    if (storedCoins) setCoins(parseInt(storedCoins));
    if (storedStreak) setDailyStreak(parseInt(storedStreak));
    if (storedLastLogin) setLastLoginDate(storedLastLogin);
  }, []);

  const earnCoins = (amount: number, activity: string) => {
    const newCoins = coins + amount;
    setCoins(newCoins);
    localStorage.setItem('chatconnect_love_coins', newCoins.toString());
    
    // Show notification
    console.log(`+${amount} Love Coins for ${activity}! 💕`);
  };

  const spendCoins = (amount: number, item: string): boolean => {
    if (coins >= amount) {
      const newCoins = coins - amount;
      setCoins(newCoins);
      localStorage.setItem('chatconnect_love_coins', newCoins.toString());
      console.log(`Spent ${amount} Love Coins on ${item}! 💸`);
      return true;
    }
    console.log('Not enough Love Coins! 💔');
    return false;
  };

  const updateStreak = () => {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    if (lastLoginDate === yesterday) {
      // Continue streak
      const newStreak = dailyStreak + 1;
      setDailyStreak(newStreak);
      localStorage.setItem('chatconnect_daily_streak', newStreak.toString());
      earnCoins(10 + newStreak * 2, `Day ${newStreak} Login Streak`);
    } else if (lastLoginDate !== today) {
      // Start new streak or reset
      setDailyStreak(1);
      localStorage.setItem('chatconnect_daily_streak', '1');
      earnCoins(10, 'Daily Login');
    }
    
    setLastLoginDate(today);
    localStorage.setItem('chatconnect_last_login', today);
  };

  return (
    <LoveCoinsContext.Provider
      value={{
        coins,
        earnCoins,
        spendCoins,
        dailyStreak,
        lastLoginDate,
        updateStreak
      }}
    >
      {children}
    </LoveCoinsContext.Provider>
  );
};