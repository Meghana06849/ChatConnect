import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ChatMode = 'general' | 'lovers';

interface ChatContextType {
  mode: ChatMode;
  switchMode: (mode: ChatMode, pin?: string) => boolean;
  loversPin: string | null;
  setLoversPin: (pin: string) => void;
  hasLoversAccess: boolean;
  resetToGeneralMode: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ChatMode>('general');
  const [loversPin, setLoversPin] = useState<string | null>(null);
  const [hasLoversAccess, setHasLoversAccess] = useState(false);

  // Reset to general mode on logout or fresh login
  const resetToGeneralMode = () => {
    setMode('general');
    setHasLoversAccess(false);
    localStorage.removeItem('chatconnect_mode');
  };

  useEffect(() => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        resetToGeneralMode();
        localStorage.removeItem('chatconnect_lovers_pin');
        setLoversPin(null);
      } else if (event === 'SIGNED_IN') {
        // Always start in general mode on fresh login
        resetToGeneralMode();
      }
    });

    // Check for stored PIN only (don't auto-switch to lovers mode)
    const storedPin = localStorage.getItem('chatconnect_lovers_pin');
    if (storedPin) {
      setLoversPin(storedPin);
    }

    return () => subscription.unsubscribe();
  }, []);

  const switchMode = (newMode: ChatMode, pin?: string): boolean => {
    if (newMode === 'lovers') {
      if (!loversPin) {
        return false; // No PIN set
      }
      
      if (pin && pin === loversPin) {
        setMode('lovers');
        setHasLoversAccess(true);
        localStorage.setItem('chatconnect_mode', 'lovers');
        return true;
      }
      return false; // Invalid PIN
    } else {
      setMode('general');
      setHasLoversAccess(false);
      localStorage.setItem('chatconnect_mode', 'general');
      return true;
    }
  };

  const setPinAndStore = (pin: string) => {
    setLoversPin(pin);
    localStorage.setItem('chatconnect_lovers_pin', pin);
  };

  return (
    <ChatContext.Provider
      value={{
        mode,
        switchMode,
        loversPin,
        setLoversPin: setPinAndStore,
        hasLoversAccess,
        resetToGeneralMode
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};