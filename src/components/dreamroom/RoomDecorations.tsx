import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, X, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';

interface Decoration {
  id: string;
  emoji: string;
  label: string;
  x: number;
  y: number;
  placedBy: string;
}

const DECORATION_OPTIONS = [
  { emoji: '🌹', label: 'Rose' },
  { emoji: '🕯️', label: 'Candle' },
  { emoji: '🧸', label: 'Teddy' },
  { emoji: '📸', label: 'Photo' },
  { emoji: '🎀', label: 'Ribbon' },
  { emoji: '💌', label: 'Letter' },
  { emoji: '🌸', label: 'Blossom' },
  { emoji: '⭐', label: 'Star' },
];

export const RoomDecorations: React.FC = () => {
  const { profile } = useProfile();
  const [decorations, setDecorations] = useState<Decoration[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [placing, setPlacing] = useState<{ emoji: string; label: string } | null>(null);

  const userId = profile?.user_id;
  const partnerId = profile?.lovers_partner_id;

  // Load decorations from dream_features
  useEffect(() => {
    if (!userId || !partnerId) return;
    const load = async () => {
      const { data } = await supabase
        .from('dream_features')
        .select('*')
        .eq('feature_type', 'room_decoration')
        .or(`user_id.eq.${userId},partner_id.eq.${userId}`);
      if (data) {
        const items: Decoration[] = data.flatMap(row => {
          const d = row.data as any;
          return d.decorations || [];
        });
        setDecorations(items);
      }
    };
    load();

    // Real-time sync
    const channel = supabase
      .channel('room-decorations')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'dream_features',
        filter: `feature_type=eq.room_decoration`,
      }, () => { load(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, partnerId]);

  const saveDecorations = useCallback(async (newDecorations: Decoration[]) => {
    if (!userId || !partnerId) return;
    const { data: existing } = await supabase
      .from('dream_features')
      .select('id')
      .eq('feature_type', 'room_decoration')
      .eq('user_id', userId)
      .maybeSingle();

    const payload = {
      feature_type: 'room_decoration',
      user_id: userId,
      partner_id: partnerId,
      data: { decorations: newDecorations } as any,
    };

    if (existing) {
      await supabase.from('dream_features').update(payload).eq('id', existing.id);
    } else {
      await supabase.from('dream_features').insert(payload);
    }
  }, [userId, partnerId]);

  const handlePlaceDecoration = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!placing || !userId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const newDec: Decoration = {
      id: crypto.randomUUID(),
      emoji: placing.emoji,
      label: placing.label,
      x, y,
      placedBy: userId,
    };
    const updated = [...decorations, newDec];
    setDecorations(updated);
    saveDecorations(updated);
    setPlacing(null);
  }, [placing, userId, decorations, saveDecorations]);

  const handleRemoveDecoration = useCallback((id: string) => {
    const updated = decorations.filter(d => d.id !== id);
    setDecorations(updated);
    saveDecorations(updated);
  }, [decorations, saveDecorations]);

  const handleClearAll = useCallback(() => {
    setDecorations([]);
    saveDecorations([]);
  }, [saveDecorations]);

  return (
    <>
      {/* Placed decorations overlay */}
      <div
        className={`absolute inset-0 z-15 ${placing ? 'cursor-crosshair' : 'pointer-events-none'}`}
        onClick={placing ? handlePlaceDecoration : undefined}
      >
        {decorations.map(d => (
          <div key={d.id} className="absolute group pointer-events-auto" style={{
            left: `${d.x}%`, top: `${d.y}%`,
            transform: 'translate(-50%, -50%)',
          }}>
            <span className="text-xl md:text-2xl drop-shadow-lg transition-transform hover:scale-125 cursor-default"
              style={{ filter: 'drop-shadow(0 0 6px hsla(320 80% 55% / 0.4))' }}>
              {d.emoji}
            </span>
            <button onClick={(e) => { e.stopPropagation(); handleRemoveDecoration(d.id); }}
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'hsla(0 70% 50% / 0.8)' }}>
              <X className="w-2.5 h-2.5 text-white" />
            </button>
          </div>
        ))}
      </div>

      {/* Decoration toolbar */}
      <div className="absolute top-2 left-2 z-20 flex flex-col gap-1">
        <button onClick={() => { setShowPicker(!showPicker); setPlacing(null); }}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
          style={{
            background: showPicker
              ? 'linear-gradient(135deg, hsla(320 80% 55% / 0.9), hsla(270 60% 50% / 0.9))'
              : 'hsla(280 40% 20% / 0.7)',
            border: '1px solid hsla(320 60% 50% / 0.3)',
            backdropFilter: 'blur(8px)',
          }}>
          <Plus className="w-3.5 h-3.5 text-white" />
        </button>

        {decorations.length > 0 && (
          <button onClick={handleClearAll}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{
              background: 'hsla(0 50% 30% / 0.6)',
              border: '1px solid hsla(0 60% 40% / 0.3)',
              backdropFilter: 'blur(8px)',
            }}>
            <RotateCcw className="w-3 h-3 text-white/70" />
          </button>
        )}
      </div>

      {/* Picker panel */}
      {showPicker && (
        <div className="absolute top-12 left-2 z-20 p-2 rounded-xl grid grid-cols-4 gap-1.5"
          style={{
            background: 'linear-gradient(135deg, hsla(280 35% 15% / 0.95), hsla(300 30% 12% / 0.95))',
            border: '1px solid hsla(320 60% 50% / 0.2)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px hsla(0 0% 0% / 0.5)',
          }}>
          {DECORATION_OPTIONS.map(opt => (
            <button key={opt.emoji}
              onClick={() => { setPlacing(opt); setShowPicker(false); }}
              className="w-10 h-10 rounded-lg flex flex-col items-center justify-center transition-all hover:scale-110 active:scale-95"
              style={{
                background: 'hsla(320 40% 25% / 0.5)',
                border: '1px solid hsla(320 50% 40% / 0.15)',
              }}>
              <span className="text-lg">{opt.emoji}</span>
              <span className="text-[7px] text-white/40">{opt.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Placing mode indicator */}
      {placing && (
        <div className="absolute top-2 left-12 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{
            background: 'linear-gradient(135deg, hsla(320 60% 40% / 0.9), hsla(270 50% 35% / 0.9))',
            border: '1px solid hsla(320 80% 60% / 0.3)',
            backdropFilter: 'blur(12px)',
          }}>
          <span className="text-sm">{placing.emoji}</span>
          <span className="text-[10px] text-white/80">Tap to place</span>
          <button onClick={() => setPlacing(null)} className="ml-1">
            <X className="w-3 h-3 text-white/60" />
          </button>
        </div>
      )}
    </>
  );
};
