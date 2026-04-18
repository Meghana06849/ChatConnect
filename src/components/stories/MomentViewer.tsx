import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { 
  X, Eye, Heart, Music, Trash2, Clock, 
  ChevronLeft, ChevronRight, Play, Pause
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from '@/hooks/use-toast';

interface MomentReaction {
  id: string;
  emoji: string;
  user_id: string;
  profile?: { display_name: string | null; avatar_url: string | null };
}

interface MomentViewerProps {
  moments: Array<{
    id: string;
    user_id: string;
    content: string | null;
    media_url: string | null;
    media_type: string;
    music_id: string | null;
    music_file_url?: string | null;
    expires_at: string;
    created_at: string;
    profile?: {
      display_name: string | null;
      avatar_url: string | null;
      username: string | null;
    };
  }>;
  startIndex?: number;
  isOwner: boolean;
  onClose: () => void;
  isLoversMode: boolean;
}

interface Viewer {
  id: string;
  viewer_id: string;
  viewed_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export const MomentViewer: React.FC<MomentViewerProps> = ({ 
  moments,
  startIndex = 0,
  isOwner, 
  onClose,
  isLoversMode 
}) => {
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [showViewers, setShowViewers] = useState(false);
  const [song, setSong] = useState<{ title: string; artist: string; file_url?: string | null } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [reactions, setReactions] = useState<MomentReaction[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(startIndex);
  const [storyProgress, setStoryProgress] = useState(0);
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const autoplayAttemptedRef = useRef(false);
  const progressTimerRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const reactionEmojis = ['❤️', '🔥', '😍', '😂', '😮', '👏', '💯', '🥺'];
  const activeMoment = moments[Math.min(activeIndex, moments.length - 1)];

  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
      } catch {
        // ignore if already stopped
      }
      oscillatorRef.current.disconnect();
      oscillatorRef.current = null;
    }

    if (gainRef.current) {
      gainRef.current.disconnect();
      gainRef.current = null;
    }

    setIsPlaying(false);
  }, []);

  useEffect(() => {
    setActiveIndex(Math.min(startIndex, Math.max(moments.length - 1, 0)));
  }, [startIndex, moments.length]);

  useEffect(() => {
    setShowViewers(false);
    stopPlayback();
    setNeedsAudioUnlock(false);
    autoplayAttemptedRef.current = false;
    setStoryProgress(0);

    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }

    if (!activeMoment) return;

    loadReactions(activeMoment.id);
    if (isOwner) {
      loadViewers(activeMoment.id);
    }
    if (activeMoment.music_id) {
      loadSong(activeMoment.music_id);
    } else {
      setSong(null);
    }

    progressTimerRef.current = window.setInterval(() => { 
      setStoryProgress((value) => { 
        if (value >= 99) { 
          window.clearInterval(progressTimerRef.current!); 
          progressTimerRef.current = null; 
          window.setTimeout(() => { 
            goNext(); 
          }, 0); 
          return 100; 
        } 
        return value + 1; 
      }); 
    }, 240);

    return () => {
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMoment?.id, isOwner]); 

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });

    return () => {
      stopPlayback();
      autoplayAttemptedRef.current = false;
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };
  }, [isOwner, stopPlayback]); 

  useEffect(() => {
    if (!song || autoplayAttemptedRef.current) return;
    autoplayAttemptedRef.current = true;

    const attemptAutoplay = async () => {
      try {
        await startPlayback();
        setIsPlaying(true);
      } catch (error) {
        console.error('Autoplay failed:', error);
        setIsPlaying(false);
      }
    };

    attemptAutoplay();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song]);

  const totalSegments = Math.max(1, moments.length);

  const startPlayback = useCallback(async () => {
    if (!song) return;

    stopPlayback();

    if (song.file_url) {
      const audio = new Audio(song.file_url);
      audio.loop = true;
      audio.volume = 0.9;
      audioRef.current = audio;

      try {
        await audio.play();
        setNeedsAudioUnlock(false);
      } catch (error) {
        console.error('Error playing song audio:', error);
        setNeedsAudioUnlock(true);
        stopPlayback();
      }
      return;
    }

    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new AudioCtx();
    }

    if (audioContextRef.current.state === 'suspended') {
      try {
        await audioContextRef.current.resume();
      } catch {
        setNeedsAudioUnlock(true);
        setIsPlaying(false);
        return;
      }
    }

    const oscillator = audioContextRef.current.createOscillator();
    const gain = audioContextRef.current.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = song.title.toLowerCase().includes('movie') ? 220 : 261.63;
    gain.gain.value = 0.04;
    oscillator.connect(gain);
    gain.connect(audioContextRef.current.destination);
    oscillator.start();
    setNeedsAudioUnlock(false);

    oscillatorRef.current = oscillator;
    gainRef.current = gain;
  }, [song, stopPlayback]);

  const togglePlayback = async () => {
    if (isPlaying) {
      stopPlayback();
      return;
    }

    setIsPlaying(true);
    await startPlayback();
  };

  useEffect(() => {
    if (!needsAudioUnlock || !song) return;

    const unlockAndPlay = async () => {
      try {
        setIsPlaying(true);
        await startPlayback();
      } catch {
        setIsPlaying(false);
      }
    };

    window.addEventListener('pointerdown', unlockAndPlay);
    window.addEventListener('keydown', unlockAndPlay);

    return () => {
      window.removeEventListener('pointerdown', unlockAndPlay);
      window.removeEventListener('keydown', unlockAndPlay);
    };
  }, [needsAudioUnlock, song, startPlayback]);

  const loadReactions = async (momentId: string) => {
    const { data } = await supabase
      .from('moment_reactions')
      .select('id, emoji, user_id')
      .eq('moment_id', momentId);
    
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      setReactions(data.map(r => ({ ...r, profile: profileMap.get(r.user_id) })));
    } else {
      setReactions([]);
    }
  };

  const toggleReaction = async (emoji: string) => {
    if (!activeMoment) return;
    if (!currentUserId) return;
    const myReaction = reactions.find(r => r.user_id === currentUserId);
    
    if (myReaction && myReaction.emoji === emoji) {
      // Same emoji → remove reaction
      await supabase.from('moment_reactions').delete().eq('id', myReaction.id);
    } else if (myReaction) {
      // Different emoji → update existing reaction
      await supabase.from('moment_reactions').update({ emoji }).eq('id', myReaction.id);
    } else {
      // No existing reaction → insert
      await supabase.from('moment_reactions').insert({
        moment_id: activeMoment.id,
        user_id: currentUserId,
        emoji,
      });
    }
    loadReactions(activeMoment.id);
    setShowEmojiPicker(false);
  };

  const loadViewers = async (momentId: string) => {
    try {
      const { data, error } = await supabase
        .from('moment_views')
        .select('*')
        .eq('moment_id', momentId)
        .order('viewed_at', { ascending: false });

      if (error) throw error;
      
      // Fetch profiles for viewers
      const viewerIds = (data || []).map(v => v.viewer_id);
      if (viewerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', viewerIds);
        
        const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
        const enriched = (data || []).map(v => ({
          ...v,
          profile: profileMap.get(v.viewer_id) || undefined,
        }));
        setViewers(enriched);
      } else {
        setViewers(data || []);
      }
    } catch (error) {
      console.error('Error loading viewers:', error);
    }
  };

  const loadSong = async (musicId: string) => {
    try {
      const { data } = await supabase
        .from('user_songs')
        .select('title, artist, file_url')
        .eq('id', musicId)
        .single();
      
      if (data) setSong(data);
    } catch (error) {
      console.error('Error loading song:', error);
    }
  };

  const handleDelete = async () => {
    if (!activeMoment) return;
    try {
      const { error } = await supabase
        .from('moments')
        .delete()
        .eq('id', activeMoment.id);

      if (error) throw error;

      toast({
        title: "Moment deleted",
        description: "Your moment has been removed"
      });
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to delete moment',
        variant: "destructive"
      });
    }
  };

  const getTimeRemaining = () => {
    const now = new Date();
    const expires = new Date(activeMoment?.expires_at || new Date().toISOString());
    const diff = expires.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    return hours > 0 ? `${hours}h remaining` : 'Expiring soon';
  };

  const goPrev = useCallback(() => {
    if (activeIndex <= 0) return;
    setActiveIndex((index) => Math.max(0, index - 1));
  }, [activeIndex]);

  const goNext = useCallback(() => {
    if (activeIndex >= moments.length - 1) {
      onClose();
      return;
    }
    setActiveIndex((index) => Math.min(moments.length - 1, index + 1));
  }, [activeIndex, moments.length, onClose]);

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    if (!start) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;

    touchStartRef.current = null;

    if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY)) return;

    if (deltaX > 0) {
      goPrev();
    } else {
      goNext();
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrev();
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev, onClose]);

  if (!activeMoment) {
    return null;
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="fixed inset-0 left-0 top-0 h-screen w-screen max-w-none translate-x-0 translate-y-0 overflow-hidden border-0 bg-black p-0">
        <div
          className="relative h-full w-full overflow-hidden bg-black"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Segmented progress bar */}
          <div className="absolute left-0 right-0 top-0 z-30 flex gap-1 px-2 pt-2">
            {Array.from({ length: totalSegments }).map((_, index) => {
              const filled = index < activeIndex;
              const active = index === activeIndex;
              return (
                <div key={`story-segment-${index}`} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
                  <div
                    className={`h-full rounded-full transition-all duration-200 ${isLoversMode ? 'bg-lovers-primary' : 'bg-general-primary'}`}
                    style={{ width: filled ? '100%' : active ? `${storyProgress}%` : '0%', opacity: active ? 1 : 0.85 }}
                  />
                </div>
              );
            })}
          </div>

          {/* Background media */}
          <div className="absolute inset-0">
            {activeMoment.media_url ? (
              activeMoment.media_type === 'video' ? (
                <video
                  src={activeMoment.media_url}
                  className="h-full w-full object-cover"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              ) : (
                <img
                  src={activeMoment.media_url}
                  alt="Moment"
                  className="h-full w-full object-cover"
                />
              )
            ) : (
              <div className={`h-full w-full ${isLoversMode ? 'bg-gradient-to-br from-lovers-primary/35 via-black to-lovers-secondary/30' : 'bg-gradient-to-br from-general-primary/35 via-black to-general-secondary/30'}`}>
                <div className="flex h-full w-full items-center justify-center">
                  <span className="text-7xl">{isLoversMode ? '💕' : '✨'}</span>
                </div>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/30" />

            {needsAudioUnlock && (
              <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/35 pointer-events-none">
                <div className="rounded-full border border-white/20 bg-black/70 px-4 py-2 text-sm font-medium text-white">
                  Tap anywhere to enable moment audio
                </div>
              </div>
            )}
          </div>

          {/* Header */}
          <div className="absolute left-4 right-4 top-4 z-30 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3 rounded-full bg-black/25 px-3 py-2 backdrop-blur-md">
              <Avatar className="h-10 w-10 border border-white/20">
                <AvatarImage src={activeMoment.profile?.avatar_url || undefined} />
                <AvatarFallback>{isOwner ? 'You' : activeMoment.profile?.display_name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {isOwner ? 'Your Moment' : activeMoment.profile?.display_name || 'Friend'}
                </p>
                <p className="text-xs text-white/65">
                  {formatDistanceToNow(new Date(activeMoment.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isOwner && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-full bg-black/25 px-3 text-white backdrop-blur-md hover:bg-black/40"
                  onClick={() => setShowViewers(!showViewers)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  {viewers.length}
                </Button>
              )}
              <div className="rounded-full bg-black/25 px-3 py-2 text-xs text-white/75 backdrop-blur-md">
                <Clock className="mr-1 inline h-3 w-3" />
                {getTimeRemaining()}
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="rounded-full bg-black/25 text-white backdrop-blur-md hover:bg-black/40"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Center content card */}
          <div className="absolute inset-x-0 bottom-0 z-20 flex h-full flex-col justify-end p-4 sm:p-6">
            <div className="mx-auto flex w-full max-w-xl flex-col gap-3">
              {activeMoment.content && (
                <div className="max-w-[92%] rounded-2xl bg-black/35 px-4 py-3 backdrop-blur-md">
                  <p className="text-base leading-6 text-white sm:text-lg">{activeMoment.content}</p>
                </div>
              )}

              {song && (
                <Card className="w-fit max-w-full border-white/15 bg-black/35 shadow-2xl backdrop-blur-md">
                  <CardContent className="flex items-center gap-3 px-3 py-3">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-11 w-11 rounded-full bg-white/10 text-white hover:bg-white/20"
                      onClick={togglePlayback}
                    >
                      {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                    </Button>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{song.title}</p>
                      <p className="truncate text-xs text-white/65">{song.artist}</p>
                    </div>
                    <Music className={`h-5 w-5 ${isLoversMode ? 'text-lovers-primary' : 'text-general-primary'} animate-pulse`} />
                  </CardContent>
                </Card>
              )}

              <div className="flex items-end justify-between gap-3 pb-1">
                <div className="flex flex-1 flex-wrap gap-2">
                  {reactions.slice(0, 3).map((reaction) => (
                    <span key={reaction.id} className="rounded-full bg-black/35 px-3 py-1 text-sm text-white backdrop-blur-md">
                      {reaction.emoji}
                    </span>
                  ))}
                </div>

                {!isOwner && (
                  <div className="flex flex-col items-end gap-2">
                    {showEmojiPicker && (
                      <div className="flex max-w-[80vw] gap-1 rounded-full bg-black/35 p-2 backdrop-blur-md">
                        {reactionEmojis.map(emoji => {
                          const hasReacted = reactions.some(r => r.user_id === currentUserId && r.emoji === emoji);
                          return (
                            <button
                              key={emoji}
                              onClick={() => toggleReaction(emoji)}
                              className={`rounded-full p-2 text-xl transition-transform hover:scale-110 ${hasReacted ? 'bg-white/20 ring-2 ring-white/30' : 'hover:bg-white/10'}`}
                            >
                              {emoji}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {reactions.filter(r => r.user_id === currentUserId).length > 0 && (
                      <div className="flex flex-wrap justify-end gap-2">
                        {reactions.filter(r => r.user_id === currentUserId).map(r => (
                          <button
                            key={r.id}
                            className="rounded-full bg-black/35 px-3 py-1 text-sm text-white backdrop-blur-md hover:bg-black/45"
                            onClick={() => toggleReaction(r.emoji)}
                          >
                            {r.emoji}
                          </button>
                        ))}
                      </div>
                    )}

                    <Button
                      size="icon"
                      className={`h-12 w-12 rounded-full shadow-lg ${isLoversMode ? 'bg-lovers-primary hover:bg-lovers-primary/90' : 'bg-general-primary hover:bg-general-primary/90'}`}
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    >
                      <Heart className="h-5 w-5 text-white" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-12 w-12 rounded-full bg-black/25 text-white backdrop-blur-md hover:bg-black/40 disabled:opacity-40"
                  onClick={goPrev}
                  disabled={activeIndex === 0}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>

                <div className="rounded-full bg-black/25 px-3 py-2 text-xs text-white/70 backdrop-blur-md">
                  {activeIndex + 1} / {moments.length}
                </div>

                <Button
                  size="icon"
                  variant="ghost"
                  className="h-12 w-12 rounded-full bg-black/25 text-white backdrop-blur-md hover:bg-black/40"
                  onClick={goNext}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>

              {isOwner && (
                <div className="flex items-center justify-between rounded-2xl bg-black/35 px-4 py-3 backdrop-blur-md">
                  <div className="text-xs text-white/70">
                    {reactions.length > 0 ? `${reactions.length} reaction${reactions.length === 1 ? '' : 's'}` : 'No reactions yet'}
                  </div>
                  <Button
                    variant="ghost"
                    className="rounded-full text-white hover:bg-white/10"
                    onClick={handleDelete}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Viewers Drawer */}
          {isOwner && showViewers && (
            <div className="absolute inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/85 p-4 backdrop-blur-xl">
              <div className="mx-auto flex w-full max-w-xl items-center justify-between pb-3">
                <p className="text-sm font-semibold text-white">Viewers</p>
                <Button variant="ghost" size="sm" className="rounded-full text-white hover:bg-white/10" onClick={() => setShowViewers(false)}>
                  Close
                </Button>
              </div>
              {viewers.length > 0 ? (
                <ScrollArea className="max-h-[30vh]">
                  <div className="space-y-2">
                    {viewers.map(viewer => (
                      <div key={viewer.id} className="flex items-center gap-3 rounded-2xl bg-white/5 px-3 py-2">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={viewer.profile?.avatar_url || undefined} />
                          <AvatarFallback>{viewer.profile?.display_name?.[0] || 'V'}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-white">{viewer.profile?.display_name || 'Viewer'}</p>
                          <p className="text-xs text-white/50">{formatDistanceToNow(new Date(viewer.viewed_at), { addSuffix: true })}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-sm text-white/60">No viewers yet.</p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};