import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Heart, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';

interface SpinTheBottleProps {
  partnerId: string;
  partnerName: string;
  onBack: () => void;
}

interface SpinResult {
  game_id: string;
  prompt_text: string;
  prompt_type: string;
  chosen_player_id: string;
}

interface HistoryItem {
  id: string;
  result_player_id: string;
  created_at: string;
  romantic_prompts: { text: string; type: string } | null;
}

export const SpinTheBottle: React.FC<SpinTheBottleProps> = ({
  partnerId,
  partnerName,
  onBack,
}) => {
  const { profile } = useProfile();
  const { toast } = useToast();
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [rotation, setRotation] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const currentUserId = profile?.user_id;

  // Load recent spin history
  useEffect(() => {
    if (!currentUserId) return;
    loadHistory();
  }, [currentUserId, partnerId]);

  const loadHistory = async () => {
    const { data } = await supabase
      .from('spin_games')
      .select('id, result_player_id, created_at, romantic_prompts(text, type)')
      .or(`and(player1_id.eq.${currentUserId},player2_id.eq.${partnerId}),and(player1_id.eq.${partnerId},player2_id.eq.${currentUserId})`)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) setHistory(data as unknown as HistoryItem[]);
  };

  // Realtime subscription for partner's spins
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel('spin-games-rt')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'spin_games',
      }, (payload) => {
        const row = payload.new as any;
        if (
          (row.player1_id === partnerId && row.player2_id === currentUserId) ||
          (row.player1_id === currentUserId && row.player2_id === partnerId)
        ) {
          loadHistory();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUserId, partnerId]);

  const handleSpin = useCallback(async () => {
    if (spinning || !currentUserId) return;
    setSpinning(true);
    setResult(null);

    // Animate spin
    const extraSpins = 360 * (4 + Math.floor(Math.random() * 3));
    const finalAngle = Math.floor(Math.random() * 360);
    setRotation(prev => prev + extraSpins + finalAngle);

    try {
      // Backend determines result
      const { data, error } = await supabase.rpc('spin_bottle', {
        _partner_id: partnerId,
      });

      if (error) throw error;

      // Wait for animation to finish, then show result
      setTimeout(() => {
        if (data && data.length > 0) {
          setResult(data[0] as unknown as SpinResult);
          loadHistory();
        }
        setSpinning(false);
      }, 3000);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
      setSpinning(false);
    }
  }, [spinning, currentUserId, partnerId, toast]);

  const chosenName = result
    ? result.chosen_player_id === currentUserId ? 'You' : partnerName
    : '';

  const heartEmojis = ['💕', '💖', '💗', '💘', '💝', '❤️‍🔥', '🥰', '😍'];

  return (
    <div className="p-4 max-w-md mx-auto space-y-6">
      <Button variant="ghost" onClick={onBack} className="text-white/70 hover:text-white">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Button>

      <div className="text-center space-y-2">
        <Sparkles className="w-12 h-12 text-[hsl(var(--lovers-primary))] mx-auto animate-pulse" />
        <h1 className="text-2xl font-bold bg-gradient-to-r from-[hsl(var(--lovers-primary))] to-[hsl(var(--lovers-secondary))] bg-clip-text text-transparent">
          Spin the Bottle 💋
        </h1>
        <p className="text-white/50 text-sm">
          Spin and get a romantic challenge for you or {partnerName}
        </p>
      </div>

      {/* Bottle / Wheel */}
      <div className="flex flex-col items-center gap-6">
        <div className="relative w-56 h-56">
          {/* Pointer */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10 text-2xl">▼</div>

          {/* Rotating wheel */}
          <div
            className="w-full h-full rounded-full overflow-hidden relative"
            style={{
              background: 'conic-gradient(from 0deg, hsla(320,60%,40%,0.6), hsla(280,50%,35%,0.6), hsla(340,55%,45%,0.6), hsla(300,50%,30%,0.6), hsla(320,60%,40%,0.6))',
              border: '3px solid hsla(320,70%,55%,0.4)',
              boxShadow: spinning
                ? '0 0 40px hsla(320,80%,50%,0.5), inset 0 0 30px hsla(320,80%,50%,0.2)'
                : '0 0 20px hsla(320,80%,50%,0.2)',
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? 'transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
            }}
          >
            {/* Heart segments */}
            {heartEmojis.map((emoji, i) => {
              const angle = (360 / heartEmojis.length) * i;
              return (
                <div
                  key={i}
                  className="absolute w-full h-full flex items-start justify-center pt-5"
                  style={{ transform: `rotate(${angle}deg)` }}
                >
                  <span className="text-lg">{emoji}</span>
                </div>
              );
            })}

            {/* Dividing lines */}
            {heartEmojis.map((_, i) => (
              <div
                key={`l-${i}`}
                className="absolute top-0 left-1/2 w-px h-1/2 origin-bottom"
                style={{
                  transform: `rotate(${(360 / heartEmojis.length) * i}deg)`,
                  background: 'hsla(320,60%,60%,0.3)',
                }}
              />
            ))}

            {/* Center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--lovers-primary)), hsl(var(--lovers-secondary)))',
                  boxShadow: '0 0 20px hsla(320,80%,50%,0.4)',
                }}>
                <Heart className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          {/* Glow ring when spinning */}
          {spinning && (
            <div className="absolute inset-0 rounded-full animate-ping" style={{
              border: '2px solid hsla(320,80%,50%,0.3)',
            }} />
          )}
        </div>

        <Button
          onClick={handleSpin}
          disabled={spinning}
          className="px-10 py-5 text-lg rounded-2xl shadow-xl hover:scale-105 transition-transform"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--lovers-primary)), hsl(var(--lovers-secondary)))',
          }}
        >
          {spinning ? '💫 Spinning...' : '💋 Spin!'}
        </Button>

        {/* Result */}
        {result && !spinning && (
          <Card className="w-full border-[hsl(var(--lovers-primary))]/30 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{
            background: 'linear-gradient(135deg, hsla(320 50% 18% / 0.8), hsla(280 40% 15% / 0.8))',
            backdropFilter: 'blur(16px)',
          }}>
            <CardContent className="p-5 text-center space-y-3">
              <div className="text-4xl mb-1">
                {result.prompt_type === 'compliment' ? '💝' : result.prompt_type === 'dare' ? '🔥' : '💭'}
              </div>
              <p className="text-xs uppercase tracking-wider text-[hsl(var(--lovers-primary))]">
                {chosenName} must...
              </p>
              <p className="text-base text-white/90 font-medium leading-relaxed">
                {result.prompt_text}
              </p>
              <span className="inline-block px-3 py-1 rounded-full text-[10px] uppercase tracking-wider"
                style={{
                  background: 'hsla(320 50% 40% / 0.3)',
                  color: 'hsl(320 70% 70%)',
                }}>
                {result.prompt_type}
              </span>
            </CardContent>
          </Card>
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-white/40 uppercase tracking-wider px-1">Recent Spins</p>
          {history.slice(0, 5).map((h) => (
            <div key={h.id} className="px-3 py-2 rounded-xl text-xs" style={{
              background: 'hsla(270 30% 12% / 0.5)',
              border: '1px solid hsla(320 50% 40% / 0.15)',
            }}>
              <span className="text-white/50">
                {h.result_player_id === currentUserId ? 'You' : partnerName}:
              </span>{' '}
              <span className="text-white/70">{h.romantic_prompts?.text || 'Spin result'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
