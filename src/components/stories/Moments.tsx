import React, { useState, useEffect, useCallback } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Plus, Star, Sparkles } from 'lucide-react';
import { MomentCreator } from './MomentCreator';
import { MomentViewer } from './MomentViewer';

interface Moment {
  id: string;
  user_id: string;
  content: string | null;
  media_url: string | null;
  media_type: string;
  music_id: string | null;
  audience_mode?: 'general' | 'lovers' | null;
  privacy_type: string;
  excluded_users?: string[] | null;
  included_users?: string[] | null;
  expires_at: string;
  created_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
  views_count?: number;
  has_viewed?: boolean;
}

export const Moments: React.FC = () => {
  const { mode } = useChat();
  const { profile } = useProfile();
  const { toast } = useToast();
  const [moments, setMoments] = useState<Moment[]>([]);
  const [myMoments, setMyMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedMomentIndex, setSelectedMomentIndex] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const isLoversMode = mode === 'lovers';
  const storyMoments = [...myMoments, ...moments];

  const enrichMomentsWithProfiles = useCallback(async (rows: Moment[]) => {
    const userIds = [...new Set(rows.map((row) => row.user_id))];
    if (userIds.length === 0) return rows;

    const { data: profilesData } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url, username')
      .in('user_id', userIds);

    const profileMap = new Map((profilesData || []).map((p) => [p.user_id, p]));
    return rows.map((row) => ({
      ...row,
      profile: profileMap.get(row.user_id) || undefined,
    }));
  }, []);

  const getAudienceMode = useCallback((row: Moment) => {
    const value = (row as unknown as Record<string, unknown>).audience_mode;
    return value === 'general' || value === 'lovers' ? value : null;
  }, []);

  const getStringArray = useCallback((value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === 'string');
  }, []);

  const isMomentAllowed = useCallback((row: Moment, userId: string, ownMoment: boolean) => {
    const audienceMode = getAudienceMode(row);

    if (isLoversMode) {
      if (ownMoment) return true;
      if (audienceMode === 'general') return false;
      if (!ownMoment && profile?.lovers_partner_id) {
        return row.user_id === profile.lovers_partner_id;
      }
      return true;
    }

    if (audienceMode === 'lovers') return false;

    if (ownMoment) return true;

    if (row.privacy_type === 'selected') {
      const included = getStringArray((row as unknown as Record<string, unknown>).included_users);
      return included.includes(userId);
    }

    if (row.privacy_type === 'excluded_friends') {
      const excluded = getStringArray((row as unknown as Record<string, unknown>).excluded_users);
      return !excluded.includes(userId);
    }

    return true;
  }, [getAudienceMode, getStringArray, isLoversMode, profile?.lovers_partner_id]);

  const loadMoments = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const { data: ownMomentsRaw, error: ownError } = await supabase
        .from('moments')
        .select('*')
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (ownError) throw ownError;
      const ownRows = ((ownMomentsRaw || []) as Moment[]).filter((row) => isMomentAllowed(row, user.id, true));
      setMyMoments(await enrichMomentsWithProfiles(ownRows));

      // Load friends/public moments based on mode
      let query = supabase
        .from('moments')
        .select('*')
        .neq('user_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (isLoversMode && profile?.lovers_partner_id) {
        query = query.eq('user_id', profile.lovers_partner_id);
      }

      const { data: momentsData, error } = await query;
      if (error) throw error;

      const filtered = (momentsData || []).filter((row) => isMomentAllowed(row as Moment, user.id, false));

      setMoments(await enrichMomentsWithProfiles(filtered as Moment[]));

    } catch (error) {
      console.error('Error loading moments:', error);
      toast({
        title: "Error",
        description: "Failed to load moments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [isLoversMode, profile?.lovers_partner_id, enrichMomentsWithProfiles, isMomentAllowed, toast]);

  // Initial load
  useEffect(() => {
    loadMoments();
  }, [loadMoments]);

  // Refetch when tab regains focus (prevents stale data)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadMoments();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loadMoments]);

  // Real-time subscription for new moments from friends
  useEffect(() => {
    const channel = supabase
      .channel('realtime-moments')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'moments',
      }, () => {
        // Reload all moments when any new one is inserted
        loadMoments();
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'moments',
      }, (payload) => {
        // Remove deleted/expired moments from state
        const deletedId = payload.old?.id;
        if (deletedId) {
          setMoments(prev => prev.filter(m => m.id !== deletedId));
          setMyMoments(prev => prev.filter(m => m.id !== deletedId));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadMoments]);

  const handleMomentClick = async (moment: Moment) => {
    const index = storyMoments.findIndex((item) => item.id === moment.id);
    setSelectedMomentIndex(index >= 0 ? index : null);
    
    // Record view if not own moment
    if (moment.user_id !== currentUserId) {
      try {
        await supabase
          .from('moment_views')
          .upsert({
            moment_id: moment.id,
            viewer_id: currentUserId!
          }, { onConflict: 'moment_id,viewer_id' });
      } catch (error) {
        console.error('Error recording view:', error);
      }
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    return hours > 0 ? `${hours}h left` : 'Expiring soon';
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Sparkles className={`w-12 h-12 mx-auto mb-4 animate-pulse ${isLoversMode ? 'text-lovers-primary' : 'text-general-primary'}`} />
          <p className="text-muted-foreground">Loading moments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Star className={`w-16 h-16 mx-auto mb-4 ${isLoversMode ? 'text-lovers-primary' : 'text-general-primary'} animate-pulse`} />
          <h1 className="text-3xl font-bold mb-2">
            {isLoversMode ? '💕 Love Moments' : 'Moments'}
          </h1>
          <p className="text-muted-foreground">
            {isLoversMode ? 'Share your romantic moments' : 'Share your daily moments with friends'}
          </p>
        </div>

        {/* Story Circles */}
        <div className="mb-8 rounded-3xl border border-border/60 bg-card/70 p-4 shadow-sm backdrop-blur-sm">
          <div className="mb-4 flex items-end justify-between gap-3 px-1">
            <div>
              <p className="text-sm font-semibold text-foreground">Stories</p>
              <p className="text-xs text-muted-foreground">Tap a circle to view</p>
            </div>
            <p className="text-xs text-muted-foreground">24h stories</p>
          </div>

          <ScrollArea className="w-full">
            <div className="flex gap-5 px-1 pb-2">
              {/* Create Moment Button */}
              <button
                type="button"
                className="group flex shrink-0 flex-col items-center outline-none"
                onClick={() => setShowCreateDialog(true)}
              >
                <div className={`
                  flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed bg-background/70 shadow-sm transition-all
                  ${isLoversMode
                    ? 'border-lovers-primary/50 group-hover:border-lovers-primary group-hover:bg-lovers-primary/10'
                    : 'border-general-primary/50 group-hover:border-general-primary group-hover:bg-general-primary/10'
                  }
                `}>
                  <Plus className={`h-8 w-8 ${isLoversMode ? 'text-lovers-primary' : 'text-general-primary'}`} />
                </div>
                <span className="mt-2 max-w-[84px] text-center text-xs font-medium text-muted-foreground group-hover:text-foreground">
                  Add Moment
                </span>
              </button>

              {/* My Moments */}
              {myMoments.length > 0 && (
                <button
                  type="button"
                  className="group flex shrink-0 flex-col items-center outline-none"
                  onClick={() => handleMomentClick(myMoments[0])}
                >
                  <div className={`
                    h-20 w-20 rounded-full p-[3px] shadow-sm transition-transform group-hover:scale-[1.02]
                    ${isLoversMode
                      ? 'bg-gradient-to-br from-lovers-primary via-fuchsia-400 to-lovers-secondary'
                      : 'bg-gradient-to-br from-general-primary via-cyan-400 to-general-secondary'
                    }
                  `}>
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-background p-[3px]">
                      <Avatar className="h-full w-full">
                        <AvatarFallback className={`text-sm font-semibold ${isLoversMode ? 'bg-lovers-primary/15' : 'bg-general-primary/15'}`}>
                          You
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                  <span className="mt-2 max-w-[88px] truncate text-center text-xs font-medium text-foreground">
                    Your Story
                  </span>
                </button>
              )}

              {/* Friends' Moments */}
              {moments.map((moment) => (
                <button
                  key={moment.id}
                  type="button"
                  className="group flex shrink-0 flex-col items-center outline-none"
                  onClick={() => handleMomentClick(moment)}
                >
                  <div className={`
                    h-20 w-20 rounded-full p-[3px] shadow-sm transition-transform group-hover:scale-[1.02]
                    ${moment.has_viewed
                      ? 'bg-muted-foreground/30'
                      : isLoversMode
                        ? 'bg-gradient-to-br from-lovers-primary via-fuchsia-400 to-lovers-secondary'
                        : 'bg-gradient-to-br from-general-primary via-cyan-400 to-general-secondary'
                    }
                  `}>
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-background p-[3px]">
                      <Avatar className="h-full w-full">
                        <AvatarImage src={moment.profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-sm font-semibold">
                          {moment.profile?.display_name?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                  <span className="mt-2 max-w-[92px] truncate text-center text-xs font-medium text-muted-foreground group-hover:text-foreground">
                    {isLoversMode ? (moment.profile?.display_name || 'Partner') : (moment.profile?.display_name || 'Friend')}
                  </span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Empty State */}
        {moments.length === 0 && myMoments.length === 0 && (
          <div className="text-center py-12">
            <div className={`
              w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4
              ${isLoversMode 
                ? 'bg-gradient-to-br from-lovers-primary/20 to-lovers-secondary/20' 
                : 'bg-gradient-to-br from-general-primary/20 to-general-secondary/20'
              }
            `}>
              <Sparkles className={`w-12 h-12 ${isLoversMode ? 'text-lovers-primary' : 'text-general-primary'}`} />
            </div>
            <h3 className="text-xl font-semibold mb-2">No moments yet</h3>
            <p className="text-muted-foreground mb-4">Be the first to share a moment!</p>
            <Button 
              onClick={() => setShowCreateDialog(true)}
              className={isLoversMode ? 'btn-lovers' : 'btn-general'}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Moment
            </Button>
          </div>
        )}

        {/* Create Moment Dialog */}
        <MomentCreator 
          isOpen={showCreateDialog} 
          onClose={() => setShowCreateDialog(false)}
          onCreated={() => {
            void loadMoments();
            window.setTimeout(() => {
              void loadMoments();
            }, 900);
            setShowCreateDialog(false);
          }}
          isLoversMode={isLoversMode}
        />

        {/* View Moment Dialog */}
        {selectedMomentIndex !== null && storyMoments[selectedMomentIndex] && (
          <MomentViewer
            moments={storyMoments}
            startIndex={selectedMomentIndex}
            isOwner={storyMoments[selectedMomentIndex].user_id === currentUserId}
            onClose={() => setSelectedMomentIndex(null)}
            isLoversMode={isLoversMode}
          />
        )}
      </div>
    </div>
  );
};