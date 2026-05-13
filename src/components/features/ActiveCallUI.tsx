import React, { useRef, useEffect, useState } from 'react';
import { useCall } from '@/contexts/CallContext';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';

export const ActiveCallUI: React.FC = () => {
  const { call, endCall, localStream, remoteStream } = useCall();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (!call || call.status !== 'active') {
    return null;
  }

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
        setIsMuted(!track.enabled);
      });
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
        setIsVideoOff(!track.enabled);
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-40 flex flex-col">
      <div className="relative flex-1">
        <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        <video ref={localVideoRef} autoPlay playsInline muted className="absolute top-4 right-4 w-48 h-36 object-cover rounded-lg border-2 border-white" />
      </div>
      <div className="bg-gray-900 bg-opacity-50 p-4 flex justify-center items-center gap-4">
        <Button variant="ghost" size="icon" onClick={toggleMute} className="rounded-full bg-white/20 hover:bg-white/30 w-16 h-16">
          {isMuted ? <MicOff className="w-8 h-8 text-white" /> : <Mic className="w-8 h-8 text-white" />}
        </Button>
        <Button variant="destructive" size="icon" onClick={endCall} className="rounded-full w-20 h-20">
          <PhoneOff className="w-10 h-10" />
        </Button>
        <Button variant="ghost" size="icon" onClick={toggleVideo} className="rounded-full bg-white/20 hover:bg-white/30 w-16 h-16">
          {isVideoOff ? <VideoOff className="w-8 h-8 text-white" /> : <Video className="w-8 h-8 text-white" />}
        </Button>
      </div>
    </div>
  );
};
