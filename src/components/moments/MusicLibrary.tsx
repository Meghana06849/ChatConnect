import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Play, Pause, Volume2, Download } from 'lucide-react';

interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  duration: number;
  category: 'song' | 'bgm' | 'sfx';
  mood: 'romantic' | 'chill' | 'hype' | 'playful' | 'dramatic';
  audioUrl?: string;
  waveform?: number[];
}

interface MusicLibraryProps {
  onSelectTrack: (track: MusicTrack) => void;
  selectedTrackId?: string;
}

// Expanded music library with more moods and categories
const EXPANDED_MUSIC_LIBRARY: MusicTrack[] = [
  // Romantic Songs
  { id: 'song-romantic-1', title: 'Sunset Hearts', artist: 'Aural Bloom', duration: 180, category: 'song', mood: 'romantic' },
  { id: 'song-romantic-2', title: 'Slow Spark', artist: 'Moonline', duration: 180, category: 'song', mood: 'romantic' },
  { id: 'song-romantic-3', title: 'Midnight Note', artist: 'Velvet Lane', duration: 174, category: 'song', mood: 'romantic' },
  { id: 'song-romantic-4', title: 'Eternal Moment', artist: 'Heart Strings', duration: 210, category: 'song', mood: 'romantic' },
  { id: 'song-romantic-5', title: 'Love\'s Whisper', artist: 'Soft Echo', duration: 195, category: 'song', mood: 'romantic' },

  // Chill Songs
  { id: 'song-chill-1', title: 'Ocean Breeze', artist: 'Wave Theory', duration: 240, category: 'song', mood: 'chill' },
  { id: 'song-chill-2', title: 'Sunset Lounge', artist: 'Jazz Vibes', duration: 180, category: 'song', mood: 'chill' },
  { id: 'song-chill-3', title: 'Summer Days', artist: 'Indie Folk', duration: 210, category: 'song', mood: 'chill' },
  { id: 'song-chill-4', title: 'Peaceful Mind', artist: 'Zen Flow', duration: 200, category: 'song', mood: 'chill' },

  // Hype Songs
  { id: 'song-hype-1', title: 'Neon Crush', artist: 'Pulse Echo', duration: 156, category: 'song', mood: 'hype' },
  { id: 'song-hype-2', title: 'Golden Pulse', artist: 'Nova Hearts', duration: 144, category: 'song', mood: 'hype' },
  { id: 'song-hype-3', title: 'Electric Dreams', artist: 'Night Riders', duration: 180, category: 'song', mood: 'hype' },
  { id: 'song-hype-4', title: 'Party Time', artist: 'Beat Makers', duration: 200, category: 'song', mood: 'hype' },

  // Playful Songs
  { id: 'song-playful-1', title: 'Love\'s Game', artist: 'Happy Vibes', duration: 150, category: 'song', mood: 'playful' },
  { id: 'song-playful-2', title: 'Giggle Time', artist: 'Silly Moods', duration: 120, category: 'song', mood: 'playful' },

  // Romantic BGM
  { id: 'bgm-romantic-1', title: 'Soft Rain Room', artist: 'Ambient Lab', duration: 1800, category: 'bgm', mood: 'romantic' },
  { id: 'bgm-romantic-2', title: 'Dreamy Piano Bed', artist: 'Ivory Echo', duration: 1800, category: 'bgm', mood: 'romantic' },
  { id: 'bgm-romantic-3', title: 'Candlelight', artist: 'Ambient Dreams', duration: 1800, category: 'bgm', mood: 'romantic' },

  // Chill BGM
  { id: 'bgm-chill-1', title: 'Cafe Breeze', artist: 'Loft Tones', duration: 1800, category: 'bgm', mood: 'chill' },
  { id: 'bgm-chill-2', title: 'Ocean Air Loop', artist: 'Blue Current', duration: 1800, category: 'bgm', mood: 'chill' },
  { id: 'bgm-chill-3', title: 'Forest Whispers', artist: 'Nature Sounds', duration: 1800, category: 'bgm', mood: 'chill' },

  // Hype BGM
  { id: 'bgm-hype-1', title: 'Night Drive Pad', artist: 'Neon Drift', duration: 1800, category: 'bgm', mood: 'hype' },
  { id: 'bgm-hype-2', title: 'Urban Energy', artist: 'City Beats', duration: 1800, category: 'bgm', mood: 'hype' },

  // Dramatic BGM
  { id: 'bgm-dramatic-1', title: 'Epic Moments', artist: 'Cinema Lab', duration: 1800, category: 'bgm', mood: 'dramatic' },
  { id: 'bgm-dramatic-2', title: 'Cinematic Journey', artist: 'Film Scores', duration: 1800, category: 'bgm', mood: 'dramatic' },
];

