import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Volume2, VolumeX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WebRTCCallProps {
  contactId: string;
  contactName: string;
  isVideoCall: boolean;
  onEndCall: () => void;
}

export const WebRTCCall: React.FC<WebRTCCallProps> = ({
  contactId,
  contactName,
  isVideoCall,
  onEndCall
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(isVideoCall);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [callStartTime] = useState(Date.now());
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    setupCall();
    const interval = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - callStartTime) / 1000));
    }, 1000);

    return () => {
      clearInterval(interval);
      cleanup();
    };
  }, []);

  const setupCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideoCall
      });

      localStreamRef.current = stream;
      if (localVideoRef.current && isVideoCall) {
        localVideoRef.current.srcObject = stream;
      }

      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      };

      peerConnectionRef.current = new RTCPeerConnection(configuration);

      stream.getTracks().forEach(track => {
        peerConnectionRef.current?.addTrack(track, stream);
      });

      peerConnectionRef.current.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Save call to history when starting
      await saveCallHistory('outgoing', 0);

    } catch (error) {
      console.error('Error setting up call:', error);
      toast({
        title: "Call setup failed",
        description: "Could not access camera/microphone",
        variant: "destructive"
      });
    }
  };

  const cleanup = async () => {
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    peerConnectionRef.current?.close();
    
    // Update call history with duration
    await saveCallHistory('completed', callDuration);
  };

  const saveCallHistory = async (status: string, duration: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('call_history').insert({
        caller_id: user.id,
        callee_id: contactId,
        call_type: isVideoCall ? 'video' : 'voice',
        duration_seconds: duration,
        status
      });
    } catch (error) {
      console.error('Error saving call history:', error);
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !isVideoEnabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl glass border-white/20">
        <CardContent className="p-8">
          <div className="text-center mb-6">
            <Avatar className="w-24 h-24 mx-auto mb-4">
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-3xl">
                {contactName[0]}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-2xl font-bold mb-2">{contactName}</h2>
            <p className="text-muted-foreground">{formatDuration(callDuration)}</p>
          </div>

          {isVideoCall && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="relative bg-black/20 rounded-xl overflow-hidden aspect-video">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-xs text-white">
                  You
                </div>
              </div>
              <div className="relative bg-black/20 rounded-xl overflow-hidden aspect-video">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-xs text-white">
                  {contactName}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-center gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={toggleMute}
              className={`rounded-full w-14 h-14 p-0 ${isMuted ? 'bg-destructive/20' : ''}`}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </Button>

            {isVideoCall && (
              <Button
                variant="outline"
                size="lg"
                onClick={toggleVideo}
                className={`rounded-full w-14 h-14 p-0 ${!isVideoEnabled ? 'bg-destructive/20' : ''}`}
              >
                {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
              </Button>
            )}

            <Button
              variant="outline"
              size="lg"
              onClick={() => setIsSpeakerOn(!isSpeakerOn)}
              className="rounded-full w-14 h-14 p-0"
            >
              {isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
            </Button>

            <Button
              variant="destructive"
              size="lg"
              onClick={onEndCall}
              className="rounded-full w-14 h-14 p-0"
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
