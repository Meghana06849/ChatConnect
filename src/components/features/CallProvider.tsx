import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWebRTCCall } from '@/hooks/useWebRTCCall';
import { IncomingCallNotification } from './IncomingCallNotification';
import { ActiveCall } from './ActiveCall';

interface CallContextType {
  startCall: (contactId: string, contactName: string, isVideo: boolean) => Promise<void>;
  isCallActive: boolean;
}

const CallContext = createContext<CallContextType | null>(null);

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};

interface CallProviderProps {
  children: React.ReactNode;
}

export const CallProvider: React.FC<CallProviderProps> = ({ children }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [contactName, setContactName] = useState('');

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data?.user?.id || null);
    };
    getUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const {
    localStream,
    remoteStream,
    isCallActive,
    isIncomingCall,
    incomingCallData,
    isMuted,
    isVideoEnabled,
    callDuration,
    startCall: initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo
  } = useWebRTCCall(userId);

  const startCall = async (contactId: string, name: string, isVideo: boolean) => {
    setContactName(name);
    await initiateCall(contactId, name, isVideo);
  };

  return (
    <CallContext.Provider value={{ startCall, isCallActive }}>
      {children}
      
      {/* Incoming call notification */}
      {isIncomingCall && incomingCallData && (
        <IncomingCallNotification
          callerName={incomingCallData.callerName || 'Unknown'}
          callType={incomingCallData.callType}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}

      {/* Active call UI */}
      {isCallActive && (
        <ActiveCall
          contactName={contactName || incomingCallData?.callerName || 'Unknown'}
          isVideoCall={isVideoEnabled}
          localStream={localStream}
          remoteStream={remoteStream}
          isMuted={isMuted}
          isVideoEnabled={isVideoEnabled}
          callDuration={callDuration}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onEndCall={endCall}
        />
      )}
    </CallContext.Provider>
  );
};
