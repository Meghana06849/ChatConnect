import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Participant {
  userId: string;
  userName: string;
  stream: MediaStream | null;
  peerConnection: RTCPeerConnection;
}

interface GroupCallSignal {
  type: 'join-room' | 'leave-room' | 'offer' | 'answer' | 'ice-candidate' | 'participant-joined' | 'participant-left';
  from: string;
  fromName?: string;
  to?: string;
  roomId: string;
  data?: any;
}

interface UseGroupCallReturn {
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  participants: Map<string, Participant>;
  isInCall: boolean;
  isScreenSharing: boolean;
  isMuted: boolean;
  isVideoEnabled: boolean;
  callDuration: number;
  roomId: string | null;
  createRoom: (roomName: string, isVideo: boolean) => Promise<string>;
  joinRoom: (roomId: string, isVideo: boolean) => Promise<void>;
  leaveRoom: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => Promise<void>;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
};

export const useGroupCall = (userId: string | null): UseGroupCallReturn => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  const [isInCall, setIsInCall] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [roomId, setRoomId] = useState<string | null>(null);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  const userNameRef = useRef<string>('');
  const isVideoCall = useRef<boolean>(true);

  const { toast } = useToast();

  // Get user display name
  useEffect(() => {
    const fetchUserName = async () => {
      if (!userId) return;
      const { data } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('user_id', userId)
        .single();
      userNameRef.current = data?.display_name || data?.username || 'Unknown';
    };
    fetchUserName();
  }, [userId]);

  const startDurationTimer = useCallback(() => {
    durationInterval.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  }, []);

  const stopDurationTimer = useCallback(() => {
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }
  }, []);

  const sendSignal = useCallback((signal: GroupCallSignal) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'group-call-signal',
        payload: signal
      });
    }
  }, []);

  const createPeerConnection = useCallback(async (participantId: string, participantName: string) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    // Handle incoming tracks
    pc.ontrack = (event) => {
      setParticipants(prev => {
        const updated = new Map(prev);
        const existing = updated.get(participantId);
        if (existing) {
          existing.stream = event.streams[0];
          updated.set(participantId, existing);
        }
        return updated;
      });
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && roomId) {
        sendSignal({
          type: 'ice-candidate',
          from: userId!,
          to: participantId,
          roomId,
          data: event.candidate
        });
      }
    };

    peerConnections.current.set(participantId, pc);

    // Add to participants
    setParticipants(prev => {
      const updated = new Map(prev);
      updated.set(participantId, {
        userId: participantId,
        userName: participantName,
        stream: null,
        peerConnection: pc
      });
      return updated;
    });

    return pc;
  }, [localStream, roomId, userId, sendSignal]);

  const setupLocalStream = useCallback(async (isVideo: boolean) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo
      });
      setLocalStream(stream);
      setIsVideoEnabled(isVideo);
      isVideoCall.current = isVideo;
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      toast({
        title: "Media access failed",
        description: "Could not access camera/microphone",
        variant: "destructive"
      });
      throw error;
    }
  }, [toast]);

  const createRoom = useCallback(async (roomName: string, isVideo: boolean): Promise<string> => {
    if (!userId) throw new Error('Not authenticated');

    const newRoomId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    await setupLocalStream(isVideo);
    
    // Set up channel
    channelRef.current = supabase.channel(`group-call:${newRoomId}`);
    
    channelRef.current
      .on('broadcast', { event: 'group-call-signal' }, async ({ payload }) => {
        await handleSignal(payload as GroupCallSignal);
      })
      .subscribe();

    setRoomId(newRoomId);
    setIsInCall(true);
    startDurationTimer();

    toast({
      title: "Room created",
      description: `Room ID: ${newRoomId.slice(0, 15)}...`,
    });

    return newRoomId;
  }, [userId, setupLocalStream, startDurationTimer, toast]);

  const joinRoom = useCallback(async (targetRoomId: string, isVideo: boolean) => {
    if (!userId) throw new Error('Not authenticated');

    const stream = await setupLocalStream(isVideo);
    
    // Set up channel
    channelRef.current = supabase.channel(`group-call:${targetRoomId}`);
    
    channelRef.current
      .on('broadcast', { event: 'group-call-signal' }, async ({ payload }) => {
        await handleSignal(payload as GroupCallSignal);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Announce joining
          sendSignal({
            type: 'join-room',
            from: userId,
            fromName: userNameRef.current,
            roomId: targetRoomId
          });
        }
      });

    setRoomId(targetRoomId);
    setIsInCall(true);
    startDurationTimer();

    toast({
      title: "Joined room",
      description: "Connected to group call",
    });
  }, [userId, setupLocalStream, sendSignal, startDurationTimer, toast]);

  const handleSignal = useCallback(async (signal: GroupCallSignal) => {
    if (!userId || signal.from === userId) return;

    switch (signal.type) {
      case 'join-room':
        // Someone joined, create offer
        const pc = await createPeerConnection(signal.from, signal.fromName || 'Unknown');
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        sendSignal({
          type: 'offer',
          from: userId,
          fromName: userNameRef.current,
          to: signal.from,
          roomId: signal.roomId,
          data: offer
        });

        toast({
          title: "Participant joined",
          description: `${signal.fromName || 'Someone'} joined the call`,
        });
        break;

      case 'offer':
        if (signal.to !== userId) return;
        
        const answerPc = await createPeerConnection(signal.from, signal.fromName || 'Unknown');
        await answerPc.setRemoteDescription(new RTCSessionDescription(signal.data));
        const answer = await answerPc.createAnswer();
        await answerPc.setLocalDescription(answer);
        
        sendSignal({
          type: 'answer',
          from: userId,
          to: signal.from,
          roomId: signal.roomId,
          data: answer
        });
        break;

      case 'answer':
        if (signal.to !== userId) return;
        const existingPc = peerConnections.current.get(signal.from);
        if (existingPc) {
          await existingPc.setRemoteDescription(new RTCSessionDescription(signal.data));
        }
        break;

      case 'ice-candidate':
        if (signal.to !== userId) return;
        const icePc = peerConnections.current.get(signal.from);
        if (icePc && signal.data) {
          try {
            await icePc.addIceCandidate(new RTCIceCandidate(signal.data));
          } catch (error) {
            console.error('Error adding ICE candidate:', error);
          }
        }
        break;

      case 'leave-room':
        // Remove participant
        const leavingPc = peerConnections.current.get(signal.from);
        if (leavingPc) {
          leavingPc.close();
          peerConnections.current.delete(signal.from);
        }
        setParticipants(prev => {
          const updated = new Map(prev);
          updated.delete(signal.from);
          return updated;
        });
        
        toast({
          title: "Participant left",
          description: `${signal.fromName || 'Someone'} left the call`,
        });
        break;
    }
  }, [userId, createPeerConnection, sendSignal, toast]);

  const leaveRoom = useCallback(() => {
    if (roomId && userId) {
      sendSignal({
        type: 'leave-room',
        from: userId,
        fromName: userNameRef.current,
        roomId
      });
    }

    // Clean up
    localStream?.getTracks().forEach(track => track.stop());
    screenStream?.getTracks().forEach(track => track.stop());
    
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    
    channelRef.current?.unsubscribe();
    channelRef.current = null;

    setLocalStream(null);
    setScreenStream(null);
    setParticipants(new Map());
    setIsInCall(false);
    setIsScreenSharing(false);
    setRoomId(null);
    setCallDuration(0);
    stopDurationTimer();

    toast({
      title: "Left call",
      description: `Duration: ${Math.floor(callDuration / 60)}:${(callDuration % 60).toString().padStart(2, '0')}`,
    });
  }, [roomId, userId, localStream, screenStream, callDuration, sendSignal, stopDurationTimer, toast]);

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
    try {
      if (isScreenSharing) {
        screenStream?.getTracks().forEach(track => track.stop());
        setScreenStream(null);
        setIsScreenSharing(false);

        // Replace screen track with camera track for all peers
        if (localStream) {
          const videoTrack = localStream.getVideoTracks()[0];
          peerConnections.current.forEach(pc => {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video');
            if (sender && videoTrack) {
              sender.replaceTrack(videoTrack);
            }
          });
        }

        toast({ title: "Screen sharing stopped" });
      } else {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' } as MediaTrackConstraints,
          audio: false
        });

        setScreenStream(stream);
        setIsScreenSharing(true);

        const screenTrack = stream.getVideoTracks()[0];
        
        // Replace video track with screen track for all peers
        peerConnections.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        });

        screenTrack.onended = () => {
          toggleScreenShare();
        };

        toast({ title: "Screen sharing started" });
      }
    } catch (error) {
      if ((error as Error).name !== 'NotAllowedError') {
        toast({
          title: "Screen sharing failed",
          variant: "destructive"
        });
      }
    }
  }, [isScreenSharing, screenStream, localStream, toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveRoom();
    };
  }, []);

  return {
    localStream,
    screenStream,
    participants,
    isInCall,
    isScreenSharing,
    isMuted,
    isVideoEnabled,
    callDuration,
    roomId,
    createRoom,
    joinRoom,
    leaveRoom,
    toggleMute,
    toggleVideo,
    toggleScreenShare
  };
};
