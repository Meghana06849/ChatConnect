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
  const currentCallData = useRef<{ contactId: string; contactName: string; isVideo: boolean; isIncoming: boolean } | null>(null);
  const screenSender = useRef<RTCRtpSender | null>(null);
  // Use refs to avoid stale closures in cleanup
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  
  // Keep refs in sync with state
  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);
  useEffect(() => { screenStreamRef.current = screenStream; }, [screenStream]);
  
  const { toast } = useToast();

  const sendPushNotification = useCallback(async (
    recipientId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>
  ) => {
    try {
      // Call the send-push-notification edge function
      const response = await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: recipientId,
          title,
          body,
          data: data || {}
        }
      });
      
      if (response.error) {
        console.warn('📳 Push notification send failed:', response.error);
      } else {
        console.log('📳 Push notification sent to', recipientId);
      }
    } catch (error) {
      console.warn('⚠️ Error sending push notification:', error);
      // Don't fail the call if push notification fails
    }
  }, []);

  const saveCallHistory = useCallback(async (
    contactId: string,
    callType: 'voice' | 'video',
    status: string,
    duration: number,
    isIncoming: boolean = false
  ) => {
    if (!userId) return;
    
    try {
      // For incoming calls, the other user is the caller
      // For outgoing calls, we (userId) are the caller
      const caller_id = isIncoming ? contactId : userId;
      const callee_id = isIncoming ? userId : contactId;
      
      await supabase.from('call_history').insert({
        caller_id,
        callee_id,
        call_type: callType,
        status,
        duration_seconds: duration
      });
      console.log(`📞 Call history saved: ${status} ${callType} call (${duration}s)`);
    } catch (error) {
      console.error('❌ Error saving call history:', error);
    }
  }, [userId]);

  const sendSignal = useCallback(async (signal: CallSignal) => {
    try {
      // Send signal to partner's user channel for real-time reception
      const partnerChannel = supabase.channel(`user:${signal.to}:calls`, {
        config: { broadcast: { self: false } }
      });
      
      // Subscribe to ensure connection is established
      await partnerChannel.subscribe();
      
      // Send the signal
      await partnerChannel.send({
        type: 'broadcast',
        event: 'call-signal',
        payload: signal
      });
      
      console.log(`📡 Call signal sent: ${signal.type} from ${signal.from} to ${signal.to}`);
      
      // Unsubscribe after sending to avoid memory leaks
      await partnerChannel.unsubscribe();
    } catch (error) {
      console.error('❌ Failed to send call signal:', error);
      toast({
        title: 'Signal failed',
        description: 'Failed to send call signal. Check connection.',
        variant: 'destructive'
      });
    }
  }, [toast]);

  const setupPeerConnection = useCallback(async (isVideo: boolean) => {
    console.log('🔧 Setting up peer connection (isVideo:', isVideo, ')');
    
    if (!peerConnection.current) {
      peerConnection.current = new RTCPeerConnection(WEBRTC_ICE_SERVERS);
    }

    const pc = peerConnection.current;

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
        video: isVideo || undefined,
      };

      let stream: MediaStream;
      try {
        console.log('📹 Requesting media with preferred constraints...');
        stream = await navigator.mediaDevices.getUserMedia(preferredConstraints);
        console.log('✅ Got media with preferred constraints');
      } catch (preferredError) {
        console.warn('⚠️ Preferred constraints failed, retrying with fallback...', (preferredError as Error).message);
        stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
        console.log('✅ Got media with fallback constraints');
      }

      setLocalStream(stream);
      setIsVideoEnabled(isVideo);

      console.log('📊 Adding', stream.getTracks().length, 'tracks to peer connection');
      stream.getTracks().forEach(track => {
        console.log(`  ↳ Adding ${track.kind} track:`, track.label);
        pc.addTrack(track, stream);
      });
      console.log('✅ All tracks added');
    } catch (error) {
      console.error('❌ Error accessing media devices:', error);
      const errorMsg = error instanceof DOMException ? error.message : String(error);
      toast({
        title: "Media access failed",
        description: `Could not access camera/microphone: ${errorMsg}`,
        variant: "destructive"
      });
      throw error;
    }

    pc.ontrack = (event) => {
      console.log('🎥 Received remote track:', event.track.kind);
      if (event.streams && event.streams[0]) {
        console.log('📺 Setting remote stream');
        setRemoteStream(event.streams[0]);
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log(`🔌 Peer connection state: ${state}`);
      
      if (state === 'connected') {
        console.log('✅ Call connected successfully!');
        toast({
          title: "Call connected",
          description: "Connected to peer",
        });
      } else if (state === 'failed') {
        console.error('❌ Peer connection failed');
        toast({
          title: "Connection failed",
          description: "Could not establish connection. Try again.",
          variant: "destructive"
        });
      } else if (state === 'disconnected') {
        console.warn('⚠️ Peer connection disconnected');
        toast({
          title: "Disconnected",
          description: "Call disconnected",
          variant: "destructive"
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log(`❄️ ICE connection state: ${state}`);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('❄️ ICE candidate generated');
        
        if (currentCallData.current) {
          sendSignal({
            type: 'ice-candidate',
            from: userId!,
            to: currentCallData.current.contactId,
            data: event.candidate,
            callType: currentCallData.current.isVideo ? 'video' : 'voice'
          });
        } else {
          console.warn('⚠️ ICE candidate arrived but currentCallData not set');
        }
      } else {
        console.log('✅ ICE gathering complete');
      }
    };

    pc.onicegatheringstatechange = () => {
      console.log(`📍 ICE gathering state: ${pc.iceGatheringState}`);
    };

    console.log('🎯 Peer connection setup complete');
    return pc;
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

    console.log(`📞 Starting ${isVideo ? 'video' : 'voice'} call to ${contactName} (${contactId})`);
    
    currentCallData.current = { contactId, contactName, isVideo, isIncoming: false };

    try {
      console.log('🔧 Setting up peer connection...');
      const pc = await setupPeerConnection(isVideo);
      console.log('✅ Peer connection setup complete');

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('user_id', userId)
        .single();

      const callerName = profile?.display_name || profile?.username || 'Unknown';
      console.log('✅ Caller name:', callerName);

      console.log('📋 Creating SDP offer...');
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: isVideo
      });
      console.log('✅ Offer created, setting local description...');
      await pc.setLocalDescription(offer);
      console.log('✅ Local description set');

      console.log('📤 Sending call request signal...');
      await sendSignal({
        type: 'call-request',
        from: userId,
        to: contactId,
        data: offer,
        callType: isVideo ? 'video' : 'voice',
        callerName
      });
      console.log('✅ Call request sent');

      setIsCallActive(true);

      toast({
        title: `${isVideo ? 'Video' : 'Voice'} call`,
        description: `Calling ${contactName}...`,
      });
    } catch (error) {
      console.error('❌ Error starting call:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('   Error details:', errorMsg);
      cleanup();
      toast({
        title: "Call failed",
        description: `Unable to start call: ${errorMsg}`,
        variant: "destructive"
      });
    }
  }, [userId, setupPeerConnection, sendSignal, startDurationTimer, toast, saveCallHistory, cleanup]);

  const acceptCall = useCallback(async () => {
    if (!incomingCallData || !userId) return;

    currentCallData.current = {
      contactId: incomingCallData.from,
      contactName: incomingCallData.callerName || 'Unknown',
      isVideo: incomingCallData.callType === 'video',
      isIncoming: true
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

      // Notify the caller that their call was accepted
      await sendPushNotification(
        incomingCallData.from,
        'Call Accepted',
        'Your call was accepted',
        { type: 'call-accepted', callType: incomingCallData.callType }
      );

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
    } catch (error) {
      console.error('Error accepting call:', error);
      cleanup();
    }
  }, [incomingCallData, userId, setupPeerConnection, sendSignal, startDurationTimer, saveCallHistory, cleanup, sendPushNotification]);

  const rejectCall = useCallback(async () => {
    if (!incomingCallData || !userId) return;

    sendSignal({
      type: 'call-rejected',
      from: userId,
      to: incomingCallData.from,
      callType: incomingCallData.callType
    });

    // Save as missed call (isIncoming=true: they were the caller)
    await saveCallHistory(
      incomingCallData.from,
      incomingCallData.callType,
      'missed',
      0,
      true
    );

    // Notify the caller that their call was rejected
    await sendPushNotification(
      incomingCallData.from,
      'Call Missed',
      `Your ${incomingCallData.callType} call was not answered`,
      { type: 'call-missed', callType: incomingCallData.callType }
    );

    setIsIncomingCall(false);
    setIncomingCallData(null);
  }, [incomingCallData, userId, sendSignal, saveCallHistory, sendPushNotification]);

  const endCall = useCallback(async () => {
    if (currentCallData.current && userId) {
      sendSignal({
        type: 'call-ended',
        from: userId,
        to: currentCallData.current.contactId,
        callType: currentCallData.current.isVideo ? 'video' : 'voice'
      });

      // Save call history with final duration using isIncoming flag from currentCallData
      await saveCallHistory(
        currentCallData.current.contactId,
        currentCallData.current.isVideo ? 'video' : 'voice',
        'completed',
        callDuration,
        currentCallData.current.isIncoming
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
        
        if (signal.to !== userId) {
          console.warn(`📡 Signal intended for ${signal.to}, ignoring`);
          return;
        }

        console.log(`📨 Received call signal: ${signal.type} from ${signal.from}`);

        try {
          switch (signal.type) {
            case 'call-request':
              // Store the offer in incoming call data for later processing
              console.log(`📞 Incoming call request from ${signal.from}`);
              setIncomingCallData(signal);
              setIsIncomingCall(true);
              toast({
                title: 'Incoming call',
                description: `${signal.callerName || 'Someone'} is calling...`,
              });
              // Send push notification to the receiver
              await sendPushNotification(
                userId,
                'Incoming Call',
                `${signal.callerName || 'Someone'} is calling...`,
                { type: 'incoming-call', callerId: signal.from, callType: signal.callType }
              );
              break;

            case 'call-accepted':
              // Remote user accepted, mark call active and begin duration timing.
              console.log(`✅ Call accepted by ${signal.from}`);
              setIsCallActive(true);
              startDurationTimer();
              toast({
                title: 'Call accepted',
                description: 'Connecting...',
              });
              // Send push notification to the caller
              await sendPushNotification(
                userId,
                'Call Accepted',
                'Your call was accepted. Connecting...',
                { type: 'call-accepted', callerId: signal.from }
              );
              break;

            case 'call-rejected':
              console.log(`❌ Call rejected by ${signal.from}`);
              toast({
                title: "Call rejected",
                description: "The user declined your call",
                variant: "destructive"
              });
              // Send push notification to the caller
              await sendPushNotification(
                userId,
                'Call Rejected',
                'Your call was declined',
                { type: 'call-rejected' }
              );
              cleanup();
              break;

            case 'call-ended':
              console.log(`🔴 Call ended by ${signal.from}`);
              toast({
                title: "Call ended",
                description: "The other user ended the call",
              });
              // Send push notification
              await sendPushNotification(
                userId,
                'Call Ended',
                'The call has ended',
                { type: 'call-ended' }
              );
              cleanup();
              break;

            case 'offer':
              console.log(`📋 Received SDP offer from ${signal.from}`);
              if (peerConnection.current && isSessionDescriptionInit(signal.data)) {
                try {
                  await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal.data));
                  const answer = await peerConnection.current.createAnswer();
                  await peerConnection.current.setLocalDescription(answer);
                  
                  await sendSignal({
                    type: 'answer',
                    from: userId,
                    to: signal.from,
                    data: answer,
                    callType: signal.callType
                  });
                  console.log(`📝 Sent SDP answer to ${signal.from}`);
                } catch (error) {
                  console.error('❌ Error processing offer:', error);
                }
              } else {
                console.warn('⚠️ No peer connection or invalid SDP offer');
              }
              break;

            case 'answer':
              console.log(`✔️ Received SDP answer from ${signal.from}`);
              if (peerConnection.current && isSessionDescriptionInit(signal.data)) {
                try {
                  await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal.data));
                  setIsCallActive(true);
                  startDurationTimer();
                  console.log(`🔗 Remote description set, call active`);
                } catch (error) {
                  console.error('❌ Error setting remote description (answer):', error);
                }
              }
              break;

            case 'ice-candidate':
              if (peerConnection.current && isIceCandidateInit(signal.data)) {
                try {
                  await peerConnection.current.addIceCandidate(new RTCIceCandidate(signal.data));
                  console.log(`❄️ ICE candidate added from ${signal.from}`);
                } catch (error) {
                  console.error('❌ Error adding ICE candidate:', error);
                }
              }
              break;

            default:
              console.warn(`⚠️ Unknown signal type: ${signal.type}`);
          }
        } catch (error) {
          console.error('❌ Error processing call signal:', error);
          toast({
            title: 'Signal error',
            description: 'Failed to process call signal',
            variant: 'destructive'
          });
        }
      })
      .subscribe((status) => {
        console.log(`✅ Call channel subscription status: ${status}`);
        if (status === 'SUBSCRIBED') {
          console.log(`📡 Ready to receive calls on ${channelName}`);
        }
      });

    return () => {
      console.log(`🔌 Unsubscribing from ${channelName}`);
      callChannel.current?.unsubscribe();
    };
  }, [userId, sendSignal, startDurationTimer, cleanup, toast, sendPushNotification]);

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
