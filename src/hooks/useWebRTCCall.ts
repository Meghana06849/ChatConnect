import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CallSignal {
  type: 'offer' | 'answer' | 'ice-candidate' | 'call-request' | 'call-accepted' | 'call-rejected' | 'call-ended';
  from: string;
  to: string;
  data?: unknown;
  callType: 'voice' | 'video';
  callerName?: string;
}

const WEBRTC_ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
};

const isSessionDescriptionInit = (value: unknown): value is RTCSessionDescriptionInit => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const type = (value as { type?: unknown }).type;
  return type === 'offer' || type === 'answer' || type === 'pranswer' || type === 'rollback';
};

const isIceCandidateInit = (value: unknown): value is RTCIceCandidateInit => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return typeof (value as { candidate?: unknown }).candidate === 'string';
};

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
  // Use refs to avoid stale closures in cleanup
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  
  // Keep refs in sync with state
  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);
  useEffect(() => { screenStreamRef.current = screenStream; }, [screenStream]);
  
  const { toast } = useToast();

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

  const sendSignal = useCallback((signal: CallSignal) => {
    // Send signal to partner's user channel for real-time reception
    const partnerChannel = supabase.channel(`user:${signal.to}:calls`);
    partnerChannel.send({
      type: 'broadcast',
      event: 'call-signal',
      payload: signal
    });
  }, []);

  const setupPeerConnection = useCallback(async (isVideo: boolean) => {
    peerConnection.current = new RTCPeerConnection(WEBRTC_ICE_SERVERS);

    try {
      // Try high-quality constraints first, then graceful fallback for stricter devices.
      const preferredConstraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        },
        video: isVideo ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } : false
      };

      const fallbackConstraints: MediaStreamConstraints = {
        audio: true,
        video: isVideo,
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(preferredConstraints);
      } catch (preferredError) {
        console.warn('Preferred media constraints failed, retrying with fallback constraints.', preferredError);
        stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
      }

      setLocalStream(stream);
      setIsVideoEnabled(isVideo);

      stream.getTracks().forEach(track => {
        peerConnection.current?.addTrack(track, stream);
      });
    } catch (error) {
      console.error('Error accessing media devices:', error);
      toast({
        title: "Media access failed",
        description: "Could not access camera/microphone. Check permissions.",
        variant: "destructive"
      });
      throw error;
    }

    peerConnection.current.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    peerConnection.current.onconnectionstatechange = () => {
      const state = peerConnection.current?.connectionState;
      console.log('Connection state:', state);
      if (state === 'failed' || state === 'disconnected') {
        toast({
          title: "Connection issue",
          description: "Call connection unstable. Attempting to reconnect...",
          variant: "destructive"
        });
      }
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

    peerConnection.current.onicegatheringstatechange = () => {
      console.log('ICE gathering state:', peerConnection.current?.iceGatheringState);
    };

    return peerConnection.current;
  }, [userId, toast, sendSignal]);

  const startDurationTimer = useCallback(() => {
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }
    callStartTime.current = Date.now();
    setCallDuration(0);
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
    // Use refs to avoid stale closure over stream state
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    screenStreamRef.current?.getTracks().forEach(track => track.stop());
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
    callStartTime.current = 0;
    stopDurationTimer();
    currentCallData.current = null;
  }, [stopDurationTimer]);

  const startCall = useCallback(async (contactId: string, contactName: string, isVideo: boolean) => {
    if (!userId) return;

    currentCallData.current = { contactId, contactName, isVideo };

    try {
      const pc = await setupPeerConnection(isVideo);

      // Get caller name
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('user_id', userId)
        .single();

      const callerName = profile?.display_name || profile?.username || 'Unknown';

      // Create SDP offer
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: isVideo
      });
      await pc.setLocalDescription(offer);

      // Send call request with offer
      sendSignal({
        type: 'call-request',
        from: userId,
        to: contactId,
        data: offer,
        callType: isVideo ? 'video' : 'voice',
        callerName
      });

      // Show the call window immediately while the other user is ringing.
      setIsCallActive(true);

      toast({
        title: `${isVideo ? 'Video' : 'Voice'} call`,
        description: `Calling ${contactName}...`,
      });

      // Save call as outgoing
      await saveCallHistory(contactId, isVideo ? 'video' : 'voice', 'outgoing', 0);
    } catch (error) {
      console.error('Error starting call:', error);
      cleanup();
      toast({
        title: "Call failed",
        description: "Unable to start call. Please try again.",
        variant: "destructive"
      });
    }
  }, [userId, setupPeerConnection, sendSignal, startDurationTimer, toast, saveCallHistory, cleanup]);

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
      if (isSessionDescriptionInit(incomingCallData.data)) {
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

  // Set up signaling channel for receiving call signals
  useEffect(() => {
    if (!userId) return;

    // Listen for incoming call signals on a dedicated channel
    const channelName = `user:${userId}:calls`;
    callChannel.current = supabase.channel(channelName, {
      config: {
        broadcast: {
          self: false // Don't receive our own broadcasts
        }
      }
    });

    callChannel.current
      .on('broadcast', { event: 'call-signal' }, async ({ payload }) => {
        const signal = payload as CallSignal;
        
        if (signal.to !== userId) return;

        try {
          switch (signal.type) {
            case 'call-request':
              // Store the offer in incoming call data for later processing
              setIncomingCallData(signal);
              setIsIncomingCall(true);
              break;

            case 'call-accepted':
              // Remote user accepted, mark call active and begin duration timing.
              setIsCallActive(true);
              startDurationTimer();
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
              if (peerConnection.current && isSessionDescriptionInit(signal.data)) {
                try {
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
                } catch (error) {
                  console.error('Error processing offer:', error);
                }
              }
              break;

            case 'answer':
              if (peerConnection.current && isSessionDescriptionInit(signal.data)) {
                try {
                  await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal.data));
                  setIsCallActive(true);
                  startDurationTimer();
                } catch (error) {
                  console.error('Error setting remote description (answer):', error);
                }
              }
              break;

            case 'ice-candidate':
              if (peerConnection.current && isIceCandidateInit(signal.data)) {
                try {
                  await peerConnection.current.addIceCandidate(new RTCIceCandidate(signal.data));
                } catch (error) {
                  console.error('Error adding ICE candidate:', error);
                }
              }
              break;
          }
        } catch (error) {
          console.error('Error processing call signal:', error);
        }
      })
      .subscribe((status) => {
        console.log(`Call channel subscription status: ${status}`);
      });

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
