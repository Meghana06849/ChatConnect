import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Music, Play, Pause, Heart, Plus, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Song {
  id: string;
  title: string;
  artist: string;
  url?: string;
  added_by: string;
  mood: string;
  created_at: string;
}

export const SharedPlaylist: React.FC = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [newSong, setNewSong] = useState({ title: '', artist: '', url: '', mood: 'love' });
  const [currentPlaying, setCurrentPlaying] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const moods = [
    { value: 'love', label: '💕 Love', color: 'text-pink-500' },
    { value: 'happy', label: '😊 Happy', color: 'text-yellow-500' },
    { value: 'chill', label: '😌 Chill', color: 'text-blue-500' },
    { value: 'romantic', label: '🌹 Romantic', color: 'text-red-500' },
    { value: 'dreamy', label: '✨ Dreamy', color: 'text-purple-500' }
  ];

  useEffect(() => {
    loadPlaylist();
  }, []);

  const loadPlaylist = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('dream_features')
        .select('*')
        .eq('feature_type', 'shared_playlist')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const songData = data?.map(item => ({
        id: item.id,
        title: item.data.title,
        artist: item.data.artist,
        url: item.data.url,
        added_by: item.user_id,
        mood: item.data.mood,
        created_at: item.created_at
      })) || [];

      setSongs(songData);
    } catch (error: any) {
      toast({
        title: "Error loading playlist",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addSong = async () => {
    if (!newSong.title.trim() || !newSong.artist.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter both song title and artist.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('dream_features')
        .insert([{
          user_id: user.id,
          feature_type: 'shared_playlist',
          data: {
            title: newSong.title,
            artist: newSong.artist,
            url: newSong.url,
            mood: newSong.mood,
            created_at: new Date().toISOString()
          }
        }]);

      if (error) throw error;

      toast({
        title: "Song added! 🎵",
        description: `${newSong.title} by ${newSong.artist} added to your playlist.`,
      });

      setNewSong({ title: '', artist: '', url: '', mood: 'love' });
      loadPlaylist();
    } catch (error: any) {
      toast({
        title: "Error adding song",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePlay = (songId: string) => {
    if (currentPlaying === songId) {
      setCurrentPlaying(null);
    } else {
      setCurrentPlaying(songId);
      // In a real app, you'd integrate with music APIs here
      toast({
        title: "Playing song 🎵",
        description: "Music integration would play here!",
      });
    }
  };

  const getMoodEmoji = (mood: string) => {
    const moodData = moods.find(m => m.value === mood);
    return moodData?.label.split(' ')[0] || '🎵';
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Music className="w-8 h-8 text-lovers-primary animate-pulse" />
          <h2 className="text-2xl font-bold">Shared Playlist</h2>
          <Heart className="w-8 h-8 text-lovers-primary animate-heart-beat" />
        </div>
        <p className="text-muted-foreground">
          Build your perfect playlist together. Add songs that match your mood and moments! 🎵
        </p>
      </div>

      {/* Add New Song */}
      <Card className="glass border-lovers-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="w-5 h-5 text-lovers-primary" />
            <span>Add a Song</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Song Title</Label>
              <Input
                id="title"
                placeholder="Perfect"
                value={newSong.title}
                onChange={(e) => setNewSong(prev => ({ ...prev, title: e.target.value }))}
                className="glass border-white/20"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="artist">Artist</Label>
              <Input
                id="artist"
                placeholder="Ed Sheeran"
                value={newSong.artist}
                onChange={(e) => setNewSong(prev => ({ ...prev, artist: e.target.value }))}
                className="glass border-white/20"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="url">Spotify/YouTube URL (optional)</Label>
            <Input
              id="url"
              placeholder="https://open.spotify.com/track/..."
              value={newSong.url}
              onChange={(e) => setNewSong(prev => ({ ...prev, url: e.target.value }))}
              className="glass border-white/20"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Mood</Label>
            <div className="flex flex-wrap gap-2">
              {moods.map((mood) => (
                <Button
                  key={mood.value}
                  variant={newSong.mood === mood.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNewSong(prev => ({ ...prev, mood: mood.value }))}
                  className={newSong.mood === mood.value ? 'bg-lovers-primary/20 border-lovers-primary' : ''}
                >
                  {mood.label}
                </Button>
              ))}
            </div>
          </div>
          
          <Button
            onClick={addSong}
            disabled={loading}
            className="w-full bg-gradient-to-r from-lovers-primary to-lovers-secondary hover:opacity-90"
          >
            {loading ? 'Adding Song...' : '🎵 Add to Playlist'}
          </Button>
        </CardContent>
      </Card>

      {/* Playlist */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center space-x-2">
          <Music className="w-5 h-5 text-lovers-primary" />
          <span>Your Playlist ({songs.length} songs)</span>
        </h3>
        
        {songs.length === 0 ? (
          <Card className="glass border-white/20">
            <CardContent className="text-center py-8">
              <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Your playlist is empty. Add your first song!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {songs.map((song, index) => (
              <Card
                key={song.id}
                className={`glass transition-all duration-300 hover:border-lovers-primary/40 ${
                  currentPlaying === song.id ? 'border-lovers-primary/60 bg-lovers-primary/5' : 'border-white/20'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-mono text-muted-foreground w-8">
                          #{index + 1}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => togglePlay(song.id)}
                          className="h-8 w-8 p-0"
                        >
                          {currentPlaying === song.id ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      
                      <div className="flex-1">
                        <p className="font-medium">{song.title}</p>
                        <p className="text-sm text-muted-foreground">{song.artist}</p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-lovers-primary/20 text-lovers-primary text-xs">
                          {getMoodEmoji(song.mood)}
                        </Badge>
                        
                        {song.url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(song.url, '_blank')}
                            className="h-8 w-8 p-0"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Integration Notice */}
      <Card className="glass border-white/20">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground">
            🚀 <strong>Coming Soon:</strong> Direct Spotify & Apple Music integration for seamless playback!
          </p>
        </CardContent>
      </Card>
    </div>
  );
};