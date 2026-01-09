import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceMessagePlayerProps {
  audioUrl: string;
  duration?: number;
  isOwnMessage?: boolean;
  isLoversMode?: boolean;
}

export const VoiceMessagePlayer: React.FC<VoiceMessagePlayerProps> = ({
  audioUrl,
  duration = 0,
  isOwnMessage = false,
  isLoversMode = false
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration);
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setAudioDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressRef.current) return;

    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const newTime = (clickX / width) * audioDuration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  // Generate fake waveform bars
  const waveformBars = Array.from({ length: 30 }, (_, i) => {
    const height = Math.sin(i * 0.5) * 0.3 + Math.random() * 0.4 + 0.3;
    return height;
  });

  return (
    <div className="flex items-center gap-3 min-w-[200px]">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      {/* Play/Pause button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={togglePlayback}
        className={cn(
          "rounded-full w-9 h-9 shrink-0",
          isOwnMessage 
            ? "hover:bg-white/20 text-white" 
            : "hover:bg-muted"
        )}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4" />
        )}
      </Button>

      {/* Waveform progress */}
      <div 
        ref={progressRef}
        onClick={handleProgressClick}
        className="flex-1 flex items-center gap-0.5 h-8 cursor-pointer"
      >
        {waveformBars.map((height, i) => {
          const barProgress = (i / waveformBars.length) * 100;
          const isPlayed = barProgress < progress;
          
          return (
            <div
              key={i}
              className={cn(
                "w-1 rounded-full transition-colors",
                isOwnMessage
                  ? isPlayed 
                    ? "bg-white" 
                    : "bg-white/40"
                  : isPlayed
                    ? isLoversMode ? "bg-lovers-primary" : "bg-general-primary"
                    : "bg-muted-foreground/30"
              )}
              style={{ height: `${height * 100}%` }}
            />
          );
        })}
      </div>

      {/* Duration */}
      <span className={cn(
        "text-xs font-mono min-w-[40px] text-right",
        isOwnMessage ? "text-white/70" : "text-muted-foreground"
      )}>
        {formatTime(isPlaying ? currentTime : audioDuration)}
      </span>
    </div>
  );
};
