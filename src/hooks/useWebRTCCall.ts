import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CallSignal {
  type: 'offer' | 'answer' | 'ice-candidate' | 'call-request' | 'call-accepted' | 'call-rejected' | 'call-ended';
  from: string;
  to: string;
  data?: any;
  callType: 'voice' | 'video';
  callerName?: string;
}

interface UseWebRTCCallReturn {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  screenStream: MediaStream | null;
  isCallActive: boolean;
  isIncomingCall: boolean;
  incomingCallData: CallSignal | null;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  callDuration: number;
  startCall: (contactId: string, contactName: string, isVideo: boolean) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => Promise<void>;
}

export const useWebRTCCall = (userId: string | null): UseWebRTCCallReturn => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [incomingCallData, setIncomingCallData] = useState<CallSignal | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const callChannel = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const callStartTime = useRef<number>(0);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  const currentCallData = useRef<{ contactId: string; contactName: string; isVideo: boolean } | null>(null);
  const screenSender = useRef<RTCRtpSender | null>(null);
  
  const { toast } = useToast();

  const ICE_SERVERS = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  };

  const saveCallHistory = useCallback(async (
    calleeId: string,
    callType: 'voice' | 'video',
    status: string,
    duration: number
  ) => {
    if (!userId) return;
    
    try {
      await supabase.from('call_history').insert({
        caller_id: userId,
        callee_id: calleeId,
        call_type: callType,
        status,
        duration_seconds: duration
      });
    } catch (error) {
      console.error('Error saving call history:', error);
    }
  }, [userId]);

  const setupPeerConnection = useCallback(async (isVideo: boolean) => {
    peerConnection.current = new RTCPeerConnection(ICE_SERVERS);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo
      });
      setLocalStream(stream);
      setIsVideoEnabled(isVideo);

      stream.getTracks().forEach(track => {
        peerConnection.current?.addTrack(track, stream);
      });
    } catch (error) {
      console.error('Error accessing media devices:', error);
      toast({
        title: "Media access failed",
        description: "Could not access camera/microphone",
        variant: "destructive"
      });
      throw error;
    }

    peerConnection.current.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate && currentCallData.current) {
        sendSignal({
          type: 'ice-candidate',
          from: userId!,
          to: currentCallData.current.contactId,
          data: event.candidate,
          callType: currentCallData.current.isVideo ? 'video' : 'voice'
        });
      }
    };

    return peerConnection.current;
  }, [userId, toast]);

  const sendSignal = useCallback((signal: CallSignal) => {
    if (callChannel.current) {
      callChannel.current.send({
        type: 'broadcast',
        event: 'call-signal',
        payload: signal
      });
    }
  }, []);

  const startDurationTimer = useCallback(() => {
    callStartTime.current = Date.now();
    durationInterval.current = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - callStartTime.current) / 1000));
    }, 1000);
  }, []);

  const stopDurationTimer = useCallback(() => {
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    localStream?.getTracks().forEach(track => track.stop());
    screenStream?.getTracks().forEach(track => track.stop());
    peerConnection.current?.close();
    peerConnection.current = null;
    screenSender.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setScreenStream(null);
    setIsCallActive(false);
    setIsIncomingCall(false);
    setIncomingCallData(null);
    setIsScreenSharing(false);
    setCallDuration(0);
    stopDurationTimer();
    currentCallData.current = null;
  }, [localStream, screenStream, stopDurationTimer]);

  const startCall = useCallback(async (contactId: string, contactName: string, isVideo: boolean) => {
    if (!userId) return;

    currentCallData.current = { contactId, contactName, isVideo };

    try {
      await setupPeerConnection(isVideo);

      // Get caller name
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('user_id', userId)
        .single();

      const callerName = profile?.display_name || profile?.username || 'Unknown';

      // Send call request
      sendSignal({
        type: 'call-request',
        from: userId,
        to: contactId,
        callType: isVideo ? 'video' : 'voice',
        callerName
      });

      setIsCallActive(true);
      
      toast({
        title: `${isVideo ? 'Video' : 'Voice'} call`,
        description: `Calling ${contactName}...`,
      });

      // Save call as outgoing
      await saveCallHistory(contactId, isVideo ? 'video' : 'voice', 'outgoing', 0);
    } catch (error) {
      cleanup();
    }
  }, [userId, setupPeerConnection, sendSignal, toast, saveCallHistory, cleanup]);

  const acceptCall = useCallback(async () => {
    if (!incomingCallData || !userId) return;

    currentCallData.current = {
      contactId: incomingCallData.from,
      contactName: incomingCallData.callerName || 'Unknown',
      isVideo: incomingCallData.callType === 'video'
    };

    try {
      const pc = await setupPeerConnection(incomingCallData.callType === 'video');

      // Send accept signal
      sendSignal({
        type: 'call-accepted',
        from: userId,
        to: incomingCallData.from,
        callType: incomingCallData.callType
      });

      // Create and send answer if we have a pending offer
      if (incomingCallData.data) {
        await pc.setRemoteDescription(new RTCSessionDescription(incomingCallData.data));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        sendSignal({
          type: 'answer',
          from: userId,
          to: incomingCallData.from,
          data: answer,
          callType: incomingCallData.callType
        });
      }

      setIsIncomingCall(false);
      setIsCallActive(true);
      startDurationTimer();

      // Save call as incoming/accepted
      await saveCallHistory(
        incomingCallData.from,
        incomingCallData.callType,
        'incoming',
        0
      );
    } catch (error) {
      console.error('Error accepting call:', error);
      cleanup();
    }
  }, [incomingCallData, userId, setupPeerConnection, sendSignal, startDurationTimer, saveCallHistory, cleanup]);

  const rejectCall = useCallback(() => {
    if (!incomingCallData || !userId) return;

    sendSignal({
      type: 'call-rejected',
      from: userId,
      to: incomingCallData.from,
      callType: incomingCallData.callType
    });

    // Save as missed call
    saveCallHistory(
      incomingCallData.from,
      incomingCallData.callType,
      'missed',
      0
    );

    setIsIncomingCall(false);
    setIncomingCallData(null);
  }, [incomingCallData, userId, sendSignal, saveCallHistory]);

  const endCall = useCallback(() => {
    if (currentCallData.current && userId) {
      sendSignal({
        type: 'call-ended',
        from: userId,
        to: currentCallData.current.contactId,
        callType: currentCallData.current.isVideo ? 'video' : 'voice'
      });

      // Update call history with duration
      saveCallHistory(
        currentCallData.current.contactId,
        currentCallData.current.isVideo ? 'video' : 'voice',
        'completed',
        callDuration
      );
    }

    cleanup();
    
    toast({
      title: "Call ended",
      description: `Duration: ${Math.floor(callDuration / 60)}:${(callDuration % 60).toString().padStart(2, '0')}`,
    });
  }, [userId, sendSignal, saveCallHistory, callDuration, cleanup, toast]);

  const toggleMute = useCallback(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  }, [localStream, isMuted]);

  const toggleVideo = useCallback(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !isVideoEnabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  }, [localStream, isVideoEnabled]);

  const toggleScreenShare = useCallback(async () => {
    if (!peerConnection.current || !currentCallData.current) return;

    try {
      if (isScreenSharing) {
        // Stop screen sharing
        screenStream?.getTracks().forEach(track => track.stop());
        setScreenStream(null);
        setIsScreenSharing(false);

        // Replace screen track with camera track
        if (localStream && screenSender.current) {
          const videoTrack = localStream.getVideoTracks()[0];
          if (videoTrack) {
            await screenSender.current.replaceTrack(videoTrack);
          }
        }
        screenSender.current = null;

        toast({
          title: "Screen sharing stopped",
        });
      } else {
        // Start screen sharing
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' } as MediaTrackConstraints,
          audio: false
        });

        setScreenStream(stream);
        setIsScreenSharing(true);

        // Replace video track with screen track
        const screenTrack = stream.getVideoTracks()[0];
        const senders = peerConnection.current.getSenders();
        const videoSender = senders.find(s => s.track?.kind === 'video');
        
        if (videoSender) {
          await videoSender.replaceTrack(screenTrack);
          screenSender.current = videoSender;
        }

        // Handle user stopping share via browser UI
        screenTrack.onended = () => {
          toggleScreenShare();
        };

        toast({
          title: "Screen sharing started",
        });
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
      if ((error as Error).name !== 'NotAllowedError') {
        toast({
          title: "Screen sharing failed",
          description: "Could not start screen sharing",
          variant: "destructive"
        });
      }
    }
  }, [isScreenSharing, screenStream, localStream, toast]);

  // Set up signaling channel
  useEffect(() => {
    if (!userId) return;

    callChannel.current = supabase.channel(`calls:${userId}`);

    callChannel.current
      .on('broadcast', { event: 'call-signal' }, async ({ payload }) => {
        const signal = payload as CallSignal;
        
        if (signal.to !== userId) return;

        switch (signal.type) {
          case 'call-request':
            setIncomingCallData(signal);
            setIsIncomingCall(true);
            break;

          case 'call-accepted':
            if (peerConnection.current) {
              const offer = await peerConnection.current.createOffer();
              await peerConnection.current.setLocalDescription(offer);
              
              sendSignal({
                type: 'offer',
                from: userId,
                to: signal.from,
                data: offer,
                callType: signal.callType
              });
              
              startDurationTimer();
            }
            break;

          case 'call-rejected':
            toast({
              title: "Call rejected",
              description: "The user declined your call",
              variant: "destructive"
            });
            cleanup();
            break;

          case 'call-ended':
            toast({
              title: "Call ended",
              description: "The other user ended the call",
            });
            cleanup();
            break;

          case 'offer':
            if (peerConnection.current) {
              await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal.data));
              const answer = await peerConnection.current.createAnswer();
              await peerConnection.current.setLocalDescription(answer);
              
              sendSignal({
                type: 'answer',
                from: userId,
                to: signal.from,
                data: answer,
                callType: signal.callType
              });
            }
            break;

          case 'answer':
            if (peerConnection.current) {
              await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal.data));
            }
            break;

          case 'ice-candidate':
            if (peerConnection.current && signal.data) {
              try {
                await peerConnection.current.addIceCandidate(new RTCIceCandidate(signal.data));
              } catch (error) {
                console.error('Error adding ICE candidate:', error);
              }
            }
            break;
        }
      })
      .subscribe();

    return () => {
      callChannel.current?.unsubscribe();
    };
  }, [userId, sendSignal, startDurationTimer, cleanup, toast]);

  return {
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
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare
  };
};
