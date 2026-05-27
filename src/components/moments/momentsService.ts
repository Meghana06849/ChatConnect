import { supabase } from '@/integrations/supabase/client';

export interface MomentRecord {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  createdAt: string;
  mediaType: string;
  url: string;
  storagePath?: string; // Path in Supabase storage
  privacy: 'public' | 'friends' | 'specific';
  specificUsers?: string[];
  editMeta?: unknown;
  music?: unknown;
  reactions?: Array<{ emoji: string; userId: string; createdAt: string }>;
  replies?: Array<{ text: string; userId: string; createdAt: string }>;
  mode?: 'general' | 'lovers';
}

const STORAGE_KEY = 'chatconnect.moments.v1';
const BUCKET_NAME = 'moments-media';

const SEED_MOMENTS: MomentRecord[] = [
  {
    id: 'seed-1',
    userId: 'friend-1',
    username: 'alex',
    avatar: '',
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    mediaType: 'image/jpeg',
    url: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=720&q=80',
    privacy: 'friends',
  },
  {
    id: 'seed-2',
    userId: 'friend-2',
    username: 'sam',
    avatar: '',
    createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    mediaType: 'image/jpeg',
    url: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=720&q=80',
    privacy: 'public',
  },
];

function readStorage(mode: 'general' | 'lovers' = 'general'): MomentRecord[] {
  try {
    const key = `${STORAGE_KEY}.${mode}`;
    const raw = localStorage.getItem(key);
    if (!raw) {
      // Seed only for general mode by default
      const seed = mode === 'general' ? SEED_MOMENTS : [];
      localStorage.setItem(key, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return mode === 'general' ? SEED_MOMENTS : [];
  }
}

function writeStorage(moments: MomentRecord[]) {
  // default write to general if no mode specified is not safe; callers should use writeForMode
  localStorage.setItem(STORAGE_KEY + '.general', JSON.stringify(moments));
}

function writeForMode(moments: MomentRecord[], mode: 'general' | 'lovers' = 'general') {
  const key = `${STORAGE_KEY}.${mode}`;
  localStorage.setItem(key, JSON.stringify(moments));
}

// Upload media to Supabase storage and get public URL
export async function uploadMomentMedia(file: File, userId: string): Promise<{ url: string; storagePath: string } | null> {
  try {
    const timestamp = Date.now();
    const filename = `${userId}/${timestamp}_${file.name}`;
    
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filename);

    return { url: publicUrl, storagePath: filename };
  } catch (err) {
    console.error('Failed to upload moment media:', err);
    return null;
  }
}

export function listMoments(mode: 'general' | 'lovers' = 'general'): MomentRecord[] {
  return readStorage(mode);
}

export async function publishMoment(moment: MomentRecord) {
  const mode = moment.mode || 'general';
  const moments = readStorage(mode);
  writeForMode([moment, ...moments], mode);
  
  // Also save to Supabase for real-time sync
  try {
    await supabase.from('moments').insert([{
      id: moment.id,
      user_id: moment.userId,
      username: moment.username,
      avatar_url: moment.avatar,
      created_at: moment.createdAt,
      media_type: moment.mediaType,
      media_url: moment.url,
      storage_path: moment.storagePath,
      privacy: moment.privacy,
      specific_users: moment.specificUsers,
      edit_meta: moment.editMeta,
      music_data: moment.music,
      mode: mode,
    }]);
  } catch (err) {
    console.error('Failed to sync moment to database:', err);
    // Continue - localStorage is fallback
  }
}

export function addMomentReaction(momentId: string, emoji: string, userId: string, mode: 'general' | 'lovers' = 'general') {
  const moments = readStorage(mode);
  const next = moments.map((moment) => {
    if (moment.id !== momentId) return moment;
    return {
      ...moment,
      reactions: [
        ...(moment.reactions || []),
        { emoji, userId, createdAt: new Date().toISOString() },
      ],
    };
  });
  writeForMode(next, mode);
}

export function addMomentReply(momentId: string, text: string, userId: string, mode: 'general' | 'lovers' = 'general') {
  const moments = readStorage(mode);
  const next = moments.map((moment) => {
    if (moment.id !== momentId) return moment;
    return {
      ...moment,
      replies: [
        ...(moment.replies || []),
        { text, userId, createdAt: new Date().toISOString() },
      ],
    };
  });
  writeForMode(next, mode);
}

export async function updateMomentMusic(momentId: string, music: unknown | null, mode: 'general' | 'lovers' = 'general') {
  const moments = readStorage(mode);
  const next = moments.map((moment) => {
    if (moment.id !== momentId) return moment;
    return {
      ...moment,
      music: music ?? null,
    };
  });
  writeForMode(next, mode);

  try {
    await supabase
      .from('moments')
      .update({ music_data: music ?? null })
      .eq('id', momentId);
  } catch (err) {
    console.error('Failed to sync moment music update:', err);
  }
}