export const MusicLibrary: React.FC<MusicLibraryProps> = ({ onSelectTrack, selectedTrackId }) => {
  const [category, setCategory] = useState<'all' | 'song' | 'bgm' | 'sfx'>('all');
  const [mood, setMood] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const filteredTracks = useMemo(() => {
    return EXPANDED_MUSIC_LIBRARY.filter(track => {
      const categoryMatch = category === 'all' || track.category === category;
      const moodMatch = mood === 'all' || track.mood === mood;
      const searchMatch = !searchQuery.trim() || 
        `${track.title} ${track.artist}`.toLowerCase().includes(searchQuery.toLowerCase());
      return categoryMatch && moodMatch && searchMatch;
    });
  }, [category, mood, searchQuery]);

  const moods = useMemo(() => {
    const uniqueMoods = new Set(EXPANDED_MUSIC_LIBRARY.map(t => t.mood));
    return Array.from(uniqueMoods);
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
      <div className="mb-4 flex items-center gap-2">
        <Music className="w-5 h-5 text-lovers-primary" />
        <h3 className="font-semibold">Music Library</h3>
      </div>

      {/* Search */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search songs..."
        className="w-full mb-3 rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white placeholder-white/50 outline-none"
      />

      {/* Category Filter */}
      <div className="mb-3 flex gap-2">
        {(['all', 'song', 'bgm'] as const).map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              category === cat
                ? 'bg-lovers-primary text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            {cat === 'all' ? 'All' : cat === 'song' ? 'Songs' : 'BGM'}
          </button>
        ))}
      </div>

      {/* Mood Filter */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setMood('all')}
          className={`rounded-full px-2 py-1 text-xs transition ${
            mood === 'all'
              ? 'bg-white/20 text-white'
              : 'bg-white/10 text-white/70 hover:bg-white/15'
          }`}
        >
          All Moods
        </button>
        {moods.map(m => (
          <button
            key={m}
            onClick={() => setMood(m)}
            className={`rounded-full px-2 py-1 text-xs transition capitalize ${
              mood === m
                ? 'bg-lovers-primary/50 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/15'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Track List */}
      <div className="max-h-96 overflow-y-auto space-y-2">
        <AnimatePresence>
          {filteredTracks.map((track, idx) => (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: idx * 0.02 }}
              onClick={() => onSelectTrack(track)}
              className={`group rounded-lg border p-2 cursor-pointer transition ${
                selectedTrackId === track.id
                  ? 'border-lovers-primary bg-lovers-primary/20'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{track.title}</p>
                  <p className="text-xs text-white/60 truncate">{track.artist}</p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-xs text-white/50 whitespace-nowrap">
                    {formatDuration(track.duration)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPlayingId(playingId === track.id ? null : track.id);
                    }}
                    className="rounded-full p-1.5 bg-white/10 hover:bg-lovers-primary/50 transition opacity-0 group-hover:opacity-100"
                  >
                    {playingId === track.id ? (
                      <Pause className="w-3 h-3" />
                    ) : (
                      <Play className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
              
              {/* Category Badge */}
              <div className="mt-1 flex gap-1">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/70">
                  {track.category === 'bgm' ? 'Background' : 'Song'}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-lovers-primary/20 text-lovers-primary capitalize">
                  {track.mood}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredTracks.length === 0 && (
        <div className="py-8 text-center text-white/50">
          <p className="text-sm">No tracks found</p>
        </div>
      )}

      <audio ref={audioRef} />
    </div>
  );
};

export default MusicLibrary;
