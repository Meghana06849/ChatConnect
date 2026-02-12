import React, { useState, useEffect } from 'react';
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

interface MomentViewerProps {
  moment: {
    id: string;
    user_id: string;
    content: string | null;
    media_url: string | null;
    media_type: string;
    music_id: string | null;
    expires_at: string;
    created_at: string;
    profile?: {
      display_name: string | null;
      avatar_url: string | null;
      username: string | null;
    };
  };
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
  moment, 
  isOwner, 
  onClose,
  isLoversMode 
}) => {
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [showViewers, setShowViewers] = useState(false);
  const [song, setSong] = useState<{ title: string; artist: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (isOwner) {
      loadViewers();
    }
    if (moment.music_id) {
      loadSong();
    }
  }, [moment.id, isOwner]);

  const loadViewers = async () => {
    try {
      const { data, error } = await supabase
        .from('moment_views')
        .select('*')
        .eq('moment_id', moment.id)
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

  const loadSong = async () => {
    try {
      const { data } = await supabase
        .from('user_songs')
        .select('title, artist')
        .eq('id', moment.music_id)
        .single();
      
      if (data) setSong(data);
    } catch (error) {
      console.error('Error loading song:', error);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('moments')
        .delete()
        .eq('id', moment.id);

      if (error) throw error;

      toast({
        title: "Moment deleted",
        description: "Your moment has been removed"
      });
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getTimeRemaining = () => {
    const now = new Date();
    const expires = new Date(moment.expires_at);
    const diff = expires.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    return hours > 0 ? `${hours}h remaining` : 'Expiring soon';
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="glass border-white/20 max-w-lg p-0 overflow-hidden">
        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 z-10">
          <div 
            className={`h-full transition-all duration-[24000ms] ${isLoversMode ? 'bg-lovers-primary' : 'bg-general-primary'}`}
            style={{ width: '100%' }}
          />
        </div>

        {/* Header */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10 border-2 border-white/30">
              <AvatarImage src={moment.profile?.avatar_url || undefined} />
              <AvatarFallback>
                {isOwner ? 'You' : moment.profile?.display_name?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-white font-medium text-sm">
                {isOwner ? 'Your Moment' : moment.profile?.display_name || 'Friend'}
              </p>
              <p className="text-white/60 text-xs">
                {formatDistanceToNow(new Date(moment.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="glass rounded-full px-3 py-1 text-white text-xs flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              {getTimeRemaining()}
            </div>
            <Button 
              size="icon" 
              variant="ghost"
              className="text-white hover:bg-white/10"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="relative min-h-[500px] bg-black">
          {moment.media_url ? (
            moment.media_type === 'video' ? (
              <video 
                src={moment.media_url} 
                className="w-full h-full object-contain"
                autoPlay
                loop
                muted
              />
            ) : (
              <img 
                src={moment.media_url} 
                alt="Moment" 
                className="w-full h-full object-contain"
              />
            )
          ) : (
            <div className={`
              w-full h-full flex items-center justify-center
              ${isLoversMode 
                ? 'bg-gradient-to-br from-lovers-primary/30 to-lovers-secondary/30' 
                : 'bg-gradient-to-br from-general-primary/30 to-general-secondary/30'
              }
            `}>
              <span className="text-6xl">{isLoversMode ? '💕' : '✨'}</span>
            </div>
          )}

          {/* Text Overlay */}
          {moment.content && (
            <div className="absolute bottom-24 left-4 right-4">
              <div className="glass rounded-lg p-4">
                <p className="text-white text-lg">{moment.content}</p>
              </div>
            </div>
          )}

          {/* Music Player */}
          {song && (
            <div className="absolute bottom-4 left-4 right-4">
              <Card className="glass border-white/20">
                <CardContent className="p-3 flex items-center space-x-3">
                  <Button 
                    size="icon" 
                    variant="ghost"
                    className="text-white"
                    onClick={() => setIsPlaying(!isPlaying)}
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </Button>
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{song.title}</p>
                    <p className="text-white/60 text-xs">{song.artist}</p>
                  </div>
                  <Music className={`w-5 h-5 ${isLoversMode ? 'text-lovers-primary' : 'text-general-primary'} animate-pulse`} />
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Footer (for owner) */}
        {isOwner && (
          <div className="p-4 bg-black/50 border-t border-white/10">
            <div className="flex items-center justify-between">
              <Button 
                variant="ghost" 
                className="text-white flex items-center space-x-2"
                onClick={() => setShowViewers(!showViewers)}
              >
                <Eye className="w-4 h-4" />
                <span>{viewers.length} views</span>
              </Button>
              <Button 
                variant="ghost" 
                className="text-destructive hover:text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>

            {/* Viewers List */}
            {showViewers && viewers.length > 0 && (
              <ScrollArea className="mt-4 max-h-48">
                <div className="space-y-2">
                  {viewers.map(viewer => (
                    <div 
                      key={viewer.id}
                      className="flex items-center space-x-3 p-2 glass rounded-lg"
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={viewer.profile?.avatar_url || undefined} />
                        <AvatarFallback>
                          {viewer.profile?.display_name?.[0] || 'V'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-white text-sm">
                          {viewer.profile?.display_name || 'Viewer'}
                        </p>
                        <p className="text-white/50 text-xs">
                          {formatDistanceToNow(new Date(viewer.viewed_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}

        {/* Reactions (for non-owners) */}
        {!isOwner && (
          <div className="absolute bottom-4 right-4">
            <Button 
              size="icon"
              className={`rounded-full ${isLoversMode ? 'bg-lovers-primary hover:bg-lovers-primary/90' : 'bg-general-primary hover:bg-general-primary/90'}`}
            >
              <Heart className="w-5 h-5 text-white" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};