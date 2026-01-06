import React, { useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Volume2, VolumeX, Monitor, MonitorOff } from 'lucide-react';

interface ActiveCallProps {
  contactName: string;
  isVideoCall: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  screenStream: MediaStream | null;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  callDuration: number;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onEndCall: () => void;
}

export const ActiveCall: React.FC<ActiveCallProps> = ({
  contactName,
  isVideoCall,
  localStream,
  remoteStream,
  screenStream,
  isMuted,
  isVideoEnabled,
  isScreenSharing,
  callDuration,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onEndCall
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const [isSpeakerOn, setIsSpeakerOn] = React.useState(true);

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

  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl glass border-white/20">
        <CardContent className="p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <Avatar className="w-20 h-20 mx-auto mb-4">
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-white text-2xl">
                {contactName[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-2xl font-bold">{contactName}</h2>
            <p className="text-muted-foreground text-lg">{formatDuration(callDuration)}</p>
          </div>

          {/* Video containers */}
          {isVideoCall && (
            <div className="space-y-4 mb-6">
              {/* Screen share preview */}
              {isScreenSharing && screenStream && (
                <div className="relative bg-muted/20 rounded-xl overflow-hidden aspect-video border-2 border-primary">
                  <video
                    ref={screenVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute bottom-2 left-2 bg-primary px-2 py-1 rounded text-xs text-primary-foreground flex items-center gap-1">
                    <Monitor className="w-3 h-3" />
                    Screen Share
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Local video (small) */}
                <div className="relative bg-muted/20 rounded-xl overflow-hidden aspect-video">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className={`w-full h-full object-cover ${!isVideoEnabled || isScreenSharing ? 'hidden' : ''}`}
                  />
                  {(!isVideoEnabled || isScreenSharing) && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      {isScreenSharing ? (
                        <Monitor className="w-12 h-12 text-primary" />
                      ) : (
                        <VideoOff className="w-12 h-12 text-muted-foreground" />
                      )}
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-xs text-white">
                    You
                  </div>
                </div>

                {/* Remote video (large) */}
                <div className="relative bg-muted/20 rounded-xl overflow-hidden aspect-video">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  {!remoteStream && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <Avatar className="w-16 h-16 mx-auto mb-2">
                          <AvatarFallback className="bg-muted text-muted-foreground text-xl">
                            {contactName[0]?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <p className="text-sm text-muted-foreground">Connecting...</p>
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-xs text-white">
                    {contactName}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Voice call visualization */}
          {!isVideoCall && (
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse" />
                <Avatar className="w-32 h-32 relative">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-white text-4xl">
                    {contactName[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex justify-center gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={onToggleMute}
              className={`rounded-full w-14 h-14 p-0 ${isMuted ? 'bg-destructive/20 border-destructive' : ''}`}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </Button>

            {isVideoCall && (
              <>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={onToggleVideo}
                  className={`rounded-full w-14 h-14 p-0 ${!isVideoEnabled ? 'bg-destructive/20 border-destructive' : ''}`}
                >
                  {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  onClick={onToggleScreenShare}
                  className={`rounded-full w-14 h-14 p-0 ${isScreenSharing ? 'bg-primary/20 border-primary' : ''}`}
                >
                  {isScreenSharing ? <MonitorOff className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
                </Button>
              </>
            )}

            <Button
              variant="outline"
              size="lg"
              onClick={() => setIsSpeakerOn(!isSpeakerOn)}
              className={`rounded-full w-14 h-14 p-0 ${isSpeakerOn ? 'bg-primary/20 border-primary' : ''}`}
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
