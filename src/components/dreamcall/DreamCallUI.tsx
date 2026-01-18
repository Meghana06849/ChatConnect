import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

interface DreamCallUIProps {
  contactName: string;
  contactAvatar?: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  callDuration: number;
  onToggleMute: () => void;
  onEndCall: () => void;
}

// Generate random stars for the background
const generateStars = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: Math.random() * 3 + 1,
    delay: Math.random() * 5,
    duration: Math.random() * 3 + 2,
  }));
};

export const DreamCallUI: React.FC<DreamCallUIProps> = ({
  contactName,
  contactAvatar,
  localStream,
  remoteStream,
  isMuted,
  callDuration,
  onToggleMute,
  onEndCall
}) => {
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isEnding, setIsEnding] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [partnerSpeaking, setPartnerSpeaking] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  
  const stars = useMemo(() => generateStars(50), []);

  // Analyze remote audio for voice activity visualization
  useEffect(() => {
    if (!remoteStream) return;

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    
    const source = audioContext.createMediaStreamSource(remoteStream);
    source.connect(analyser);
    
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    const checkAudioLevel = () => {
      if (analyserRef.current) {
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const normalized = Math.min(average / 128, 1);
        setAudioLevel(normalized);
        setPartnerSpeaking(normalized > 0.1);
      }
      requestAnimationFrame(checkAudioLevel);
    };
    
    checkAudioLevel();

    return () => {
      audioContext.close();
    };
  }, [remoteStream]);

  // Connect remote stream to audio element
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    setIsEnding(true);
    // Wait for particle animation before actually ending
    setTimeout(() => {
      onEndCall();
    }, 800);
  };

  const heartPulseIntensity = 0.3 + audioLevel * 0.7;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Hidden audio element for remote stream */}
      <audio ref={remoteAudioRef} autoPlay playsInline />
      
      {/* Midnight sky gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(270,60%,15%)] via-[hsl(250,50%,20%)] to-[hsl(220,60%,10%)]" />
      
      {/* Floating stars layer */}
      <div className="absolute inset-0 overflow-hidden">
        {stars.map((star) => (
          <div
            key={star.id}
            className={`absolute rounded-full bg-white dream-star ${partnerSpeaking ? 'dream-star-shimmer' : ''}`}
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animationDelay: `${star.delay}s`,
              animationDuration: `${star.duration}s`,
              opacity: isMuted ? 0.3 : 0.8,
            }}
          />
        ))}
      </div>
      
      {/* Moon */}
      <div 
        className={`absolute top-12 right-16 w-20 h-20 rounded-full dream-moon ${isMuted ? 'dream-moon-dim' : ''}`}
        style={{
          background: 'radial-gradient(circle at 30% 30%, hsl(45, 100%, 96%), hsl(45, 80%, 70%))',
          boxShadow: isMuted 
            ? '0 0 30px 10px hsla(45, 100%, 70%, 0.1)'
            : '0 0 60px 20px hsla(45, 100%, 70%, 0.3)',
        }}
      />
      
      {/* Main content */}
      <div className="relative h-full flex flex-col items-center justify-center px-6">
        {/* Dream Call title */}
        <div className="absolute top-8 left-0 right-0 text-center">
          <h1 className="text-2xl font-light tracking-widest text-white/90 dream-title">
            ✨ Dream Call ✨
          </h1>
          <p className="text-lg text-white/60 mt-2 font-light">
            {formatDuration(callDuration)}
          </p>
        </div>
        
        {/* Avatar connection area */}
        <div className={`relative flex items-center justify-center gap-16 ${isEnding ? 'dream-heart-collapse' : ''}`}>
          {/* Your avatar */}
          <div className="relative">
            <div 
              className="absolute inset-0 rounded-full bg-gradient-to-br from-pink-400/30 to-purple-500/30 blur-xl"
              style={{ transform: 'scale(1.4)' }}
            />
            <Avatar className="w-28 h-28 border-4 border-white/20 shadow-2xl relative z-10">
              <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-white text-3xl">
                You
              </AvatarFallback>
            </Avatar>
          </div>
          
          {/* Heart connection line */}
          <div className="relative flex items-center">
            {/* Glowing line left */}
            <div 
              className="h-1 w-16 rounded-full"
              style={{
                background: 'linear-gradient(90deg, transparent, hsl(320, 100%, 70%))',
                boxShadow: `0 0 ${10 + audioLevel * 20}px ${5 + audioLevel * 10}px hsla(320, 100%, 70%, ${0.3 + audioLevel * 0.4})`,
              }}
            />
            
            {/* Central heart */}
            <div 
              className={`relative mx-2 ${isEnding ? 'dream-heart-explode' : ''}`}
              style={{
                transform: `scale(${heartPulseIntensity})`,
                transition: 'transform 0.1s ease-out',
              }}
            >
              <Heart 
                className="w-12 h-12 text-pink-400 fill-pink-400 dream-heart-pulse"
                style={{
                  filter: `drop-shadow(0 0 ${15 + audioLevel * 30}px hsla(320, 100%, 70%, ${0.6 + audioLevel * 0.4}))`,
                }}
              />
              {/* Heart glow rings */}
              <div 
                className="absolute inset-0 -m-4 rounded-full dream-heart-ring"
                style={{
                  background: `radial-gradient(circle, hsla(320, 100%, 70%, ${0.1 + audioLevel * 0.2}) 0%, transparent 70%)`,
                }}
              />
            </div>
            
            {/* Glowing line right */}
            <div 
              className="h-1 w-16 rounded-full"
              style={{
                background: 'linear-gradient(90deg, hsl(320, 100%, 70%), transparent)',
                boxShadow: `0 0 ${10 + audioLevel * 20}px ${5 + audioLevel * 10}px hsla(320, 100%, 70%, ${0.3 + audioLevel * 0.4})`,
              }}
            />
          </div>
          
          {/* Partner avatar */}
          <div className="relative">
            <div 
              className="absolute inset-0 rounded-full bg-gradient-to-br from-pink-400/30 to-purple-500/30 blur-xl dream-partner-glow"
              style={{ 
                transform: `scale(${1.4 + audioLevel * 0.3})`,
                opacity: 0.5 + audioLevel * 0.5,
              }}
            />
            <Avatar className="w-28 h-28 border-4 border-white/20 shadow-2xl relative z-10">
              {contactAvatar && <AvatarImage src={contactAvatar} />}
              <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-500 text-white text-3xl">
                {contactName[0]?.toUpperCase() || '💕'}
              </AvatarFallback>
            </Avatar>
            {/* Speaking indicator */}
            {partnerSpeaking && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                <div className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                <div className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            )}
          </div>
        </div>
        
        {/* Partner name */}
        <p className="mt-8 text-2xl font-light text-white/90 tracking-wide">
          {contactName}
        </p>
        
        {/* Particle container for end call animation */}
        {isEnding && (
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="absolute left-1/2 top-1/2 w-2 h-2 bg-pink-400 rounded-full dream-particle"
                style={{
                  '--angle': `${(i / 20) * 360}deg`,
                  '--distance': `${100 + Math.random() * 100}px`,
                } as React.CSSProperties}
              />
            ))}
          </div>
        )}
        
        {/* Controls */}
        <div className="absolute bottom-16 left-0 right-0 flex justify-center gap-6">
          {/* Mute button with heart pulse animation */}
          <Button
            variant="ghost"
            size="lg"
            onClick={onToggleMute}
            className={`rounded-full w-16 h-16 backdrop-blur-sm border-2 transition-all duration-300 ${
              isMuted 
                ? 'bg-white/10 border-white/20' 
                : 'bg-pink-500/20 border-pink-400/50 dream-button-pulse'
            }`}
          >
            {isMuted ? (
              <MicOff className="w-7 h-7 text-white/60" />
            ) : (
              <Mic className="w-7 h-7 text-pink-300" />
            )}
          </Button>

          {/* Speaker button with ripple glow */}
          <Button
            variant="ghost"
            size="lg"
            onClick={() => setIsSpeakerOn(!isSpeakerOn)}
            className={`rounded-full w-16 h-16 backdrop-blur-sm border-2 transition-all duration-300 relative overflow-hidden ${
              isSpeakerOn 
                ? 'bg-purple-500/20 border-purple-400/50' 
                : 'bg-white/10 border-white/20'
            }`}
          >
            {isSpeakerOn && (
              <div className="absolute inset-0 dream-ripple-glow" />
            )}
            {isSpeakerOn ? (
              <Volume2 className="w-7 h-7 text-purple-300 relative z-10" />
            ) : (
              <VolumeX className="w-7 h-7 text-white/60 relative z-10" />
            )}
          </Button>

          {/* End call button */}
          <Button
            variant="ghost"
            size="lg"
            onClick={handleEndCall}
            disabled={isEnding}
            className="rounded-full w-16 h-16 bg-red-500/30 border-2 border-red-400/50 backdrop-blur-sm hover:bg-red-500/50 transition-all duration-300"
          >
            <Heart className="w-7 h-7 text-red-300 fill-red-300" />
          </Button>
        </div>
      </div>
    </div>
  );
};