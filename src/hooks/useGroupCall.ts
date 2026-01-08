import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Participant {
  userId: string;
  userName: string;
  stream: MediaStream | null;
  peerConnection: RTCPeerConnection;
  isScreenSharing: boolean;
}

export interface GroupCallChatMessage {
  id: string;
  from: string;
  fromName: string;
  text: string;
  sentAt: string;
}

interface GroupCallSignal {
  type:
    | 'join-room'
    | 'leave-room'
    | 'offer'
    | 'answer'
    | 'ice-candidate'
    | 'screen-status';
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
  messages: GroupCallChatMessage[];
  sendChatMessage: (text: string) => Promise<void>;
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

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }],
};

const toChatMessage = (row: any): GroupCallChatMessage => ({
  id: row.id,
  from: row.user_id,
  fromName: row.from_name || 'Unknown',
  text: row.text,
  sentAt: row.created_at,
});

export const useGroupCall = (userId: string | null): UseGroupCallReturn => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  const [messages, setMessages] = useState<GroupCallChatMessage[]>([]);
  const [isInCall, setIsInCall] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [roomId, setRoomId] = useState<string | null>(null);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const durationInterval = useRef<number | null>(null);
  const userNameRef = useRef<string>('');

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
    if (durationInterval.current) return;
    durationInterval.current = window.setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  const stopDurationTimer = useCallback(() => {
    if (durationInterval.current) {
      window.clearInterval(durationInterval.current);
      durationInterval.current = null;
    }
  }, []);

  const sendSignal = useCallback((signal: GroupCallSignal) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'group-call-signal',
      payload: signal,
    });
  }, []);

  const setParticipantScreenStatus = useCallback((participantId: string, sharing: boolean) => {
    setParticipants((prev) => {
      const next = new Map(prev);
      const existing = next.get(participantId);
      if (!existing) return prev;
      next.set(participantId, { ...existing, isScreenSharing: sharing });
      return next;
    });
  }, []);

  const loadChatHistory = useCallback(
    async (targetRoomId: string) => {
      if (!userId) return;
      const { data, error } = await supabase
        .from('group_call_messages')
        .select('id, room_id, user_id, from_name, text, created_at')
        .eq('room_id', targetRoomId)
        .order('created_at', { ascending: true })
        .limit(200);

      if (error) {
        // If RLS blocks, don't spam UI; just show empty
        console.warn('Failed to load call chat history:', error);
        return;
      }

      setMessages((data || []).map(toChatMessage));
    },
    [userId]
  );

  const upsertMyParticipation = useCallback(
    async (targetRoomId: string) => {
      if (!userId) return;
      const { error } = await supabase.from('group_call_participants').upsert(
        {
          room_id: targetRoomId,
          user_id: userId,
        },
        { onConflict: 'room_id,user_id' }
      );
      if (error) console.warn('Failed to upsert group call participation:', error);
    },
    [userId]
  );

  const removeMyParticipation = useCallback(
    async (targetRoomId: string) => {
      if (!userId) return;
      const { error } = await supabase
        .from('group_call_participants')
        .delete()
        .eq('room_id', targetRoomId)
        .eq('user_id', userId);
      if (error) console.warn('Failed to remove group call participation:', error);
    },
    [userId]
  );

  const sendChatMessage = useCallback(
    async (text: string) => {
      if (!roomId || !userId) return;
      const clean = text.trim();
      if (!clean) return;

      const id = crypto.randomUUID();
      const optimistic: GroupCallChatMessage = {
        id,
        from: userId,
        fromName: userNameRef.current || 'Unknown',
        text: clean,
        sentAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimistic]);

      const { error } = await supabase.from('group_call_messages').insert({
        id,
        room_id: roomId,
        user_id: userId,
        from_name: optimistic.fromName,
        text: clean,
      });

      if (error) {
        setMessages((prev) => prev.filter((m) => m.id !== id));
        toast({ title: 'Message failed', description: error.message, variant: 'destructive' });
        return;
      }

      // realtime will also deliver; we dedupe by id
    },
    [roomId, userId, toast]
  );

  const createPeerConnection = useCallback(
    async (participantId: string, participantName: string) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);

      if (localStream) {
        localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
      }

      pc.ontrack = (event) => {
        setParticipants((prev) => {
          const updated = new Map(prev);
          const existing = updated.get(participantId);
          if (existing) {
            updated.set(participantId, { ...existing, stream: event.streams[0] });
          }
          return updated;
        });
      };

      pc.onicecandidate = (event) => {
        if (!event.candidate || !roomId || !userId) return;
        sendSignal({
          type: 'ice-candidate',
          from: userId,
          to: participantId,
          roomId,
          data: event.candidate,
        });
      };

      peerConnections.current.set(participantId, pc);

      setParticipants((prev) => {
        const updated = new Map(prev);
        updated.set(participantId, {
          userId: participantId,
          userName: participantName,
          stream: null,
          peerConnection: pc,
          isScreenSharing: false,
        });
        return updated;
      });

      return pc;
    },
    [localStream, roomId, userId, sendSignal]
  );

  const setupLocalStream = useCallback(
    async (isVideo: boolean) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideo });
        setLocalStream(stream);
        setIsVideoEnabled(isVideo);
        return stream;
      } catch (error) {
        console.error('Error accessing media devices:', error);
        toast({
          title: 'Media access failed',
          description: 'Could not access camera/microphone',
          variant: 'destructive',
        });
        throw error;
      }
    },
    [toast]
  );

  const attachChannelHandlers = useCallback(
    (channel: ReturnType<typeof supabase.channel>, targetRoomId: string) => {
      channel
        .on('broadcast', { event: 'group-call-signal' }, async ({ payload }) => {
          await handleSignal(payload as GroupCallSignal);
        })
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'group_call_messages',
          filter: `room_id=eq.${targetRoomId}`,
        }, (payload) => {
          const row: any = (payload as any).new;
          if (!row?.id) return;

          const msg = toChatMessage(row);
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        });
    },
    []
  );

  const createRoom = useCallback(
    async (roomName: string, isVideo: boolean): Promise<string> => {
      if (!userId) throw new Error('Not authenticated');

      const newRoomId = `group-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

      await setupLocalStream(isVideo);
      setMessages([]);

      channelRef.current = supabase.channel(`group-call:${newRoomId}`);
      attachChannelHandlers(channelRef.current, newRoomId);
      channelRef.current.subscribe();

      await upsertMyParticipation(newRoomId);
      await loadChatHistory(newRoomId);

      setRoomId(newRoomId);
      setIsInCall(true);
      startDurationTimer();

      toast({ title: 'Room created', description: `Room ID: ${newRoomId.slice(0, 15)}...` });

      return newRoomId;
    },
    [userId, setupLocalStream, startDurationTimer, toast, attachChannelHandlers, upsertMyParticipation, loadChatHistory]
  );

  const joinRoom = useCallback(
    async (targetRoomId: string, isVideo: boolean) => {
      if (!userId) throw new Error('Not authenticated');

      await setupLocalStream(isVideo);
      setMessages([]);

      channelRef.current = supabase.channel(`group-call:${targetRoomId}`);
      attachChannelHandlers(channelRef.current, targetRoomId);

      channelRef.current.subscribe(async (status) => {
        if (status !== 'SUBSCRIBED') return;

        await upsertMyParticipation(targetRoomId);
        await loadChatHistory(targetRoomId);

        sendSignal({
          type: 'join-room',
          from: userId,
          fromName: userNameRef.current,
          roomId: targetRoomId,
        });
      });

      setRoomId(targetRoomId);
      setIsInCall(true);
      startDurationTimer();

      toast({ title: 'Joined room', description: 'Connected to group call' });
    },
    [userId, setupLocalStream, sendSignal, startDurationTimer, toast, attachChannelHandlers, upsertMyParticipation, loadChatHistory]
  );

  const handleSignal = useCallback(
    async (signal: GroupCallSignal) => {
      if (!userId || signal.from === userId) return;

      switch (signal.type) {
        case 'join-room': {
          const pc = await createPeerConnection(signal.from, signal.fromName || 'Unknown');
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          sendSignal({
            type: 'offer',
            from: userId,
            fromName: userNameRef.current,
            to: signal.from,
            roomId: signal.roomId,
            data: offer,
          });

          // Let the newcomer know whether we're currently sharing.
          if (roomId && isScreenSharing) {
            sendSignal({
              type: 'screen-status',
              from: userId,
              fromName: userNameRef.current,
              to: signal.from,
              roomId: signal.roomId,
              data: { isSharing: true },
            });
          }

          toast({
            title: 'Participant joined',
            description: `${signal.fromName || 'Someone'} joined the call`,
          });
          break;
        }

        case 'offer': {
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
            data: answer,
          });
          break;
        }

        case 'answer': {
          if (signal.to !== userId) return;
          const existingPc = peerConnections.current.get(signal.from);
          if (existingPc) {
            await existingPc.setRemoteDescription(new RTCSessionDescription(signal.data));
          }
          break;
        }

        case 'ice-candidate': {
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
        }

        case 'screen-status': {
          if (signal.to !== userId) return;
          const sharing = Boolean(signal.data?.isSharing);
          setParticipantScreenStatus(signal.from, sharing);
          break;
        }

        case 'leave-room': {
          const leavingPc = peerConnections.current.get(signal.from);
          if (leavingPc) {
            leavingPc.close();
            peerConnections.current.delete(signal.from);
          }
          setParticipants((prev) => {
            const updated = new Map(prev);
            updated.delete(signal.from);
            return updated;
          });

          toast({
            title: 'Participant left',
            description: `${signal.fromName || 'Someone'} left the call`,
          });
          break;
        }
      }
    },
    [
      userId,
      createPeerConnection,
      sendSignal,
      toast,
      roomId,
      isScreenSharing,
      setParticipantScreenStatus,
    ]
  );

  const leaveRoom = useCallback(() => {
    const currentRoomId = roomId;

    if (currentRoomId && userId) {
      sendSignal({ type: 'leave-room', from: userId, fromName: userNameRef.current, roomId: currentRoomId });
      removeMyParticipation(currentRoomId);
    }

    localStream?.getTracks().forEach((track) => track.stop());
    screenStream?.getTracks().forEach((track) => track.stop());

    peerConnections.current.forEach((pc) => pc.close());
    peerConnections.current.clear();

    channelRef.current?.unsubscribe();
    channelRef.current = null;

    setLocalStream(null);
    setScreenStream(null);
    setParticipants(new Map());
    setMessages([]);
    setIsInCall(false);
    setIsScreenSharing(false);
    setRoomId(null);
    setCallDuration(0);
    stopDurationTimer();

    toast({
      title: 'Left call',
      description: `Duration: ${Math.floor(callDuration / 60)}:${(callDuration % 60).toString().padStart(2, '0')}`,
    });
  }, [roomId, userId, localStream, screenStream, callDuration, sendSignal, stopDurationTimer, toast, removeMyParticipation]);

  const toggleMute = useCallback(() => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = isMuted;
    });
    setIsMuted(!isMuted);
  }, [localStream, isMuted]);

  const toggleVideo = useCallback(() => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach((track) => {
      track.enabled = !isVideoEnabled;
    });
    setIsVideoEnabled(!isVideoEnabled);
  }, [localStream, isVideoEnabled]);

  const toggleScreenShare = useCallback(async () => {
    if (!userId || !roomId) return;

    try {
      if (isScreenSharing) {
        screenStream?.getTracks().forEach((track) => track.stop());
        setScreenStream(null);
        setIsScreenSharing(false);

        // Replace screen track with camera track for all peers
        if (localStream) {
          const videoTrack = localStream.getVideoTracks()[0];
          peerConnections.current.forEach((pc) => {
            const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
            if (sender && videoTrack) sender.replaceTrack(videoTrack);
          });
        }

        // Notify others
        sendSignal({
          type: 'screen-status',
          from: userId,
          fromName: userNameRef.current,
          roomId,
          data: { isSharing: false },
        });

        toast({ title: 'Screen sharing stopped' });
      } else {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' } as MediaTrackConstraints,
          audio: false,
        });

        setScreenStream(stream);
        setIsScreenSharing(true);

        const screenTrack = stream.getVideoTracks()[0];

        // Replace video track with screen track for all peers
        peerConnections.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        });

        // Notify others
        sendSignal({
          type: 'screen-status',
          from: userId,
          fromName: userNameRef.current,
          roomId,
          data: { isSharing: true },
        });

        screenTrack.onended = () => {
          toggleScreenShare();
        };

        toast({ title: 'Screen sharing started' });
      }
    } catch (error) {
      if ((error as Error).name !== 'NotAllowedError') {
        toast({ title: 'Screen sharing failed', variant: 'destructive' });
      }
    }
  }, [isScreenSharing, screenStream, localStream, toast, userId, roomId, sendSignal]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveRoom();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep our own participant screen status mirrored in local state map (so UI can show indicator consistently)
  useEffect(() => {
    if (!userId) return;
    setParticipants((prev) => {
      if (!prev.has(userId)) return prev;
      const next = new Map(prev);
      const me = next.get(userId)!;
      next.set(userId, { ...me, isScreenSharing });
      return next;
    });
  }, [isScreenSharing, userId]);

  return {
    localStream,
    screenStream,
    participants,
    messages,
    sendChatMessage,
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
    toggleScreenShare,
  };
};
