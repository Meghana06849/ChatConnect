import React, { useState, useEffect } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, Camera, Image as ImageIcon, Heart, Star, Play, 
  Music, Eye, Lock, Users, Globe, X, Clock, Sparkles
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { MomentCreator } from './MomentCreator';
import { MomentViewer } from './MomentViewer';
import { formatDistanceToNow } from 'date-fns';

interface Moment {
  id: string;
  user_id: string;
  content: string | null;
  media_url: string | null;
  media_type: string;
  music_id: string | null;
  privacy_type: string;
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
  const [moments, setMoments] = useState<Moment[]>([]);
  const [myMoments, setMyMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedMoment, setSelectedMoment] = useState<Moment | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const isLoversMode = mode === 'lovers';

  useEffect(() => {
    loadMoments();
  }, []);

  const loadMoments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      // Load all visible moments with profile data
      const { data: simpleMoments, error: simpleError } = await supabase
        .from('moments')
        .select('*, profiles!moments_user_id_fkey(display_name, avatar_url, username)')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
      
      if (simpleError) {
        // Fallback without foreign key hint
        const { data: fallbackMoments, error: fallbackError } = await supabase
          .from('moments')
          .select('*')
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false });
        
        if (fallbackError) throw fallbackError;
        
        // Manually fetch profiles for each unique user_id
        const userIds = [...new Set((fallbackMoments || []).map(m => m.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url, username')
          .in('user_id', userIds);
        
        const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
        const enriched = (fallbackMoments || []).map(m => ({
          ...m,
          profile: profileMap.get(m.user_id) || undefined,
        }));
        
        const myMomentsData = enriched.filter(m => m.user_id === user.id) as Moment[];
        const friendsMoments = enriched.filter(m => m.user_id !== user.id) as Moment[];
        setMyMoments(myMomentsData);
        setMoments(friendsMoments);
        setLoading(false);
        return;
      }
      
      const enrichedMoments = (simpleMoments || []).map((m: any) => ({
        ...m,
        profile: m.profiles || undefined,
      }));
      
      const myMomentsData = enrichedMoments.filter(m => m.user_id === user.id) as Moment[];
      const friendsMoments = enrichedMoments.filter(m => m.user_id !== user.id) as Moment[];
      
      setMyMoments(myMomentsData);
      setMoments(friendsMoments);
    } catch (error: any) {
      console.error('Error loading moments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMomentClick = async (moment: Moment) => {
    setSelectedMoment(moment);
    
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
        <div className="mb-8">
          <ScrollArea className="w-full">
            <div className="flex space-x-4 p-2">
              {/* Create Moment Button */}
              <div 
                className="flex flex-col items-center cursor-pointer group"
                onClick={() => setShowCreateDialog(true)}
              >
                <div className={`
                  w-20 h-20 rounded-full flex items-center justify-center
                  border-2 border-dashed transition-all
                  ${isLoversMode 
                    ? 'border-lovers-primary/50 hover:border-lovers-primary hover:bg-lovers-primary/10' 
                    : 'border-general-primary/50 hover:border-general-primary hover:bg-general-primary/10'
                  }
                `}>
                  <Plus className={`w-8 h-8 ${isLoversMode ? 'text-lovers-primary' : 'text-general-primary'}`} />
                </div>
                <span className="text-xs mt-2 text-muted-foreground">Add Moment</span>
              </div>

              {/* My Moments */}
              {myMoments.length > 0 && (
                <div 
                  className="flex flex-col items-center cursor-pointer group"
                  onClick={() => handleMomentClick(myMoments[0])}
                >
                  <div className={`
                    w-20 h-20 rounded-full p-0.5 transition-all
                    ${isLoversMode 
                      ? 'bg-gradient-to-br from-lovers-primary to-lovers-secondary' 
                      : 'bg-gradient-to-br from-general-primary to-general-secondary'
                    }
                  `}>
                    <div className="w-full h-full rounded-full bg-background p-0.5">
                      <Avatar className="w-full h-full">
                        <AvatarFallback className={`
                          ${isLoversMode 
                            ? 'bg-gradient-to-br from-lovers-primary/20 to-lovers-secondary/20' 
                            : 'bg-gradient-to-br from-general-primary/20 to-general-secondary/20'
                          }
                        `}>
                          You
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                  <span className="text-xs mt-2 text-muted-foreground">Your Story</span>
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 mt-1">
                    {myMoments.length}
                  </Badge>
                </div>
              )}

              {/* Friends' Moments */}
              {moments.map((moment) => (
                <div 
                  key={moment.id}
                  className="flex flex-col items-center cursor-pointer group"
                  onClick={() => handleMomentClick(moment)}
                >
                  <div className={`
                    w-20 h-20 rounded-full p-0.5 transition-all
                    ${moment.has_viewed 
                      ? 'bg-muted-foreground/30' 
                      : isLoversMode 
                        ? 'bg-gradient-to-br from-lovers-primary to-lovers-secondary animate-pulse' 
                        : 'bg-gradient-to-br from-general-primary to-general-secondary animate-pulse'
                    }
                  `}>
                    <div className="w-full h-full rounded-full bg-background p-0.5">
                      <Avatar className="w-full h-full">
                        <AvatarImage src={moment.profile?.avatar_url || undefined} />
                        <AvatarFallback>
                          {moment.profile?.display_name?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                  <span className="text-xs mt-2 text-muted-foreground truncate max-w-[80px]">
                    {moment.profile?.display_name || 'Friend'}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Moments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...myMoments, ...moments].map((moment) => (
            <Card 
              key={moment.id} 
              className={`
                glass border-white/20 hover:shadow-lg transition-all duration-200 cursor-pointer group overflow-hidden
                ${moment.user_id === currentUserId 
                  ? isLoversMode ? 'ring-2 ring-lovers-primary/30' : 'ring-2 ring-general-primary/30'
                  : ''
                }
              `}
              onClick={() => handleMomentClick(moment)}
            >
              <CardContent className="p-0">
                {/* Media Preview */}
                <div className="relative h-48 bg-gradient-to-br from-muted to-muted/50">
                  {moment.media_url ? (
                    <img 
                      src={moment.media_url} 
                      alt="Moment" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className={`
                      w-full h-full flex items-center justify-center
                      ${isLoversMode 
                        ? 'bg-gradient-to-br from-lovers-primary/20 to-lovers-secondary/20' 
                        : 'bg-gradient-to-br from-general-primary/20 to-general-secondary/20'
                      }
                    `}>
                      <span className="text-4xl">{isLoversMode ? '💕' : '✨'}</span>
                    </div>
                  )}
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  
                  {/* Time Remaining */}
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="glass text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      {getTimeRemaining(moment.expires_at)}
                    </Badge>
                  </div>
                  
                  {/* Privacy Icon */}
                  <div className="absolute top-2 left-2">
                    {moment.privacy_type === 'selected' && <Lock className="w-4 h-4 text-white/80" />}
                    {moment.privacy_type === 'everyone' && <Globe className="w-4 h-4 text-white/80" />}
                    {moment.privacy_type === 'all_friends' && <Users className="w-4 h-4 text-white/80" />}
                  </div>
                  
                  {/* Music Indicator */}
                  {moment.music_id && (
                    <div className="absolute bottom-12 right-2">
                      <div className="glass rounded-full p-2">
                        <Music className="w-4 h-4 text-white animate-pulse" />
                      </div>
                    </div>
                  )}
                  
                  {/* User Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <div className="flex items-center space-x-2">
                      <Avatar className="w-8 h-8 border-2 border-white/30">
                        <AvatarImage src={moment.profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {moment.user_id === currentUserId ? 'You' : moment.profile?.display_name?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {moment.user_id === currentUserId ? 'Your Moment' : moment.profile?.display_name || 'Friend'}
                        </p>
                        <p className="text-white/60 text-xs">
                          {formatDistanceToNow(new Date(moment.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Content */}
                {moment.content && (
                  <div className="p-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">{moment.content}</p>
                  </div>
                )}
                
                {/* Views Count (only for own moments) */}
                {moment.user_id === currentUserId && (
                  <div className="px-3 pb-3 flex items-center text-muted-foreground text-xs">
                    <Eye className="w-3 h-3 mr-1" />
                    <span>{moment.views_count || 0} views</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
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
            loadMoments();
            setShowCreateDialog(false);
          }}
          isLoversMode={isLoversMode}
        />

        {/* View Moment Dialog */}
        {selectedMoment && (
          <MomentViewer
            moment={selectedMoment}
            isOwner={selectedMoment.user_id === currentUserId}
            onClose={() => setSelectedMoment(null)}
            isLoversMode={isLoversMode}
          />
        )}
      </div>
    </div>
  );
};