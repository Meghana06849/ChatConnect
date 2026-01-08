import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, MonitorOff, Users, Copy, Check, Loader2 } from 'lucide-react';
import { useGroupCall } from '@/hooks/useGroupCall';
import { useToast } from '@/hooks/use-toast';

interface GroupCallProps {
  userId: string | null;
  onClose?: () => void;
}

const StreamVideo: React.FC<{ stream: MediaStream | null; muted?: boolean; className?: string; objectFit?: 'cover' | 'contain' }> = ({
  stream,
  muted,
  className,
  objectFit = 'cover',
}) => {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);

  return (
    <video
      ref={ref}
      autoPlay
      muted={muted}
      playsInline
      className={`${className || ''} ${objectFit === 'contain' ? 'object-contain' : 'object-cover'}`}
    />
  );
};

export const GroupCall: React.FC<GroupCallProps> = ({ userId, onClose }) => {
  const {
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
  } = useGroupCall(userId);

  const [joinRoomId, setJoinRoomId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [copied, setCopied] = useState(false);
  const [chatText, setChatText] = useState('');
  const [focusMode, setFocusMode] = useState<'shared' | 'grid'>('shared');

  const localTileRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isInCall]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCreateRoom = async (isVideo: boolean) => {
    setIsCreating(true);
    try {
      await createRoom('Group Call', isVideo);
    } catch (error) {
      console.error('Error creating room:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async (isVideo: boolean) => {
    if (!joinRoomId.trim()) {
      toast({ title: 'Room ID required', description: 'Please enter a room ID to join', variant: 'destructive' });
      return;
    }

    setIsJoining(true);
    try {
      await joinRoom(joinRoomId.trim(), isVideo);
    } catch (error) {
      console.error('Error joining room:', error);
    } finally {
      setIsJoining(false);
    }
  };

  const copyRoomId = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    toast({ title: 'Room ID copied!' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = () => {
    leaveRoom();
    onClose?.();
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = chatText.trim();
    if (!text) return;
    await sendChatMessage(text);
    setChatText('');
  };

  const participantsArray = useMemo(() => Array.from(participants.values()), [participants]);

  const activeSharer = useMemo(() => {
    if (isScreenSharing && screenStream) {
      return { type: 'local' as const, label: 'You', stream: screenStream };
    }
    const remote = participantsArray.find((p) => p.isScreenSharing);
    if (remote?.stream) {
      return { type: 'remote' as const, label: remote.userName || 'Unknown', stream: remote.stream };
    }
    return null;
  }, [isScreenSharing, screenStream, participantsArray]);

  useEffect(() => {
    if (!activeSharer) {
      setFocusMode('grid');
    } else {
      setFocusMode('shared');
    }
  }, [activeSharer]);

  // Not in a call - show join/create UI
  if (!isInCall) {
    return (
      <Card className="glass border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Group Video Call
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <h3 className="font-medium">Create New Room</h3>
            <div className="flex gap-2">
              <Button onClick={() => handleCreateRoom(true)} disabled={isCreating} className="flex-1">
                {isCreating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Video className="w-4 h-4 mr-2" />}
                Video Call
              </Button>
              <Button variant="outline" onClick={() => handleCreateRoom(false)} disabled={isCreating} className="flex-1">
                <Mic className="w-4 h-4 mr-2" />
                Voice Call
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/20" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-medium">Join Existing Room</h3>
            <Input
              placeholder="Enter Room ID..."
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value)}
              className="glass border-white/20"
            />
            <div className="flex gap-2">
              <Button onClick={() => handleJoinRoom(true)} disabled={isJoining || !joinRoomId.trim()} className="flex-1">
                {isJoining ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Video className="w-4 h-4 mr-2" />}
                Join with Video
              </Button>
              <Button variant="outline" onClick={() => handleJoinRoom(false)} disabled={isJoining || !joinRoomId.trim()} className="flex-1">
                <Mic className="w-4 h-4 mr-2" />
                Voice Only
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-primary" />
          <div>
            <h2 className="font-semibold">Group Call</h2>
            <p className="text-sm text-muted-foreground">{formatDuration(callDuration)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Users className="w-3 h-3" />
            {participants.size + 1} participants
          </Badge>

          {activeSharer && (
            <Badge variant="secondary" className="gap-1">
              <Monitor className="w-3 h-3" />
              {activeSharer.label} is sharing
            </Badge>
          )}

          {activeSharer && (
            <Button variant="outline" size="sm" onClick={() => setFocusMode((p) => (p === 'shared' ? 'grid' : 'shared'))}>
              {focusMode === 'shared' ? 'Show Grid' : 'Focus Share'}
            </Button>
          )}

          {roomId && (
            <Button variant="outline" size="sm" onClick={copyRoomId} className="gap-1">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy ID'}
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 p-4 overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
          <div className="h-full overflow-auto">
            {/* Focused shared view */}
            {activeSharer && focusMode === 'shared' && (
              <div className="mb-4 relative bg-muted/20 rounded-xl overflow-hidden aspect-video max-h-[45vh] border-2 border-primary">
                <StreamVideo stream={activeSharer.stream} muted={activeSharer.type === 'local'} className="w-full h-full" objectFit="contain" />
                <div className="absolute bottom-2 left-2 bg-primary px-2 py-1 rounded text-xs text-primary-foreground flex items-center gap-1">
                  <Monitor className="w-3 h-3" />
                  {activeSharer.label}
                </div>
              </div>
            )}

            <div
              className={`grid gap-4 ${
                participants.size === 0
                  ? 'grid-cols-1 max-w-md mx-auto'
                  : participants.size === 1
                    ? 'grid-cols-2'
                    : participants.size <= 3
                      ? 'grid-cols-2'
                      : 'grid-cols-3'
              }`}
            >
              {/* Local tile */}
              <div ref={localTileRef} className="relative bg-muted/20 rounded-xl overflow-hidden aspect-video">
                {isVideoEnabled ? (
                  <StreamVideo stream={localStream} muted className="w-full h-full" objectFit="cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Avatar className="w-20 h-20">
                      <AvatarFallback className="bg-primary text-primary-foreground text-2xl">You</AvatarFallback>
                    </Avatar>
                  </div>
                )}

                <div className="absolute bottom-2 left-2 bg-muted/70 px-2 py-1 rounded text-xs text-foreground flex items-center gap-1">
                  You {isMuted && <MicOff className="w-3 h-3 text-destructive" />}
                </div>

                {isScreenSharing && (
                  <div className="absolute top-2 right-2 bg-primary px-2 py-1 rounded text-xs text-primary-foreground flex items-center gap-1">
                    <Monitor className="w-3 h-3" />
                    Sharing
                  </div>
                )}
              </div>

              {/* Remote tiles */}
              {participantsArray.map((participant) => (
                <ParticipantVideo key={participant.userId} participant={participant} />
              ))}
            </div>
          </div>

          <Card className="glass border-white/20 h-full flex flex-col overflow-hidden">
            <CardHeader className="py-3">
              <CardTitle className="text-base">Call Chat</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden">
              <div className="flex-1 overflow-auto rounded-lg bg-muted/10 p-3 space-y-2">
                {messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No messages yet.</p>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className="text-sm">
                      <span className="font-medium">{m.fromName}: </span>
                      <span className="text-foreground/90">{m.text}</span>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleSendChat} className="flex gap-2">
                <Input
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  placeholder="Message the call..."
                  className="glass border-white/20"
                />
                <Button type="submit" disabled={!chatText.trim()}>
                  Send
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="p-4 border-t border-white/10">
        <div className="flex justify-center gap-3">
          <Button
            variant="outline"
            size="lg"
            onClick={toggleMute}
            className={`rounded-full w-14 h-14 p-0 ${isMuted ? 'bg-destructive/20 border-destructive' : ''}`}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={toggleVideo}
            className={`rounded-full w-14 h-14 p-0 ${!isVideoEnabled ? 'bg-destructive/20 border-destructive' : ''}`}
          >
            {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={toggleScreenShare}
            className={`rounded-full w-14 h-14 p-0 ${isScreenSharing ? 'bg-primary/20 border-primary' : ''}`}
          >
            {isScreenSharing ? <MonitorOff className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
          </Button>

          <Button variant="destructive" size="lg" onClick={handleLeave} className="rounded-full w-14 h-14 p-0">
            <PhoneOff className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const ParticipantVideo: React.FC<{ participant: any }> = ({ participant }) => {
  return (
    <div className="relative bg-muted/20 rounded-xl overflow-hidden aspect-video">
      {participant.stream ? (
        <StreamVideo stream={participant.stream} className="w-full h-full" objectFit={participant.isScreenSharing ? 'contain' : 'cover'} />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Avatar className="w-20 h-20">
            <AvatarFallback className="bg-secondary text-secondary-foreground text-2xl">
              {participant.userName?.[0]?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      <div className="absolute bottom-2 left-2 bg-muted/70 px-2 py-1 rounded text-xs text-foreground flex items-center gap-1">
        {participant.userName || 'Unknown'}
      </div>

      {participant.isScreenSharing && (
        <div className="absolute top-2 right-2 bg-primary px-2 py-1 rounded text-xs text-primary-foreground flex items-center gap-1">
          <Monitor className="w-3 h-3" />
          Sharing
        </div>
      )}
    </div>
  );
};
