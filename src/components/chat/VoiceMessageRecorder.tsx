import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Send, Trash2, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceMessageRecorderProps {
  onSend: (audioBlob: Blob, duration: number) => void;
  onCancel: () => void;
  isLoversMode?: boolean;
}

export const VoiceMessageRecorder: React.FC<VoiceMessageRecorderProps> = ({
  onSend,
  onCancel,
  isLoversMode = false
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout>();
  const animationRef = useRef<number>();

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Set up audio context for visualization
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      
      // Set up media recorder
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start(100);
      setIsRecording(true);
      setDuration(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
      
      // Start waveform visualization
      visualize();
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  }, []);

  // Visualize waveform
  const visualize = useCallback(() => {
    if (!analyserRef.current) return;
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      if (!isRecording) return;
      
      analyserRef.current?.getByteFrequencyData(dataArray);
      
      // Sample some frequency bands for waveform
      const samples = 20;
      const step = Math.floor(bufferLength / samples);
      const newData: number[] = [];
      
      for (let i = 0; i < samples; i++) {
        const value = dataArray[i * step] / 255;
        newData.push(value);
      }
      
      setWaveformData(prev => {
        const updated = [...prev, ...newData].slice(-60);
        return updated;
      });
      
      animationRef.current = requestAnimationFrame(draw);
    };
    
    draw();
  }, [isRecording]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    }
  }, [isRecording]);

  // Play/pause recorded audio
  const togglePlayback = useCallback(() => {
    if (!audioRef.current || !audioUrl) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, audioUrl]);

  // Handle audio end
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onended = () => setIsPlaying(false);
    }
  }, [audioUrl]);

  // Send voice message
  const handleSend = () => {
    if (audioBlob) {
      onSend(audioBlob, duration);
      cleanup();
    }
  };

  // Cancel and cleanup
  const handleCancel = () => {
    stopRecording();
    cleanup();
    onCancel();
  };

  const cleanup = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setWaveformData([]);
    setIsPlaying(false);
  };

  // Format duration as mm:ss
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [audioUrl]);

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-2xl glass border",
      isLoversMode ? "border-lovers-primary/30" : "border-general-primary/30"
    )}>
      {/* Hidden audio element for playback */}
      {audioUrl && <audio ref={audioRef} src={audioUrl} />}
      
      {/* Recording/Playback controls */}
      {!audioBlob ? (
        <>
          {/* Recording state */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            className="rounded-full hover:bg-destructive/20"
          >
            <Trash2 className="w-5 h-5 text-destructive" />
          </Button>
          
          <div className="flex-1 flex items-center gap-2">
            {/* Waveform visualization */}
            <div className="flex-1 h-10 flex items-center gap-0.5 overflow-hidden">
              {waveformData.map((value, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-1 rounded-full transition-all",
                    isLoversMode ? "bg-lovers-primary" : "bg-general-primary"
                  )}
                  style={{ 
                    height: `${Math.max(4, value * 40)}px`,
                    opacity: 0.5 + value * 0.5
                  }}
                />
              ))}
              {waveformData.length === 0 && (
                <div className="flex items-center gap-1">
                  {[...Array(20)].map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-1 h-2 rounded-full animate-pulse",
                        isLoversMode ? "bg-lovers-primary/50" : "bg-general-primary/50"
                      )}
                      style={{ animationDelay: `${i * 50}ms` }}
                    />
                  ))}
                </div>
              )}
            </div>
            
            {/* Duration */}
            <span className={cn(
              "text-sm font-mono min-w-[50px] text-right",
              isRecording && "text-destructive animate-pulse"
            )}>
              {formatDuration(duration)}
            </span>
          </div>
          
          {/* Stop button */}
          <Button
            onClick={stopRecording}
            className={cn(
              "rounded-full w-10 h-10 p-0",
              isLoversMode ? "bg-lovers-primary hover:bg-lovers-primary/90" : "bg-general-primary hover:bg-general-primary/90"
            )}
          >
            <Square className="w-4 h-4 fill-white" />
          </Button>
        </>
      ) : (
        <>
          {/* Playback state */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            className="rounded-full hover:bg-destructive/20"
          >
            <Trash2 className="w-5 h-5 text-destructive" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={togglePlayback}
            className="rounded-full"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5" />
            )}
          </Button>
          
          <div className="flex-1 flex items-center gap-2">
            {/* Static waveform for recorded audio */}
            <div className="flex-1 h-10 flex items-center gap-0.5">
              {waveformData.slice(-40).map((value, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-1 rounded-full",
                    isLoversMode ? "bg-lovers-primary" : "bg-general-primary"
                  )}
                  style={{ 
                    height: `${Math.max(4, value * 40)}px`,
                    opacity: 0.5 + value * 0.5
                  }}
                />
              ))}
            </div>
            
            <span className="text-sm font-mono min-w-[50px] text-right">
              {formatDuration(duration)}
            </span>
          </div>
          
          {/* Send button */}
          <Button
            onClick={handleSend}
            className={cn(
              "rounded-full w-10 h-10 p-0",
              isLoversMode ? "btn-lovers" : "btn-general"
            )}
          >
            <Send className="w-4 h-4" />
          </Button>
        </>
      )}
    </div>
  );
};
