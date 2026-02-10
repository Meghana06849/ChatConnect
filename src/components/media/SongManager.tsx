import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Music, Plus, Play, Pause, Upload, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Song {
  id: string;
  title: string;
  artist: string;
  file_url?: string;
  duration?: number;
  genre?: string;
  created_at: string;
}

const genres = [
  'Pop', 'Rock', 'Hip Hop', 'R&B', 'Country', 'Electronic', 
  'Classical', 'Jazz', 'Reggae', 'Blues', 'Folk', 'Alternative'
];

export const SongManager: React.FC = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add song form state
  const [newSong, setNewSong] = useState({
    title: '',
    artist: '',
    genre: '',
    file: null as File | null
  });

  useEffect(() => {
    loadSongs();
  }, []);

  const loadSongs = async () => {
    try {
      const { data, error } = await supabase
        .from('user_songs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSongs(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading songs",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setNewSong(prev => ({ ...prev, file }));
    }
  };

  const addSong = async () => {
    if (!newSong.title || !newSong.artist) {
      toast({
        title: "Missing information",
        description: "Please provide both title and artist",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    let fileUrl = null;

    try {
      // Upload file if provided
      if (newSong.file) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const fileExt = newSong.file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('songs')
          .upload(fileName, newSong.file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('songs')
          .getPublicUrl(fileName);
        
        fileUrl = data.publicUrl;
      }

      // Get user for database insert
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Add song to database
      const { error } = await supabase
        .from('user_songs')
        .insert({
          user_id: user.id,
          title: newSong.title,
          artist: newSong.artist,
          genre: newSong.genre || null,
          file_url: fileUrl,
        });

      if (error) throw error;

      toast({
        title: "Song added!",
        description: `"${newSong.title}" by ${newSong.artist} has been added to your collection.`,
      });

      setNewSong({ title: '', artist: '', genre: '', file: null });
      setShowAddDialog(false);
      loadSongs();
    } catch (error: any) {
      toast({
        title: "Error adding song",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const deleteSong = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_songs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Song deleted",
        description: "The song has been removed from your collection.",
      });

      loadSongs();
    } catch (error: any) {
      toast({
        title: "Error deleting song",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const togglePlay = (songId: string) => {
    if (currentlyPlaying === songId) {
      // Stop playback
      const existingAudio = document.getElementById(`audio-${songId}`) as HTMLAudioElement;
      if (existingAudio) {
        existingAudio.pause();
        existingAudio.remove();
      }
      setCurrentlyPlaying(null);
    } else {
      // Stop any currently playing audio
      if (currentlyPlaying) {
        const prev = document.getElementById(`audio-${currentlyPlaying}`) as HTMLAudioElement;
        if (prev) { prev.pause(); prev.remove(); }
      }

      const song = songs.find(s => s.id === songId);
      if (song?.file_url) {
        const audio = document.createElement('audio');
        audio.id = `audio-${songId}`;
        audio.src = song.file_url;
        audio.onended = () => {
          setCurrentlyPlaying(null);
          audio.remove();
        };
        audio.onerror = () => {
          toast({ title: "Playback error", description: "Could not play this song", variant: "destructive" });
          setCurrentlyPlaying(null);
          audio.remove();
        };
        document.body.appendChild(audio);
        audio.play();
        setCurrentlyPlaying(songId);
      } else {
        toast({ title: "No audio file", description: "This song has no audio file attached", variant: "destructive" });
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Music className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">My Music</h2>
        </div>
        
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-accent">
              <Plus className="w-4 h-4 mr-2" />
              Add Song
            </Button>
          </DialogTrigger>
          <DialogContent className="glass border-white/20">
            <DialogHeader>
              <DialogTitle>Add New Song</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={newSong.title}
                  onChange={(e) => setNewSong(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Song title"
                  className="glass border-white/20"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Artist</Label>
                <Input
                  value={newSong.artist}
                  onChange={(e) => setNewSong(prev => ({ ...prev, artist: e.target.value }))}
                  placeholder="Artist name"
                  className="glass border-white/20"
                />
              </div>

              <div className="space-y-2">
                <Label>Genre (Optional)</Label>
                <Select value={newSong.genre} onValueChange={(value) => setNewSong(prev => ({ ...prev, genre: value }))}>
                  <SelectTrigger className="glass border-white/20">
                    <SelectValue placeholder="Select genre" />
                  </SelectTrigger>
                  <SelectContent>
                    {genres.map(genre => (
                      <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Audio File (Optional)</Label>
                <div className="flex space-x-2">
                  <Input
                    type="file"
                    accept="audio/*"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="glass border-white/20"
                  />
                  {newSong.file && (
                    <Button variant="outline" onClick={() => setNewSong(prev => ({ ...prev, file: null }))}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex space-x-2">
                <Button 
                  onClick={addSong}
                  disabled={uploading}
                  className="flex-1 bg-gradient-to-r from-primary to-accent"
                >
                  {uploading ? 'Adding...' : 'Add Song'}
                </Button>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {songs.length === 0 ? (
        <Card className="glass border-white/20">
          <CardContent className="p-8 text-center">
            <Music className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No songs yet</h3>
            <p className="text-muted-foreground mb-4">Start building your music collection</p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Song
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {songs.map((song) => (
            <Card key={song.id} className="glass border-white/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => togglePlay(song.id)}
                      className="rounded-full"
                    >
                      {currentlyPlaying === song.id ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5" />
                      )}
                    </Button>
                    
                    <div>
                      <h4 className="font-semibold">{song.title}</h4>
                      <p className="text-sm text-muted-foreground">{song.artist}</p>
                      {song.genre && (
                        <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded-full">
                          {song.genre}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteSong(song.id)}
                    className="text-destructive hover:bg-destructive/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};