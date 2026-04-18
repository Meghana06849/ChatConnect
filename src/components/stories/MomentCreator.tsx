import React, { useState, useRef, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Camera, Image as ImageIcon, Music, Lock, Users, Globe, 
  Sparkles, Heart, Upload, X, Edit3, Play, Pause
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ImageEditor } from '@/components/media/ImageEditor';

interface MomentCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  isLoversMode: boolean;
}

interface Song {
  id: string;
  title: string;
  artist: string;
  file_url?: string;
  genre?: string | null;
}

const STARTER_SONGS: Array<{ title: string; artist: string; genre: string }> = [
  { title: 'Golden Hour', artist: 'JVKE', genre: 'Trending' },
  { title: 'Calm Down', artist: 'Rema', genre: 'Trending' },
  { title: 'Heat Waves', artist: 'Glass Animals', genre: 'Trending' },
  { title: 'Until I Found You', artist: 'Stephen Sanchez', genre: 'Trending' },
  { title: 'Kesariya', artist: 'Arijit Singh', genre: 'Movie' },
  { title: 'Chaleya', artist: 'Arijit Singh', genre: 'Movie' },
  { title: 'Tum Hi Ho', artist: 'Arijit Singh', genre: 'Movie' },
  { title: 'Raatan Lambiyan', artist: 'Jubin Nautiyal', genre: 'Movie' },
  { title: 'Heeriye', artist: 'Jasleen Royal', genre: 'Movie' },
  { title: 'Teri Baaton Mein Aisa Uljha Jiya', artist: 'Raghav Chaitanya', genre: 'Movie' },
  { title: 'Agar Tum Saath Ho', artist: 'Alka Yagnik', genre: 'Movie' },
  { title: 'Apna Bana Le', artist: 'Arijit Singh', genre: 'Movie' },
  { title: 'Midnight Confession', artist: 'Private Room', genre: 'Private' },
  { title: 'Only Us Tonight', artist: 'Secret Echo', genre: 'Private' },
  { title: 'Whispered Hearts', artist: 'Velvet Note', genre: 'Private' },
  { title: 'Soft Lights', artist: 'Moon Diary', genre: 'Private' },
  { title: 'Hidden Letters', artist: 'Quiet Bloom', genre: 'Private' },
  { title: 'After Midnight', artist: 'Noir Pulse', genre: 'Private' },
  { title: 'Velvet Silence', artist: 'Hush Avenue', genre: 'Private' },
  { title: 'Stay A Little', artist: 'Private Skyline', genre: 'Private' },
];

interface Friend {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

const extractErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null) {
    const maybeMessage = (error as { message?: string }).message;
    if (typeof maybeMessage === 'string' && maybeMessage.trim().length > 0) {
      return maybeMessage;
    }
  }
  return 'Failed to create moment';
};

