import React, { createContext, useContext, useState, useEffect } from 'react';

export type ChatMode = 'general' | 'lovers';

interface ChatContextType {
  mode: ChatMode;
  switchMode: (mode: ChatMode, pin?: string) => boolean;
  loversPin: string | null;
  setLoversPin: (pin: string) => void;
  hasLoversAccess: boolean;
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

  useEffect(() => {
    // Check for stored PIN
    const storedPin = localStorage.getItem('chatconnect_lovers_pin');
    if (storedPin) {
      setLoversPin(storedPin);
    }

    // Check current mode
    const storedMode = localStorage.getItem('chatconnect_mode') as ChatMode;
    if (storedMode && storedMode === 'lovers' && storedPin) {
      setMode('lovers');
      setHasLoversAccess(true);
    }
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
        hasLoversAccess
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};