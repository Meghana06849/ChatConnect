import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Mic, 
  Square,
  Headphones,
  Waves,
  Send,
  Trash2,
  Play,
  Pause,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface VoiceChangeChatProps {
  onSendVoice?: (file: File) => void;
}

const voiceEffects = [
  { id: 'normal', name: 'Normal', icon: '👤', pitch: 1, speed: 1 },
  { id: 'deep', name: 'Deep', icon: '🦹‍♂️', pitch: 0.65, speed: 0.95 },
  { id: 'chipmunk', name: 'Chipmunk', icon: '🐿️', pitch: 1.8, speed: 1.1 },
  { id: 'robot', name: 'Robot', icon: '🤖', pitch: 0.85, speed: 1 },
  { id: 'echo', name: 'Echo', icon: '🔊', pitch: 1, speed: 1 },
  { id: 'slow', name: 'Slow-mo', icon: '🐢', pitch: 0.8, speed: 0.7 },
  { id: 'fast', name: 'Fast', icon: '⚡', pitch: 1.2, speed: 1.5 },
  { id: 'whisper', name: 'Whisper', icon: '🤫', pitch: 1.1, speed: 0.9 },
];

export const VoiceChangeChat: React.FC<VoiceChangeChatProps> = ({ onSendVoice }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('normal');
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const { toast } = useToast();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      setDuration(0);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        processAudio(blob);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch {
      toast({ title: 'Microphone access denied', variant: 'destructive' });
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const processAudio = useCallback(async (blob: Blob) => {
    const effect = voiceEffects.find(v => v.id === selectedVoice);
    if (!effect || selectedVoice === 'normal') {
      setRecordedBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      return;
    }

    try {
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      // Create offline context with adjusted speed
      const offlineCtx = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        Math.ceil(audioBuffer.length / effect.speed),
        audioBuffer.sampleRate
      );

      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = effect.speed;

      // Pitch shift via detune
      const pitchShift = Math.log2(effect.pitch) * 1200;
      source.detune.value = pitchShift;

      let lastNode: AudioNode = source;

      // Echo effect
      if (selectedVoice === 'echo') {
        const delay = offlineCtx.createDelay(1);
        delay.delayTime.value = 0.25;
        const feedback = offlineCtx.createGain();
        feedback.gain.value = 0.4;
        source.connect(delay);
        delay.connect(feedback);
        feedback.connect(delay);
        delay.connect(offlineCtx.destination);
      }

      // Whisper effect - reduce low frequencies
      if (selectedVoice === 'whisper') {
        const highpass = offlineCtx.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 800;
        const gain = offlineCtx.createGain();
        gain.gain.value = 0.5;
        lastNode.connect(highpass);
        highpass.connect(gain);
        lastNode = gain;
      }

      lastNode.connect(offlineCtx.destination);
      source.start();

      const renderedBuffer = await offlineCtx.startRendering();
      
      // Convert to WAV blob
      const wavBlob = audioBufferToWav(renderedBuffer);
      setRecordedBlob(wavBlob);
      setPreviewUrl(URL.createObjectURL(wavBlob));
      ctx.close();
    } catch (err) {
      console.error('Audio processing error:', err);
      // Fallback to original
      setRecordedBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
    }
  }, [selectedVoice]);

  const audioBufferToWav = (buffer: AudioBuffer): Blob => {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const data = new Float32Array(buffer.length * numChannels);
    
    for (let ch = 0; ch < numChannels; ch++) {
      const channelData = buffer.getChannelData(ch);
      for (let i = 0; i < buffer.length; i++) {
        data[i * numChannels + ch] = channelData[i];
      }
    }

    const dataLength = data.length * bytesPerSample;
    const headerLength = 44;
    const arrayBuffer = new ArrayBuffer(headerLength + dataLength);
    const view = new DataView(arrayBuffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);

    let offset = 44;
    for (let i = 0; i < data.length; i++) {
      const sample = Math.max(-1, Math.min(1, data[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  };

  const handlePreview = () => {
    if (!previewUrl) return;
    if (isPlaying && previewAudioRef.current) {
      previewAudioRef.current.pause();
      setIsPlaying(false);
      return;
    }
    const audio = new Audio(previewUrl);
    previewAudioRef.current = audio;
    audio.onended = () => setIsPlaying(false);
    audio.play();
    setIsPlaying(true);
  };

  const handleSend = () => {
    if (!recordedBlob || !onSendVoice) return;
    const ext = recordedBlob.type.includes('wav') ? 'wav' : 'webm';
    const file = new File([recordedBlob], `voice_${selectedVoice}_${Date.now()}.${ext}`, { type: recordedBlob.type });
    onSendVoice(file);
    toast({ title: '🎤 Voice sent!', description: `Sent with ${voiceEffects.find(v => v.id === selectedVoice)?.name} effect` });
    resetState();
  };

  const resetState = () => {
    setRecordedBlob(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setDuration(0);
    setIsPlaying(false);
  };

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="space-y-4">
      {/* Voice Effects Grid */}
      <div className="grid grid-cols-4 gap-2">
        {voiceEffects.map((effect) => (
          <button
            key={effect.id}
            onClick={() => setSelectedVoice(effect.id)}
            className={cn(
              "flex flex-col items-center gap-1 p-2.5 rounded-xl transition-all",
              selectedVoice === effect.id
                ? "bg-primary text-primary-foreground ring-2 ring-primary"
                : "bg-white/5 hover:bg-white/10"
            )}
          >
            <span className="text-xl">{effect.icon}</span>
            <span className="text-[10px] font-medium">{effect.name}</span>
          </button>
        ))}
      </div>

      {/* Recording / Preview */}
      <Card className="glass border-white/20">
        <CardContent className="p-6 text-center">
          {!recordedBlob ? (
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={cn(
                  "w-24 h-24 rounded-full border-4 flex items-center justify-center transition-all",
                  isRecording
                    ? "border-destructive bg-destructive/20 animate-pulse"
                    : "border-primary bg-primary/20 hover:scale-105"
                )}
              >
                {isRecording ? (
                  <Square className="w-8 h-8 text-destructive" />
                ) : (
                  <Mic className="w-8 h-8 text-primary" />
                )}
              </button>
              <div>
                <p className="font-medium">
                  {isRecording ? formatDuration(duration) : 'Tap to record'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isRecording ? 'Tap to stop' : `Will apply ${voiceEffects.find(v => v.id === selectedVoice)?.name} effect`}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" className="rounded-full" onClick={handlePreview}>
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <div className="text-left">
                  <p className="font-medium text-sm">{voiceEffects.find(v => v.id === selectedVoice)?.name} Voice</p>
                  <p className="text-xs text-muted-foreground">{formatDuration(duration)}</p>
                </div>
                <Badge variant="outline" className="ml-2">{voiceEffects.find(v => v.id === selectedVoice)?.icon}</Badge>
              </div>
              <div className="flex gap-2 w-full">
                <Button variant="outline" className="flex-1" onClick={resetState}>
                  <Trash2 className="w-4 h-4 mr-2" /> Discard
                </Button>
                {onSendVoice && (
                  <Button className="flex-1" onClick={handleSend}>
                    <Send className="w-4 h-4 mr-2" /> Send
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
