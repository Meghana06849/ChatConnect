import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { createIceServers } from '@/lib/webrtc';

interface CallSignal {
  type: 'offer' | 'answer' | 'ice-candidate' | 'call-request' | 'call-accepted' | 'call-rejected' | 'call-ended';
  from: string;
  to: string;
  data?: unknown;
  callType: 'voice' | 'video';
  callerName?: string;
  callId?: string;
}

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
  enableCallSound: () => void;
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
  const outboundSignalChannel = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const outboundSignalRecipient = useRef<string | null>(null);
  const callStartTime = useRef<number>(0);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  const currentCallData = useRef<{ contactId: string; contactName: string; isVideo: boolean; isIncoming: boolean; callId?: string } | null>(null);
  const screenSender = useRef<RTCRtpSender | null>(null);
  const hasShownCallHistoryErrorRef = useRef(false);
  const ringbackAudioContextRef = useRef<AudioContext | null>(null);
  const ringbackTimerRef = useRef<number | null>(null);
  // Use refs to avoid stale closures in cleanup
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  
  // Keep refs in sync with state
  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);
  useEffect(() => { screenStreamRef.current = screenStream; }, [screenStream]);

  useEffect(() => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const audioEnabled = !isMuted;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = audioEnabled;
    });

    peerConnection.current?.getSenders().forEach((sender) => {
      if (sender.track?.kind === 'audio') {
        sender.track.enabled = audioEnabled;
      }
    });
  }, [isMuted, localStream]);
  
  const { toast } = useToast();

  const stopRingbackTone = useCallback(() => {
    if (ringbackTimerRef.current) {
      window.clearInterval(ringbackTimerRef.current);
      ringbackTimerRef.current = null;
    }

    if (ringbackAudioContextRef.current) {
      void ringbackAudioContextRef.current.close();
      ringbackAudioContextRef.current = null;
    }
  }, []);

  const startRingbackTone = useCallback(() => {
    stopRingbackTone();

    try {
      const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;

      ringbackAudioContextRef.current = new Ctx();

      const playRingbackBurst = () => {
        const context = ringbackAudioContextRef.current;
        if (!context) return;

        if (context.state === 'suspended') {
          void context.resume();
        }

        const now = context.currentTime;
        const oscillator = context.createOscillator();
        const gain = context.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, now);
        oscillator.frequency.linearRampToValueAtTime(480, now + 0.4);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.07, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(now);
        oscillator.stop(now + 0.45);
      };

      playRingbackBurst();
      ringbackTimerRef.current = window.setInterval(playRingbackBurst, 2200);
    } catch (error) {
      console.warn('⚠️ Could not start ringback tone:', error);
    }
  }, [stopRingbackTone]);

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
    isIncoming: boolean = false,
    callId?: string
  ) => {
    if (!userId) return;
    
    try {
      // For incoming calls, the other user is the caller
      // For outgoing calls, we (userId) are the caller
      const caller_id = isIncoming ? contactId : userId;
      const callee_id = isIncoming ? userId : contactId;
      const historyId = callId || crypto.randomUUID();
      
      const { error } = await supabase.from('call_history').upsert({
        id: historyId,
        caller_id,
        callee_id,
        call_type: callType,
        status,
        duration_seconds: duration
      }, {
        onConflict: 'id'
      });

      if (error) {
        throw error;
      }

      console.log(`📞 Call history saved: ${status} ${callType} call (${duration}s)`);
      return historyId;
    } catch (error) {
      console.error('❌ Error saving call history:', error);
      const errorObject = error as { code?: string; message?: string; details?: string; hint?: string };
      const errorText = [errorObject.code, errorObject.message, errorObject.details, errorObject.hint]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const isRlsOrPermissionError =
        errorObject.code === '42501' ||
        /permission denied|row-level security|rls|not authorized|forbidden/.test(errorText);

      if (isRlsOrPermissionError && !hasShownCallHistoryErrorRef.current) {
        hasShownCallHistoryErrorRef.current = true;
        toast({
          title: 'Call history blocked by database policy',
          description: 'The call can still proceed, but Supabase is rejecting writes to call_history. Apply the latest migration so call logs can be saved and shown in history.',
          variant: 'destructive'
        });
      }

      return null;
    }
  }, [toast, userId]);

  const sendSignal = useCallback(async (signal: CallSignal) => {
    try {
      // Keep a persistent signaling channel for this recipient so the
      // offer/answer/ICE sequence does not race channel setup/teardown.
      if (outboundSignalChannel.current && outboundSignalRecipient.current !== signal.to) {
        await outboundSignalChannel.current.unsubscribe();
        outboundSignalChannel.current = null;
        outboundSignalRecipient.current = null;
      }

      if (!outboundSignalChannel.current) {
        outboundSignalRecipient.current = signal.to;
        outboundSignalChannel.current = supabase.channel(`user:${signal.to}:calls`, {
          config: { broadcast: { self: false } }
        });

        await new Promise<void>((resolve, reject) => {
          const timeoutId = window.setTimeout(() => {
            reject(new Error('Timed out waiting for call channel subscription'));
          }, 5000);

          outboundSignalChannel.current?.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              window.clearTimeout(timeoutId);
              resolve();
            }

            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              window.clearTimeout(timeoutId);
              reject(new Error(`Call channel subscription failed with status: ${status}`));
            }
          });
        });
      }
      
      // Send the signal
      await outboundSignalChannel.current.send({
        type: 'broadcast',
        event: 'call-signal',
        payload: signal
      });
      
      console.log(`📡 Call signal sent: ${signal.type} from ${signal.from} to ${signal.to}`);
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
      peerConnection.current = new RTCPeerConnection(createIceServers());
    }

    const pc = peerConnection.current;

    const requestMediaStream = async (constraints: MediaStreamConstraints) => {
      console.log('📹 Requesting media with constraints:', constraints);
      return navigator.mediaDevices.getUserMedia(constraints);
    };

    const isPermissionDeniedError = (error: unknown) => {
      if (!error || typeof error !== 'object') return false;

      const errorObject = error as { name?: unknown; message?: unknown };
      const errorName = typeof errorObject.name === 'string' ? errorObject.name : '';
      const errorMessage = typeof errorObject.message === 'string' ? errorObject.message : '';

      return (
        errorName === 'NotAllowedError' ||
        errorName === 'PermissionDeniedError' ||
        /permission denied|permission/i.test(errorMessage)
      );
    };

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

      let stream: MediaStream | null = null;
      try {
        stream = await requestMediaStream(preferredConstraints);
        console.log('✅ Got media with preferred constraints');
      } catch (preferredError) {
        console.warn('⚠️ Preferred constraints failed, retrying with fallback...', (preferredError as Error).message);

        if (isVideo) {
          try {
            stream = await requestMediaStream({ audio: true, video: false });
            console.log('✅ Got audio-only fallback stream after video request failed');
          } catch (fallbackError) {
            console.warn('⚠️ Audio-only fallback also failed.', (fallbackError as Error).message);
            stream = null;
          }
        } else {
          try {
            stream = await requestMediaStream({ audio: true, video: false });
            console.log('✅ Got audio-only fallback stream');
          } catch (fallbackError) {
            console.warn('⚠️ Audio-only fallback also failed.', (fallbackError as Error).message);
            stream = null;
          }
        }
      }

      if (stream) {
        setLocalStream(stream);
        setIsVideoEnabled(stream.getVideoTracks().length > 0);

        console.log('📊 Adding', stream.getTracks().length, 'tracks to peer connection');
        stream.getTracks().forEach(track => {
          console.log(`  ↳ Adding ${track.kind} track:`, track.label);
          pc.addTrack(track, stream as MediaStream);
        });
        console.log('✅ All tracks added');
      } else {
        setLocalStream(null);
        setIsVideoEnabled(false);
        toast({
          title: 'Media permission blocked',
          description: 'Starting the call without local camera or microphone access. You can still receive the other person once they answer.',
          variant: 'destructive'
        });
        console.warn('⚠️ Continuing call setup without local media');
      }
    } catch (error) {
      console.error('❌ Error accessing media devices:', error);
      const errorMsg = error instanceof DOMException ? error.message : String(error);
      // Provide an actionable message for permission errors
      const isPermissionError = isPermissionDeniedError(error);

      if (isPermissionError) {
        toast({
          title: 'Camera / Microphone blocked',
          description: 'Permission denied. Allow camera and microphone for this site (browser site settings and OS privacy settings), then retry.',
          variant: 'destructive'
        });
        console.warn('Hint: check browser site permissions and OS settings.');
      } else {
        toast({
          title: 'Media access failed',
          description: `Could not access camera/microphone: ${errorMsg}`,
          variant: 'destructive'
        });
      }

      // Re-throw so callers can handle fallback paths
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
        stopRingbackTone();
        setIsCallActive(true);
        startDurationTimer();
        if (currentCallData.current) {
          void saveCallHistory(
            currentCallData.current.contactId,
            currentCallData.current.isVideo ? 'video' : 'voice',
            'connected',
            0,
            currentCallData.current.isIncoming,
            currentCallData.current.callId
          );
        }
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
    stopRingbackTone();
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

    if (outboundSignalChannel.current) {
      void outboundSignalChannel.current.unsubscribe();
      outboundSignalChannel.current = null;
      outboundSignalRecipient.current = null;
    }
  }, [stopDurationTimer, stopRingbackTone]);

  const startCall = useCallback(async (contactId: string, contactName: string, isVideo: boolean) => {
    if (!userId) return;

    console.log(`📞 Starting ${isVideo ? 'video' : 'voice'} call to ${contactName} (${contactId})`);
    
    const callId = crypto.randomUUID();
    currentCallData.current = { contactId, contactName, isVideo, isIncoming: false, callId };

    try {
      setIsCallActive(true);
      startRingbackTone();
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

      await saveCallHistory(contactId, isVideo ? 'video' : 'voice', 'outgoing', 0, false, callId);

      console.log('📤 Sending call request signal...');
      await sendSignal({
        type: 'call-request',
        from: userId,
        to: contactId,
        data: offer,
        callType: isVideo ? 'video' : 'voice',
        callerName,
        callId
      });
      console.log('✅ Call request sent');

      toast({
        title: `${isVideo ? 'Video' : 'Voice'} call`,
        description: `Calling ${contactName}...`,
      });
    } catch (error) {
      console.error('❌ Error starting call:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('   Error details:', errorMsg);
      if (currentCallData.current?.callId) {
        await saveCallHistory(
          contactId,
          isVideo ? 'video' : 'voice',
          'failed',
          0,
          false,
          currentCallData.current.callId
        );
      }
      cleanup();
      toast({
        title: "Call failed",
        description: `Unable to start call: ${errorMsg}`,
        variant: "destructive"
      });
    }
  }, [userId, setupPeerConnection, sendSignal, startDurationTimer, toast, saveCallHistory, cleanup, startRingbackTone]);

  const acceptCall = useCallback(async () => {
    if (!incomingCallData || !userId) return;

    currentCallData.current = {
      contactId: incomingCallData.from,
      contactName: incomingCallData.callerName || 'Unknown',
      isVideo: incomingCallData.callType === 'video',
      isIncoming: true,
      callId: incomingCallData.callId
    };

    try {
      setIsCallActive(true);
      const pc = await setupPeerConnection(incomingCallData.callType === 'video');

      // Send accept signal
      await sendSignal({
        type: 'call-accepted',
        from: userId,
        to: incomingCallData.from,
        callType: incomingCallData.callType,
        callId: incomingCallData.callId
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
        
        await sendSignal({
          type: 'answer',
          from: userId,
          to: incomingCallData.from,
          data: answer,
          callType: incomingCallData.callType,
          callId: incomingCallData.callId
        });
      }

      setIsIncomingCall(false);
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
      callType: incomingCallData.callType,
      callId: incomingCallData.callId
    });

    // Save as rejected call (isIncoming=true: they were the caller)
    await saveCallHistory(
      incomingCallData.from,
      incomingCallData.callType,
      'rejected',
      0,
      true,
      incomingCallData.callId
    );

    // Notify the caller that their call was rejected
    await sendPushNotification(
      incomingCallData.from,
      'Call Rejected',
      `Your ${incomingCallData.callType} call was rejected`,
      { type: 'call-rejected', callType: incomingCallData.callType }
    );

    setIsIncomingCall(false);
    setIncomingCallData(null);
  }, [incomingCallData, userId, sendSignal, saveCallHistory, sendPushNotification]);

  const endCall = useCallback(async () => {
    if (currentCallData.current && userId) {
      await sendSignal({
        type: 'call-ended',
        from: userId,
        to: currentCallData.current.contactId,
        callType: currentCallData.current.isVideo ? 'video' : 'voice',
        callId: currentCallData.current.callId
      });

      // Save call history with final duration using isIncoming flag from currentCallData
      await saveCallHistory(
        currentCallData.current.contactId,
        currentCallData.current.isVideo ? 'video' : 'voice',
        'completed',
        callDuration,
        currentCallData.current.isIncoming,
        currentCallData.current.callId
      );
    }

    cleanup();
    
    toast({
      title: "Call ended",
      description: `Duration: ${Math.floor(callDuration / 60)}:${(callDuration % 60).toString().padStart(2, '0')}`,
    });
  }, [userId, sendSignal, saveCallHistory, callDuration, cleanup, toast]);

  const toggleMute = useCallback(() => {
    setIsMuted((currentMuted) => !currentMuted);
  }, []);

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
              // Remote user accepted; wait for the peer connection to become connected.
              console.log(`✅ Call accepted by ${signal.from}`);
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
                  console.log(`🔗 Remote description set, waiting for connection`);
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
    toggleScreenShare,
    enableCallSound: startRingbackTone
  };
};
