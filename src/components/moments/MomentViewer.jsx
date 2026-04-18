import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from '@/hooks/use-toast';

const VIEW_DURATION_MS = 5000;

export default function MomentViewer({
  open,
  moments,
  startIndex = 0,
  currentUserId = null,
  onClose,
  onReply,
  onReact,
  onUpdateMusic,
}) {
  const [index, setIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const [reply, setReply] = useState('');
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);
  const musicInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const current = moments[index];
    const music = current?.music;
    if (!music) return;

    let cleanup = () => {};
    const trimStart = Number.isFinite(music.trimStart) ? Math.max(0, music.trimStart) : 0;
    const trimEnd = Number.isFinite(music.trimEnd) ? Math.max(trimStart + 1, music.trimEnd) : trimStart + 10;
    const playbackSeconds = Math.max(2, Math.min(trimEnd - trimStart, VIEW_DURATION_MS / 1000));

    if (music.src) {
      const audio = new Audio(music.src);
      audio.volume = typeof music.volume === 'number' ? Math.max(0, Math.min(1, music.volume)) : 0.7;
      audio.currentTime = trimStart;
      audio.loop = false;
      audio.play().catch(() => {
        setNeedsAudioUnlock(true);
      });

      const unlockAudio = () => {
        audio.play()
          .then(() => {
            setNeedsAudioUnlock(false);
          })
          .catch(() => {
            // Still blocked until user interacts again.
          });
      };

      window.addEventListener('pointerdown', unlockAudio);
      window.addEventListener('keydown', unlockAudio);

      const stopTimer = window.setTimeout(() => {
        audio.pause();
      }, playbackSeconds * 1000);

      cleanup = () => {
        window.clearTimeout(stopTimer);
        window.removeEventListener('pointerdown', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
        audio.pause();
      };
    } else {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      const context = new AudioCtx();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const mood = music.mood || 'chill';
      const baseFrequency = mood === 'romantic' ? 174 : mood === 'hype' ? 220 : mood === 'playful' ? 247 : 196;

      oscillator.type = music.category === 'bgm' ? 'sine' : 'triangle';
      oscillator.frequency.value = baseFrequency;
      gain.gain.value = Math.max(0.01, (typeof music.volume === 'number' ? music.volume : 0.7) * 0.08);

      oscillator.connect(gain);
      gain.connect(context.destination);
      if (context.state === 'suspended') {
        setNeedsAudioUnlock(true);
      }
      oscillator.start();

      const unlockContext = () => {
        context.resume().then(() => {
          setNeedsAudioUnlock(false);
        }).catch(() => {
          // ignore
        });
      };

      window.addEventListener('pointerdown', unlockContext);
      window.addEventListener('keydown', unlockContext);

      const stopTimer = window.setTimeout(() => {
        try {
          oscillator.stop();
        } catch {
          // no-op
        }
      }, playbackSeconds * 1000);

      cleanup = () => {
        window.clearTimeout(stopTimer);
        window.removeEventListener('pointerdown', unlockContext);
        window.removeEventListener('keydown', unlockContext);
        try {
          oscillator.stop();
        } catch {
          // no-op
        }
        context.close().catch(() => {
          // no-op
        });
      };
    }

    return cleanup;
  }, [open, index, moments]);

  useEffect(() => {
    if (!open) return;
    setIndex(startIndex);
    setProgress(0);
    setNeedsAudioUnlock(false);
  }, [open, startIndex]);

  useEffect(() => {
    if (!open || !moments.length) return;

    const started = Date.now();
    const id = window.setInterval(() => {
      const p = ((Date.now() - started) / VIEW_DURATION_MS) * 100;
      if (p >= 100) {
        setProgress(100);
        setIndex((i) => {
          if (i >= moments.length - 1) {
            onClose();
            return i;
          }
          return i + 1;
        });
        return;
      }
      setProgress(p);
    }, 50);

    return () => window.clearInterval(id);
  }, [open, index, moments.length, onClose]);

  const moment = moments[index];
  const isOwner = Boolean(currentUserId && moment?.userId === currentUserId);

  const elapsedText = useMemo(() => {
    if (!moment?.createdAt) return 'now';
    const diff = Date.now() - new Date(moment.createdAt).getTime();
    const mins = Math.max(1, Math.floor(diff / 60000));
    return `${mins}m`;
  }, [moment?.createdAt]);

  const goNext = () => {
    if (index >= moments.length - 1) {
      onClose();
      return;
    }
    setIndex((i) => i + 1);
    setProgress(0);
  };

  const goPrev = () => {
    if (index <= 0) return;
    setIndex((i) => i - 1);
    setProgress(0);
  };

  const submitReply = () => {
    if (!reply.trim() || !moment) return;
    onReply?.(moment, reply.trim());
    setReply('');
  };

  const handlePickMusic = () => {
    musicInputRef.current?.click();
  };

  const handleMusicFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !moment || !isOwner) return;

    const src = URL.createObjectURL(file);
    const title = file.name.replace(/\.[^/.]+$/, '');
    const nextMusic = {
      id: `uploaded-${Date.now()}`,
      title,
      artist: 'Uploaded',
      category: 'song',
      mood: 'custom',
      src,
      volume: 0.7,
      trimStart: 0,
      trimEnd: 10,
    };

    try {
      await onUpdateMusic?.(moment.id, nextMusic);
      toast({
        title: 'Music updated',
        description: 'Your moment music was changed successfully.',
      });
    } catch {
      toast({
        title: 'Update failed',
        description: 'Could not change moment music. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleResetMusic = async () => {
    if (!moment || !isOwner) return;
    try {
      await onUpdateMusic?.(moment.id, null);
      toast({
        title: 'Music removed',
        description: 'Moment music has been reset.',
      });
    } catch {
      toast({
        title: 'Reset failed',
        description: 'Could not reset music right now. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (!open || !moment) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="relative mx-auto h-full w-full max-w-md overflow-hidden">
        <input
          ref={musicInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleMusicFileChange}
        />

        <div className="absolute left-0 right-0 top-0 z-20 flex gap-1 px-2 pt-2">
          {moments.map((m, i) => (
            <div key={m.id} className="h-1 flex-1 rounded bg-white/30">
              <motion.div
                className="h-full rounded bg-white"
                animate={{ width: i < index ? '100%' : i === index ? `${progress}%` : '0%' }}
              />
            </div>
          ))}
        </div>

        <div className="absolute left-0 right-0 top-4 z-20 flex items-center justify-between px-3 text-white">
          <div>
            <p className="text-sm font-semibold">@{moment.username || 'user'}</p>
            <p className="text-xs text-white/70">{elapsedText}</p>
          </div>
          <div className="flex items-center gap-2">
            {isOwner && (
              <>
                <button onClick={handlePickMusic} className="rounded-full bg-black/45 px-3 py-1 text-xs">Change Music</button>
                <button onClick={handleResetMusic} className="rounded-full bg-black/45 px-3 py-1 text-xs">Reset Music</button>
              </>
            )}
            <button onClick={onClose} className="rounded-full bg-black/45 px-3 py-1 text-xs">Close</button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={moment.id}
            initial={{ opacity: 0.3, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0.2, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="h-full w-full"
          >
            {moment.mediaType?.startsWith('video') ? (
              <video src={moment.url} className="h-full w-full object-cover" autoPlay muted={Boolean(moment.music)} playsInline />
            ) : (
              <img src={moment.url} alt="moment" className="h-full w-full object-cover" />
            )}
          </motion.div>
        </AnimatePresence>

        {needsAudioUnlock && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/35 pointer-events-none">
            <div className="rounded-full bg-black/70 px-4 py-2 text-sm font-medium text-white border border-white/20">
              Tap anywhere to enable sound
            </div>
          </div>
        )}

        <button onClick={goPrev} className="absolute left-0 top-0 h-full w-1/2" aria-label="Previous moment" />
        <button onClick={goNext} className="absolute right-0 top-0 h-full w-1/2" aria-label="Next moment" />

        <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/90 via-black/35 to-transparent p-3">
          <div className="mb-2 flex gap-2">
            {['😍', '🔥', '💖', '😂', '👏'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => onReact?.(moment, emoji)}
                className="rounded-full bg-white/15 px-2 py-1 text-lg hover:bg-white/25"
              >
                {emoji}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitReply()}
              placeholder="Reply to this moment"
              className="flex-1 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm text-white placeholder:text-white/65 outline-none"
            />
            <button onClick={submitReply} className="rounded-full bg-[#7b2cbf] px-3 py-2 text-sm font-semibold text-white">
              Reply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
