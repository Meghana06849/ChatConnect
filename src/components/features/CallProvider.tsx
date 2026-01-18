import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWebRTCCall } from '@/hooks/useWebRTCCall';
import { IncomingCallNotification } from './IncomingCallNotification';
import { ActiveCall } from './ActiveCall';
import { DreamCallUI } from '@/components/dreamcall/DreamCallUI';
import { DreamIncomingCall } from '@/components/dreamcall/DreamIncomingCall';
import { useChat } from '@/contexts/ChatContext';

interface CallContextType {
  startCall: (contactId: string, contactName: string, isVideo: boolean, isLoversCall?: boolean) => Promise<void>;
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
  const [contactAvatar, setContactAvatar] = useState<string | undefined>();
  const [isDreamCall, setIsDreamCall] = useState(false);
  const { mode } = useChat();
  const isLoversMode = mode === 'lovers';

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
    screenStream,
    isCallActive,
    isIncomingCall,
    incomingCallData,
    isMuted,
    isVideoEnabled,
    isScreenSharing,
    callDuration,
    startCall: initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare
  } = useWebRTCCall(userId);

  // Fetch contact avatar when a call starts or is received
  useEffect(() => {
    const fetchContactAvatar = async (contactId: string) => {
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('user_id', contactId)
        .single();
      
      if (data?.avatar_url) {
        setContactAvatar(data.avatar_url);
      }
    };

    if (incomingCallData?.from) {
      fetchContactAvatar(incomingCallData.from);
    }
  }, [incomingCallData]);

  const startCall = async (contactId: string, name: string, isVideo: boolean, isLoversCall?: boolean) => {
    setContactName(name);
    // Use lovers mode state or explicit parameter
    setIsDreamCall(isLoversCall ?? isLoversMode);
    
    // Fetch avatar for the contact being called
    const { data } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('user_id', contactId)
      .single();
    
    if (data?.avatar_url) {
      setContactAvatar(data.avatar_url);
    }
    
    await initiateCall(contactId, name, isVideo);
  };

  const handleEndCall = () => {
    endCall();
    setIsDreamCall(false);
    setContactAvatar(undefined);
  };

  const handleAcceptCall = () => {
    // Check if we're in lovers mode when accepting
    setIsDreamCall(isLoversMode);
    acceptCall();
  };

  const handleRejectCall = () => {
    rejectCall();
    setIsDreamCall(false);
    setContactAvatar(undefined);
  };

  // Determine if this should be a dream call (in lovers mode)
  const showDreamCall = isDreamCall || (isLoversMode && isCallActive);
  const showDreamIncoming = isLoversMode && isIncomingCall;

  return (
    <CallContext.Provider value={{ startCall, isCallActive }}>
      {children}
      
      {/* Incoming call notification - Dream style for Lovers Mode */}
      {isIncomingCall && incomingCallData && (
        showDreamIncoming ? (
          <DreamIncomingCall
            callerName={incomingCallData.callerName || 'Unknown'}
            callerAvatar={contactAvatar}
            onAccept={handleAcceptCall}
            onReject={handleRejectCall}
          />
        ) : (
          <IncomingCallNotification
            callerName={incomingCallData.callerName || 'Unknown'}
            callType={incomingCallData.callType}
            onAccept={acceptCall}
            onReject={rejectCall}
          />
        )
      )}

      {/* Active call UI - Dream Call for Lovers Mode, regular for General Mode */}
      {isCallActive && (
        showDreamCall ? (
          <DreamCallUI
            contactName={contactName || incomingCallData?.callerName || 'Unknown'}
            contactAvatar={contactAvatar}
            localStream={localStream}
            remoteStream={remoteStream}
            isMuted={isMuted}
            callDuration={callDuration}
            onToggleMute={toggleMute}
            onEndCall={handleEndCall}
          />
        ) : (
          <ActiveCall
            contactName={contactName || incomingCallData?.callerName || 'Unknown'}
            isVideoCall={isVideoEnabled}
            localStream={localStream}
            remoteStream={remoteStream}
            screenStream={screenStream}
            isMuted={isMuted}
            isVideoEnabled={isVideoEnabled}
            isScreenSharing={isScreenSharing}
            callDuration={callDuration}
            onToggleMute={toggleMute}
            onToggleVideo={toggleVideo}
            onToggleScreenShare={toggleScreenShare}
            onEndCall={endCall}
          />
        )
      )}
    </CallContext.Provider>
  );
};