export const MomentCreator: React.FC<MomentCreatorProps> = ({ 
  isOpen, 
  onClose, 
  onCreated,
  isLoversMode 
}) => {
  const { profile } = useProfile();
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [privacyType, setPrivacyType] = useState('all_friends');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [excludedUsers, setExcludedUsers] = useState<string[]>([]);
  const [includedUsers, setIncludedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [activeTab, setActiveTab] = useState('content');
  const [songFilter, setSongFilter] = useState<'all' | 'trending' | 'movie' | 'private'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const groupedSongs = useMemo(() => {
    const trending = songs.filter((song) => (song.genre || '').toLowerCase() === 'trending');
    const movie = songs.filter((song) => (song.genre || '').toLowerCase() === 'movie');
    const privateVibes = songs.filter((song) => (song.genre || '').toLowerCase() === 'private');
    const other = songs.filter((song) => !['trending', 'movie', 'private'].includes((song.genre || '').toLowerCase()));
    return { trending, movie, privateVibes, other };
  }, [songs]);

  const visibleSongGroups = useMemo(() => {
    if (songFilter === 'trending') {
      return { trending: groupedSongs.trending, movie: [], privateVibes: [], other: [] };
    }
    if (songFilter === 'movie') {
      return { trending: [], movie: groupedSongs.movie, privateVibes: [], other: [] };
    }
    if (songFilter === 'private') {
      return { trending: [], movie: [], privateVibes: groupedSongs.privateVibes, other: [] };
    }
    return groupedSongs;
  }, [songFilter, groupedSongs]);

  useEffect(() => {
    if (isOpen) {
      loadSongs();
      loadFriends();
    }
  }, [isOpen]);

  const loadSongs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_songs')
        .select('id, title, artist, file_url, genre')
        .order('created_at', { ascending: false });

      const existingSongs = data || [];

      if (existingSongs.length > 0) {
        const existingKeys = new Set(
          existingSongs.map((song) => `${song.title.toLowerCase()}::${song.artist.toLowerCase()}`)
        );

        const missingStarterSongs = STARTER_SONGS.filter((song) => {
          const key = `${song.title.toLowerCase()}::${song.artist.toLowerCase()}`;
          return !existingKeys.has(key);
        });

        if (missingStarterSongs.length > 0) {
          const { error: topUpError } = await supabase
            .from('user_songs')
            .insert(
              missingStarterSongs.map((song) => ({
                user_id: user.id,
                title: song.title,
                artist: song.artist,
                genre: song.genre,
              }))
            );

          if (topUpError) throw topUpError;

          const { data: refreshedSongs } = await supabase
            .from('user_songs')
            .select('id, title, artist, file_url, genre')
            .order('created_at', { ascending: false });

          setSongs(refreshedSongs || []);
          return;
        }

        setSongs(existingSongs);
        return;
      }

      const { error: seedError } = await supabase
        .from('user_songs')
        .insert(
          STARTER_SONGS.map((song) => ({
            user_id: user.id,
            title: song.title,
            artist: song.artist,
            genre: song.genre,
          }))
        );

      if (seedError) throw seedError;

      const { data: seededSongs } = await supabase
        .from('user_songs')
        .select('id, title, artist, file_url, genre')
        .order('created_at', { ascending: false });

      setSongs(seededSongs || []);
    } catch (error) {
      console.error('Error loading songs:', error);
    }
  };

  const loadFriends = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch contacts bidirectionally (both directions)
      const { data: sentContacts } = await supabase
        .from('contacts')
        .select('contact_user_id')
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      const { data: receivedContacts } = await supabase
        .from('contacts')
        .select('user_id')
        .eq('contact_user_id', user.id)
        .eq('status', 'accepted');

      const friendIds = [
        ...(sentContacts || []).map(c => c.contact_user_id),
        ...(receivedContacts || []).map(c => c.user_id),
      ].filter((id, i, arr) => arr.indexOf(id) === i); // deduplicate

      if (friendIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, username, avatar_url')
          .in('user_id', friendIds);

        setFriends((profiles || []).map(p => ({
          user_id: p.user_id,
          display_name: p.display_name,
          username: p.username,
          avatar_url: p.avatar_url,
        })));
      }
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setMediaFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setMediaPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
  };

  const toggleExcludedUser = (userId: string) => {
    setExcludedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleIncludedUser = (userId: string) => {
    setIncludedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreate = async () => {
    if (!content.trim() && !mediaFile) {
      toast({
        title: "Add content",
        description: "Please add some text or media to your moment",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let mediaUrl = null;
      let mediaType = 'text';

      // Upload media if present
      if (mediaFile) {
        const fileExt = mediaFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(fileName, mediaFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('media')
          .getPublicUrl(fileName);
        
        mediaUrl = urlData.publicUrl;
        mediaType = mediaFile.type.startsWith('video') ? 'video' : 'image';
      }

      // Create moment
      const partnerId = profile?.lovers_partner_id || null;
      const isPartnerScoped = isLoversMode && Boolean(partnerId);
      const effectivePrivacy = isPartnerScoped ? 'selected' : privacyType;
      const effectiveAudienceMode = isLoversMode ? 'lovers' : 'general';
      const effectiveIncludedUsers = isPartnerScoped
        ? [partnerId as string]
        : includedUsers;
      const effectiveExcludedUsers = isPartnerScoped ? [] : excludedUsers;

      const insertPayload = {
        user_id: user.id,
        content: content.trim() || null,
        media_url: mediaUrl,
        media_type: mediaType,
        music_id: selectedSong?.id || null,
        privacy_type: effectivePrivacy,
        audience_mode: effectiveAudienceMode,
        excluded_users: effectiveExcludedUsers,
        included_users: effectiveIncludedUsers,
      };

      let { error } = await supabase
        .from('moments')
        .insert(insertPayload);

      // Backward compatibility: some environments may not have the audience_mode column yet.
      if (error && /audience_mode/i.test(error.message || '')) {
        const { audience_mode: _audienceMode, ...legacyPayload } = insertPayload;
        const legacyInsert = await supabase.from('moments').insert(legacyPayload);
        error = legacyInsert.error;
      }

      if (error) throw error;

      toast({
        title: "Moment shared! ✨",
        description: "Your moment is now visible to your friends"
      });

      // Reset form
      setContent('');
      setMediaFile(null);
      setMediaPreview(null);
      setSelectedSong(null);
      setPrivacyType('all_friends');
      setExcludedUsers([]);
      setIncludedUsers([]);
      
      onCreated();
    } catch (error) {
      toast({
        title: "Error",
        description: extractErrorMessage(error),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="glass border-white/20 max-w-lg max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Sparkles className={`w-5 h-5 ${isLoversMode ? 'text-lovers-primary' : 'text-general-primary'}`} />
              <span>Create Moment</span>
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 glass">
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="music">Music</TabsTrigger>
              <TabsTrigger value="privacy">Privacy</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[400px] mt-4">
              <TabsContent value="content" className="space-y-4 mt-0">
                {/* Media Preview */}
                {mediaPreview ? (
                  <div className="relative">
                    <img 
                      src={mediaPreview} 
                      alt="Preview" 
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <div className="absolute top-2 right-2 flex space-x-2">
                      <Button 
                        size="icon" 
                        variant="secondary"
                        className="glass"
                        onClick={() => setShowImageEditor(true)}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="destructive"
                        onClick={removeMedia}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div 
                    className={`
                      h-48 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all
                      ${isLoversMode 
                        ? 'border-lovers-primary/30 hover:border-lovers-primary hover:bg-lovers-primary/5' 
                        : 'border-general-primary/30 hover:border-general-primary hover:bg-general-primary/5'
                      }
                    `}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className={`w-12 h-12 mb-2 ${isLoversMode ? 'text-lovers-primary/50' : 'text-general-primary/50'}`} />
                    <p className="text-muted-foreground text-sm">Click to add photo or video</p>
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      accept="image/*,video/*" 
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </div>
                )}

                {/* Text Content */}
                <div className="space-y-2">
                  <Label>Caption</Label>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={isLoversMode ? "Share something special... 💕" : "What's on your mind?"}
                    className="glass border-white/20 min-h-[100px]"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground text-right">{content.length}/500</p>
                </div>
              </TabsContent>

              <TabsContent value="music" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label className="flex items-center space-x-2">
                    <Music className="w-4 h-4" />
                    <span>Add Music</span>
                  </Label>

                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'trending', label: 'Trending' },
                      { id: 'movie', label: 'Movie' },
                      { id: 'private', label: 'Private' },
                    ].map((chip) => (
                      <Button
                        key={chip.id}
                        type="button"
                        size="sm"
                        variant={songFilter === chip.id ? 'default' : 'outline'}
                        className={songFilter === chip.id ? (isLoversMode ? 'btn-lovers' : 'btn-general') : ''}
                        onClick={() => setSongFilter(chip.id as 'all' | 'trending' | 'movie' | 'private')}
                      >
                        {chip.label}
                      </Button>
                    ))}
                  </div>
                  
                  {selectedSong ? (
                    <Card className="glass border-white/20">
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`
                            w-10 h-10 rounded-full flex items-center justify-center
                            ${isLoversMode ? 'bg-lovers-primary/20' : 'bg-general-primary/20'}
                          `}>
                            <Music className={`w-5 h-5 ${isLoversMode ? 'text-lovers-primary' : 'text-general-primary'}`} />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{selectedSong.title}</p>
                            <p className="text-xs text-muted-foreground">{selectedSong.artist}</p>
                            {selectedSong.genre && (
                              <p className="text-[10px] uppercase tracking-wide text-muted-foreground/80 mt-1">{selectedSong.genre}</p>
                            )}
                          </div>
                        </div>
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => setSelectedSong(null)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {songs.length > 0 ? (
                        <>
                          {visibleSongGroups.trending.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Trending Music</p>
                              {visibleSongGroups.trending.map(song => (
                                <Card 
                                  key={song.id}
                                  className="glass border-white/20 cursor-pointer hover:bg-white/5 transition-colors"
                                  onClick={() => setSelectedSong(song)}
                                >
                                  <CardContent className="p-3 flex items-center space-x-3">
                                    <Play className="w-4 h-4 text-muted-foreground" />
                                    <div>
                                      <p className="font-medium text-sm">{song.title}</p>
                                      <p className="text-xs text-muted-foreground">{song.artist}</p>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}

                          {visibleSongGroups.movie.length > 0 && (
                            <div className="space-y-2 pt-2">
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Movie Songs</p>
                              {visibleSongGroups.movie.map(song => (
                                <Card 
                                  key={song.id}
                                  className="glass border-white/20 cursor-pointer hover:bg-white/5 transition-colors"
                                  onClick={() => setSelectedSong(song)}
                                >
                                  <CardContent className="p-3 flex items-center space-x-3">
                                    <Play className="w-4 h-4 text-muted-foreground" />
                                    <div>
                                      <p className="font-medium text-sm">{song.title}</p>
                                      <p className="text-xs text-muted-foreground">{song.artist}</p>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}

                          {visibleSongGroups.privateVibes.length > 0 && (
                            <div className="space-y-2 pt-2">
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Private Songs</p>
                              {visibleSongGroups.privateVibes.map(song => (
                                <Card 
                                  key={song.id}
                                  className="glass border-white/20 cursor-pointer hover:bg-white/5 transition-colors"
                                  onClick={() => setSelectedSong(song)}
                                >
                                  <CardContent className="p-3 flex items-center space-x-3">
                                    <Play className="w-4 h-4 text-muted-foreground" />
                                    <div>
                                      <p className="font-medium text-sm">{song.title}</p>
                                      <p className="text-xs text-muted-foreground">{song.artist}</p>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}

                          {visibleSongGroups.other.length > 0 && (
                            <div className="space-y-2 pt-2">
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">More Songs</p>
                              {visibleSongGroups.other.map(song => (
                                <Card 
                                  key={song.id}
                                  className="glass border-white/20 cursor-pointer hover:bg-white/5 transition-colors"
                                  onClick={() => setSelectedSong(song)}
                                >
                                  <CardContent className="p-3 flex items-center space-x-3">
                                    <Play className="w-4 h-4 text-muted-foreground" />
                                    <div>
                                      <p className="font-medium text-sm">{song.title}</p>
                                      <p className="text-xs text-muted-foreground">{song.artist}</p>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}

                          {visibleSongGroups.trending.length === 0 &&
                            visibleSongGroups.movie.length === 0 &&
                            visibleSongGroups.privateVibes.length === 0 &&
                            visibleSongGroups.other.length === 0 && (
                              <div className="text-center py-6">
                                <p className="text-sm text-muted-foreground">No songs found in this category.</p>
                              </div>
                            )}
                        </>
                      ) : (
                        <div className="text-center py-8">
                          <Music className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
                          <p className="text-muted-foreground text-sm">Preparing your music library...</p>
                          <p className="text-xs text-muted-foreground mt-1">Please reopen this tab in a moment</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="privacy" className="space-y-4 mt-0">
                <div className="space-y-4">
                  <Label>Who can see this moment?</Label>
                  <RadioGroup value={privacyType} onValueChange={setPrivacyType}>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3 p-3 glass rounded-lg">
                        <RadioGroupItem value="all_friends" id="all_friends" />
                        <Label htmlFor="all_friends" className="flex items-center space-x-2 cursor-pointer flex-1">
                          <Users className="w-4 h-4" />
                          <div>
                            <p className="font-medium">All Friends</p>
                            <p className="text-xs text-muted-foreground">Visible to all your friends</p>
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 glass rounded-lg">
                        <RadioGroupItem value="selected" id="selected" />
                        <Label htmlFor="selected" className="flex items-center space-x-2 cursor-pointer flex-1">
                          <Lock className="w-4 h-4" />
                          <div>
                            <p className="font-medium">Selected Friends Only</p>
                            <p className="text-xs text-muted-foreground">Only specific friends can see</p>
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 glass rounded-lg">
                        <RadioGroupItem value="everyone" id="everyone" />
                        <Label htmlFor="everyone" className="flex items-center space-x-2 cursor-pointer flex-1">
                          <Globe className="w-4 h-4" />
                          <div>
                            <p className="font-medium">Everyone</p>
                            <p className="text-xs text-muted-foreground">Public to all users</p>
                          </div>
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>

                  {/* Friend Selection */}
                  {privacyType === 'all_friends' && friends.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Exclude specific friends (optional)</Label>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {friends.map(friend => (
                          <div 
                            key={friend.user_id}
                            className="flex items-center space-x-3 p-2 glass rounded-lg"
                          >
                            <Checkbox
                              checked={excludedUsers.includes(friend.user_id)}
                              onCheckedChange={() => toggleExcludedUser(friend.user_id)}
                            />
                            <Avatar className="w-8 h-8">
                              <AvatarFallback>{friend.display_name?.[0] || 'F'}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{friend.display_name || friend.username}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {privacyType === 'selected' && (
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Select friends who can see</Label>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {friends.map(friend => (
                          <div 
                            key={friend.user_id}
                            className="flex items-center space-x-3 p-2 glass rounded-lg"
                          >
                            <Checkbox
                              checked={includedUsers.includes(friend.user_id)}
                              onCheckedChange={() => toggleIncludedUser(friend.user_id)}
                            />
                            <Avatar className="w-8 h-8">
                              <AvatarFallback>{friend.display_name?.[0] || 'F'}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{friend.display_name || friend.username}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <div className="flex space-x-2 pt-4 border-t border-white/10">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleCreate}
              disabled={loading || (!content.trim() && !mediaFile)}
              className={`flex-1 ${isLoversMode ? 'btn-lovers' : 'btn-general'}`}
            >
              {loading ? 'Sharing...' : 'Share Moment'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Editor */}
      <ImageEditor 
        isOpen={showImageEditor} 
        onClose={() => setShowImageEditor(false)}
        onSave={(url) => {
          setMediaPreview(url);
          setShowImageEditor(false);
        }}
      />
    </>
  );
};