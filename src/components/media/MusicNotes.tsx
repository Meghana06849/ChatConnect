import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Music, Plus, Play, Pause, Heart, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MusicNote {
  id: string;
  song: string;
  artist: string;
  note: string;
  user: {
    name: string;
    avatar?: string;
  };
  timestamp: Date;
  likes: number;
  isLiked: boolean;
}

export const MusicNotes: React.FC = () => {
  const [notes, setNotes] = useState<MusicNote[]>([]);
  const [newNote, setNewNote] = useState({ song: '', artist: '', note: '' });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { toast } = useToast();

  // Sample data - replace with real data from backend
  useEffect(() => {
    const sampleNotes: MusicNote[] = [
      {
        id: '1',
        song: 'Perfect',
        artist: 'Ed Sheeran',
        note: 'This song reminds me of our first dance! 💕',
        user: { name: 'Alex', avatar: undefined },
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        likes: 12,
        isLiked: true
      },
      {
        id: '2',
        song: 'Blinding Lights',
        artist: 'The Weeknd',
        note: 'Perfect workout music! Who else loves this?',
        user: { name: 'Jordan', avatar: undefined },
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        likes: 8,
        isLiked: false
      }
    ];
    setNotes(sampleNotes);
  }, []);

  const addMusicNote = () => {
    if (!newNote.song || !newNote.artist || !newNote.note) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const note: MusicNote = {
      id: Date.now().toString(),
      song: newNote.song,
      artist: newNote.artist,
      note: newNote.note,
      user: { name: 'You' },
      timestamp: new Date(),
      likes: 0,
      isLiked: false
    };

    setNotes(prev => [note, ...prev]);
    setNewNote({ song: '', artist: '', note: '' });
    setShowAddDialog(false);

    toast({
      title: "Music note shared! 🎵",
      description: "Your friends can now see what you're listening to",
    });
  };

  const toggleLike = (noteId: string) => {
    setNotes(prev => prev.map(note => {
      if (note.id === noteId) {
        return {
          ...note,
          isLiked: !note.isLiked,
          likes: note.isLiked ? note.likes - 1 : note.likes + 1
        };
      }
      return note;
    }));
  };

  const formatTime = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Music className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">Music Notes</h2>
        </div>
        
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-accent">
              <Plus className="w-4 h-4 mr-2" />
              Share Music
            </Button>
          </DialogTrigger>
          <DialogContent className="glass border-white/20">
            <DialogHeader>
              <DialogTitle>Share What You're Listening To</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Input
                  placeholder="Song title"
                  value={newNote.song}
                  onChange={(e) => setNewNote(prev => ({ ...prev, song: e.target.value }))}
                  className="glass border-white/20"
                />
              </div>
              
              <div className="space-y-2">
                <Input
                  placeholder="Artist name"
                  value={newNote.artist}
                  onChange={(e) => setNewNote(prev => ({ ...prev, artist: e.target.value }))}
                  className="glass border-white/20"
                />
              </div>

              <div className="space-y-2">
                <textarea
                  placeholder="What do you think about this song?"
                  value={newNote.note}
                  onChange={(e) => setNewNote(prev => ({ ...prev, note: e.target.value }))}
                  className="w-full p-3 glass border-white/20 rounded-lg resize-none h-20"
                />
              </div>

              <div className="flex space-x-2">
                <Button 
                  onClick={addMusicNote}
                  className="flex-1 bg-gradient-to-r from-primary to-accent"
                >
                  Share Note
                </Button>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Music Notes Feed */}
      <div className="space-y-4">
        {notes.length === 0 ? (
          <Card className="glass border-white/20">
            <CardContent className="p-8 text-center">
              <Music className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No music notes yet</h3>
              <p className="text-muted-foreground mb-4">Share what you're listening to with friends</p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Share Your First Song
              </Button>
            </CardContent>
          </Card>
        ) : (
          notes.map((note) => (
            <Card key={note.id} className="glass border-white/20">
              <CardContent className="p-4">
                <div className="flex items-start space-x-4">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white">
                      {note.user.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{note.user.name}</p>
                        <p className="text-sm text-muted-foreground">{formatTime(note.timestamp)}</p>
                      </div>
                    </div>

                    {/* Song Info */}
                    <div className="bg-primary/10 rounded-lg p-3 border border-primary/20">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-primary/20 rounded-full">
                          <Music className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{note.song}</p>
                          <p className="text-sm text-muted-foreground">{note.artist}</p>
                        </div>
                        <Button size="icon" variant="ghost" className="ml-auto">
                          <Play className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Note */}
                    <p className="text-sm">{note.note}</p>

                    {/* Actions */}
                    <div className="flex items-center space-x-4">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleLike(note.id)}
                        className={`${note.isLiked ? 'text-red-500' : 'text-muted-foreground'}`}
                      >
                        <Heart className={`w-4 h-4 mr-1 ${note.isLiked ? 'fill-current' : ''}`} />
                        {note.likes}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};