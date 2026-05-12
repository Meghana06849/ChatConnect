import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Phone, PhoneOff, Video, Volume2 } from 'lucide-react';

interface IncomingCallNotificationProps {
  callerName: string;
  callType: 'voice' | 'video';
  onAccept: () => void;
  onReject: () => void;
}

export const IncomingCallNotification: React.FC<IncomingCallNotificationProps> = ({
  callerName,
  callType,
  onAccept,
  onReject
}) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);

  const playRingTone = useCallback(async () => {
    try {
      const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;

      if (!audioContextRef.current) {
        audioContextRef.current = new Ctx();
      }

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const now = audioContextRef.current.currentTime;
      const osc = audioContextRef.current.createOscillator();
      const gain = audioContextRef.current.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(760, now);
      osc.frequency.linearRampToValueAtTime(620, now + 0.18);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.06, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

      osc.connect(gain);
      gain.connect(audioContextRef.current.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch {
      // Ignore browser audio restrictions.
    }
  }, []);

  const unlockSound = useCallback(async () => {
    setIsSoundEnabled(true);
    await playRingTone();
  }, [playRingTone]);

  useEffect(() => {
    let vibrateIntervalId: number | null = null;

    if (isSoundEnabled) {
      void playRingTone();
    }
    const ringIntervalId = window.setInterval(() => {
      if (isSoundEnabled) {
        void playRingTone();
      }
    }, 1600);

    // Vibrate on mobile if supported
    if ('vibrate' in navigator) {
      const vibratePattern = [200, 100, 200, 100, 200];
      vibrateIntervalId = window.setInterval(() => {
        navigator.vibrate(vibratePattern);
      }, 2000);
    }

    return () => {
      window.clearInterval(ringIntervalId);
      if (vibrateIntervalId) {
        window.clearInterval(vibrateIntervalId);
      }
      navigator.vibrate(0);
      if (audioContextRef.current) {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [isSoundEnabled, playRingTone]);

  // Auto-reject after 30 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      onReject();
    }, 30000);

    return () => clearTimeout(timeout);
  }, [onReject]);

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-sm glass border-white/20 animate-pulse-slow">
        <CardContent className="p-8 text-center">
          {/* Animated rings */}
          <div className="relative w-32 h-32 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping" />
            <div className="absolute inset-2 rounded-full border-4 border-primary/40 animate-ping animation-delay-200" />
            <div className="absolute inset-4 rounded-full border-4 border-primary/60 animate-ping animation-delay-400" />
            <Avatar className="relative w-full h-full">
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-white text-4xl">
                {callerName[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
          </div>

          <h2 className="text-2xl font-bold mb-2">{callerName}</h2>
          <p className="text-muted-foreground mb-6 flex items-center justify-center gap-2">
            {callType === 'video' ? (
              <>
                <Video className="w-4 h-4" />
                Incoming video call...
              </>
            ) : (
              <>
                <Phone className="w-4 h-4" />
                Incoming voice call...
              </>
            )}
          </p>

          {!isSoundEnabled && (
            <Button
              type="button"
              variant="outline"
              onClick={unlockSound}
              className="mb-6 rounded-full border-primary/20 bg-primary/10 text-primary hover:bg-primary/20"
            >
              <Volume2 className="w-4 h-4 mr-2" />
              Tap to enable call sound
            </Button>
          )}

          <div className="flex justify-center gap-6">
            <Button
              size="lg"
              variant="destructive"
              onClick={onReject}
              className="rounded-full w-16 h-16 p-0"
            >
              <PhoneOff className="w-7 h-7" />
            </Button>
            
            <Button
              size="lg"
              onClick={onAccept}
              className="rounded-full w-16 h-16 p-0 bg-green-500 hover:bg-green-600"
            >
              {callType === 'video' ? (
                <Video className="w-7 h-7" />
              ) : (
                <Phone className="w-7 h-7" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
