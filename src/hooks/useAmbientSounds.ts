import { useEffect, useRef, useCallback, useState } from 'react';

type AmbientType = 'rain' | 'birds' | 'fireplace' | 'night';

const getAmbientType = (partnerOnline: boolean): AmbientType => {
  if (partnerOnline) return 'fireplace';
  const h = new Date().getHours();
  if (h >= 5 && h < 10) return 'birds';
  if (h >= 20 || h < 5) return 'rain';
  return 'night';
};

// Create colored noise using Web Audio API
const createNoiseBuffer = (ctx: AudioContext, duration: number, type: 'white' | 'pink' | 'brown'): AudioBuffer => {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    if (type === 'white') {
      data[i] = white * 0.1;
    } else if (type === 'pink') {
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.015;
      b6 = white * 0.115926;
    } else {
      // Brown noise for rain
      b0 += white * 0.02;
      b0 = Math.max(-1, Math.min(1, b0));
      data[i] = b0 * 0.15;
    }
  }
  return buffer;
};

export const useAmbientSounds = (partnerOnline: boolean) => {
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const [muted, setMuted] = useState(false);
  const [currentType, setCurrentType] = useState<AmbientType>('night');

  const stop = useCallback(() => {
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch {}
      sourceRef.current = null;
    }
  }, []);

  const start = useCallback((type: AmbientType) => {
    stop();
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
      gainRef.current = ctxRef.current.createGain();
      gainRef.current.connect(ctxRef.current.destination);
    }

    const ctx = ctxRef.current;
    const gain = gainRef.current!;

    // Volume based on type
    const volumes: Record<AmbientType, number> = {
      rain: 0.08,
      birds: 0.04,
      fireplace: 0.06,
      night: 0.03,
    };
    gain.gain.setValueAtTime(muted ? 0 : volumes[type], ctx.currentTime);

    // Create noise
    const noiseType: Record<AmbientType, 'white' | 'pink' | 'brown'> = {
      rain: 'brown',
      birds: 'pink',
      fireplace: 'pink',
      night: 'brown',
    };

    const buffer = createNoiseBuffer(ctx, 4, noiseType[type]);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    // Filter for character
    const filter = ctx.createBiquadFilter();
    if (type === 'rain') {
      filter.type = 'lowpass';
      filter.frequency.value = 800;
    } else if (type === 'birds') {
      filter.type = 'bandpass';
      filter.frequency.value = 2000;
      filter.Q.value = 0.5;
    } else if (type === 'fireplace') {
      filter.type = 'lowpass';
      filter.frequency.value = 1200;
    } else {
      filter.type = 'lowpass';
      filter.frequency.value = 400;
    }

    source.connect(filter);
    filter.connect(gain);
    source.start();
    sourceRef.current = source;
    setCurrentType(type);
  }, [muted, stop]);

  // Auto-start based on conditions
  useEffect(() => {
    const type = getAmbientType(partnerOnline);
    // Don't auto-start audio (requires user gesture). 
    // We just track what should play.
    setCurrentType(type);
  }, [partnerOnline]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setMuted(prev => {
      const next = !prev;
      if (gainRef.current && ctxRef.current) {
        gainRef.current.gain.setValueAtTime(
          next ? 0 : 0.06,
          ctxRef.current.currentTime
        );
      }
      return next;
    });
  }, []);

  // Start on first user interaction
  const activate = useCallback(() => {
    const type = getAmbientType(partnerOnline);
    start(type);
  }, [partnerOnline, start]);

  // Cleanup
  useEffect(() => {
    return () => {
      stop();
      if (ctxRef.current) {
        ctxRef.current.close();
        ctxRef.current = null;
      }
    };
  }, [stop]);

  return { muted, toggleMute, activate, currentType, isPlaying: !!sourceRef.current };
};
