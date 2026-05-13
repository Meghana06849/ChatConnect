import React, { createContext, useContext, useState, ReactNode } from 'react';

type CallStatus = 'idle' | 'dialing' | 'ringing' | 'active' | 'ended' | 'declined' | 'missed';
type CallType = 'audio' | 'video';

interface User {
  id: string;
  name: string;
  avatar?: string;
}

interface Call {
  id: string;
  caller: User;
  receiver: User;
  status: CallStatus;
  type: CallType;
  startedAt?: Date;
  endedAt?: Date;
}

interface CallContextType {
  call: Call | null;
  incomingCall: Call | null;
  initiateCall: (receiver: User, type: CallType) => void;
  answerCall: () => void;
  endCall: () => void;
  declineCall: () => void;
  setIncomingCall: (call: Call | null) => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [call, setCall] = useState<Call | null>(null);
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);

  const initiateCall = (receiver: User, type: CallType) => {
    // This is a placeholder for the current user.
    // In a real app, you'd get this from your auth context.
    const currentUser: User = { id: 'current-user-id', name: 'You' }; 
    
    const newCall: Call = {
      id: `call_${Date.now()}`,
      caller: currentUser,
      receiver,
      status: 'dialing',
      type,
    };
    setCall(newCall);
    // Here you would start the signaling process to the receiver
  };

  const answerCall = () => {
    if (incomingCall) {
      setCall({ ...incomingCall, status: 'active' });
      setIncomingCall(null);
      // Here you would send a signal that the call was accepted
    }
  };

  const endCall = () => {
    if (call) {
      setCall({ ...call, status: 'ended', endedAt: new Date() });
      // Here you would send a signal to end the call
      // and clean up WebRTC connections.
      setTimeout(() => setCall(null), 2000); // Clear call after 2s
    }
  };

  const declineCall = () => {
    if (incomingCall) {
      // Send a signal that the call was declined
      setIncomingCall(null);
    }
  };

  return (
    <CallContext.Provider value={{ call, incomingCall, initiateCall, answerCall, endCall, declineCall, setIncomingCall }}>
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (context === undefined) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};
