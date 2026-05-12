import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { createIceServers } from '@/lib/webrtc';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Share2, 
  MessageCircle, 
  Phone
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface EnhancedCallUIProps {
  contactName: string;
  contactAvatar?: string;
  contactId: string;
  currentUserId: string;
  onEndCall: () => void;
}

const STUN_SERVERS = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
  'stun:stun2.l.google.com:19302',
  'stun:stun3.l.google.com:19302',
  'stun:stun4.l.google.com:19302',
];

export const EnhancedCallUI: React.FC<EnhancedCallUIProps> = ({
  contactName,
  contactAvatar,
  contactId,
  currentUserId,
  onEndCall,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [chatMessages, setChatMessages] = useState<Array<{id: string; sender: string; text: string}>>([]);
  const [chatInput, setChatInput] = useState('');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const signalChannelRef = useRef<RealtimeChannel | null>(null);
  const chatChannelRef = useRef<RealtimeChannel | null>(null);

  const setupPeerConnection = useCallback(async (localStream: MediaStream) => {
    try {
      const peerConnection = new RTCPeerConnection(createIceServers());

      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });

      peerConnection.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      peerConnection.onicecandidate = async (event) => {
        if (!event.candidate || !signalChannelRef.current) return;
        await signalChannelRef.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            candidate: event.candidate,
            from: currentUserId,
            to: contactId,
          },
        });
      };

      peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected') {
          toast({
            title: 'Connection Lost',
            description: 'Call connection was interrupted.',
            variant: 'destructive',
          });
        }
      };

      peerConnectionRef.current = peerConnection;

      signalChannelRef.current = supabase.channel(`call:${currentUserId}:${contactId}`);
      signalChannelRef.current.on('broadcast', { event: 'sdp' }, async ({ payload }) => {
        if (payload?.from !== contactId || !payload?.sdp) return;

        if (payload.sdp.type === 'offer') {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          await signalChannelRef.current?.send({
            type: 'broadcast',
            event: 'sdp',
            payload: {
              sdp: answer,
              from: currentUserId,
              to: contactId,
            },
          });
        } else if (payload.sdp.type === 'answer') {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        }
      });

      signalChannelRef.current.on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (payload?.from !== contactId || !payload?.candidate) return;
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch (err) {
          console.error('Failed to add ICE candidate:', err);
        }
      });

      await signalChannelRef.current.subscribe();

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      await signalChannelRef.current.send({
        type: 'broadcast',
        event: 'sdp',
        payload: {
          sdp: offer,
          from: currentUserId,
          to: contactId,
        },
      });

      chatChannelRef.current = supabase.channel(`chat:${currentUserId}:${contactId}`);
      chatChannelRef.current.on('broadcast', { event: 'message' }, ({ payload }) => {
        if (!payload?.text || payload.sender === currentUserId) return;
        setChatMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            sender: payload.sender,
            text: payload.text,
          },
        ]);
      });
      await chatChannelRef.current.subscribe();
    } catch (err) {
      console.error('Failed to setup peer connection:', err);
      toast({
        title: 'Call Setup Failed',
        description: 'Could not initialize the call.',
        variant: 'destructive',
      });
    }
  }, [contactId, currentUserId]);

  // Initialize local stream
  useEffect(() => {
    const initializeLocalStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          },
        });

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        await setupPeerConnection(stream);
      } catch (err) {
        console.error('Failed to get local stream:', err);
        toast({
          title: "Camera/Mic Access Denied",
          description: "Please allow camera and microphone access to make calls.",
          variant: "destructive"
        });
      }
    };

    initializeLocalStream();
    
    // Start call duration timer
    durationIntervalRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    return () => {
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      peerConnectionRef.current?.close();
      if (signalChannelRef.current) supabase.removeChannel(signalChannelRef.current);
      if (chatChannelRef.current) supabase.removeChannel(chatChannelRef.current);
    };
  }, [setupPeerConnection]);

  // Toggle audio
  const handleToggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  // Toggle video
  const handleToggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOn(!isVideoOn);
    }
  }, [isVideoOn]);

  // Screen sharing
  const handleToggleScreenShare = useCallback(async () => {
    try {
      if (isScreenSharing && screenStreamRef.current) {
        // Stop screen sharing
        screenStreamRef.current.getTracks().forEach(track => track.stop());
        
        // Restore video
        if (localStreamRef.current) {
          const videoTrack = localStreamRef.current.getVideoTracks()[0];
          const sender = peerConnectionRef.current?.getSenders().find(s => s.track?.kind === 'video');
          if (sender && videoTrack) {
            await sender.replaceTrack(videoTrack);
          }
        }
        
        setIsScreenSharing(false);
      } else {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });

        screenStreamRef.current = screenStream;
        
        const screenTrack = screenStream.getVideoTracks()[0];
        const sender = peerConnectionRef.current?.getSenders().find(s => s.track?.kind === 'video');
        
        if (sender) {
          await sender.replaceTrack(screenTrack);
          
          // Handle screen stop
          screenTrack.onended = async () => {
            const videoTrack = localStreamRef.current?.getVideoTracks()[0];
            if (sender && videoTrack) {
              await sender.replaceTrack(videoTrack);
            }
            setIsScreenSharing(false);
          };
        }
        
        setIsScreenSharing(true);
      }
    } catch (err) {
      console.error('Screen sharing error:', err);
      toast({
        title: "Screen Share Failed",
        description: "Could not share your screen.",
        variant: "destructive"
      });
    }
  }, [isScreenSharing]);

  // Send chat message
  const handleSendMessage = useCallback(async () => {
    if (!chatInput.trim() || !chatChannelRef.current) return;

    const message = {
      id: crypto.randomUUID(),
      sender: currentUserId,
      text: chatInput,
    };

    setChatMessages(prev => [...prev, message]);
    
    await chatChannelRef.current.send({
      type: 'broadcast',
      event: 'message',
      payload: {
        sender: currentUserId,
        text: chatInput,
      },
    });

    setChatInput('');
  }, [chatInput, currentUserId]);

  // Format call duration
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      {/* Video Area */}
      <div className="relative flex-1 overflow-hidden bg-black/90">
        {/* Remote video (main) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="h-full w-full object-cover"
        />

        {/* Local video (picture-in-picture) */}
        <div className="absolute bottom-4 right-4 h-32 w-32 overflow-hidden rounded-xl border-2 border-white/20 shadow-lg">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />
        </div>

        {/* Header */}
        <div className="absolute left-0 right-0 top-0 bg-gradient-to-b from-black/60 to-transparent px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={contactAvatar} />
                <AvatarFallback>{contactName[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{contactName}</p>
                <p className="text-sm text-white/70">{formatDuration(callDuration)}</p>
              </div>
            </div>
            <button 
              onClick={() => setShowChat(!showChat)}
              className="rounded-full bg-white/10 p-2 backdrop-blur hover:bg-white/20"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Chat Panel */}
      {showChat && (
        <div className="h-64 border-t border-white/10 bg-black/80 backdrop-blur flex flex-col">
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {chatMessages.map(msg => (
              <div key={msg.id} className={`text-sm ${msg.sender === currentUserId ? 'text-right' : ''}`}>
                <div className={`inline-block rounded-lg px-3 py-1 ${
                  msg.sender === currentUserId 
                    ? 'bg-lovers-primary/30 text-white' 
                    : 'bg-white/10 text-white/80'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 p-2 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type message..."
              className="flex-1 bg-white/10 rounded px-3 py-1 text-sm outline-none"
            />
            <button
              onClick={handleSendMessage}
              className="bg-lovers-primary/50 hover:bg-lovers-primary/70 px-3 py-1 rounded text-sm"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="border-t border-white/10 bg-black/80 backdrop-blur px-4 py-4">
        <div className="flex items-center justify-center gap-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleToggleAudio}
            className={`rounded-full p-3 ${
              isMuted 
                ? 'bg-red-500/30 hover:bg-red-500/50' 
                : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleToggleVideo}
            className={`rounded-full p-3 ${
              isVideoOn 
                ? 'bg-white/10 hover:bg-white/20' 
                : 'bg-red-500/30 hover:bg-red-500/50'
            }`}
          >
            {isVideoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleToggleScreenShare}
            className={`rounded-full p-3 ${
              isScreenSharing 
                ? 'bg-blue-500/30 hover:bg-blue-500/50' 
                : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            <Share2 className="w-6 h-6" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onEndCall}
            className="rounded-full bg-red-500 hover:bg-red-600 p-3"
          >
            <Phone className="w-6 h-6" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
