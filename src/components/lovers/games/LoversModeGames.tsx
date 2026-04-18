import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useLoveCoins } from '@/contexts/LoveCoinsContext';
import { useToast } from '@/hooks/use-toast';
import { Heart, Zap } from 'lucide-react';
import SpinWheelGame from './SpinWheelGame';
import AISuggestions from './AISuggestions';
import LoveQuizGame from './LoveQuizGame';
import MiniGames from './MiniGames';

const TABS = [
  { id: 'wheel', label: 'Spin Wheel', cost: 10 },
  { id: 'quiz', label: 'Love Quiz', cost: 5 },
  { id: 'mini', label: 'Mini Games', cost: 8 },
];

interface LoversModeGamesProps {
  onGameComplete?: (coinsEarned: number) => void;
}

export default function LoversModeGames({ onGameComplete }: LoversModeGamesProps) {
  const [activeTab, setActiveTab] = useState('wheel');
  const { coins, spendCoins, earnCoins } = useLoveCoins();
  const { toast } = useToast();
  const [gameStats, setGameStats] = useState({
    wheel: 0,
    quiz: 0,
    mini: 0
  });

  const getCurrentTabCost = () => {
    const tab = TABS.find(t => t.id === activeTab);
    return tab?.cost || 0;
  };

  const hasEnoughCoins = () => {
    return coins >= getCurrentTabCost();
  };

  const handleTabChange = async (tabId: string) => {
    const cost = TABS.find(t => t.id === tabId)?.cost || 0;
    
    if (!hasEnoughCoins()) {
      toast({
        title: "Insufficient Love Coins",
        description: `This game costs ${cost} coins, you have ${coins}`,
        variant: "destructive"
      });
      return;
    }

    // Deduct coins for playing
    const deducted = await spendCoins(cost, `${tabId} game`);
    if (deducted) {
      setActiveTab(tabId);
    }
  };

  const handleGameComplete = useCallback(async (earnedCoins: number) => {
    await earnCoins(earnedCoins, `${activeTab} game completion`);
    setGameStats(prev => ({
      ...prev,
      [activeTab]: prev[activeTab as keyof typeof prev] + earnedCoins
    }));
    if (onGameComplete) {
      onGameComplete(earnedCoins);
    }
  }, [activeTab, earnCoins, onGameComplete]);

  return (
    <section className="relative min-h-[calc(100vh-2rem)] overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#ff4d6d]/20 via-[#7b2cbf]/20 to-black/40 p-4 text-white shadow-2xl sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,77,109,0.28),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(123,44,191,0.35),transparent_48%)]" />

      <div className="relative z-10 mx-auto w-full max-w-5xl">
        <header className="mb-6 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/70">Lovers Mode</p>
              <h2 className="mt-1 text-2xl font-extrabold">Games Arena</h2>
              <p className="mt-1 text-sm text-white/80">Play, flirt, and connect without leaving chat context.</p>
            </div>
            {/* Love Coins Display */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-lovers-primary/20 border border-lovers-primary/30">
              <Heart className="w-5 h-5 text-lovers-primary animate-heart-beat" />
              <div>
                <p className="text-xs text-white/70">Love Coins</p>
                <p className="text-2xl font-bold text-lovers-primary">{coins}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Tab Selection with Cost Display */}
        <div className="mb-5 flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <motion.button
              key={tab.id}
              whileHover={{ scale: hasEnoughCoins() ? 1.04 : 1, boxShadow: hasEnoughCoins() ? '0 0 18px rgba(255,77,109,0.45)' : 'none' }}
              whileTap={{ scale: hasEnoughCoins() ? 0.96 : 1 }}
              onClick={() => handleTabChange(tab.id)}
              disabled={!hasEnoughCoins()}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition relative ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-[#ff4d6d] to-[#7b2cbf] text-white'
                  : hasEnoughCoins()
                    ? 'border border-white/20 bg-white/10 text-white/85 hover:bg-white/15'
                    : 'border border-white/10 bg-white/5 text-white/40 cursor-not-allowed'
              }`}
            >
              {tab.label}
              {hasEnoughCoins() && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-white/10">
                  <Zap className="w-3 h-3" /> {tab.cost}
                </span>
              )}
            </motion.button>
          ))}
        </div>

        {/* Game Stats */}
        {Object.values(gameStats).some(v => v > 0) && (
          <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
            <p className="text-xs text-green-400">
              Total earned this session: {Object.values(gameStats).reduce((a, b) => a + b, 0)} 💕
            </p>
          </div>
        )}

        {/* Game Content */}
        <div className="grid gap-4">
          {activeTab === 'wheel' && <SpinWheelGame onComplete={handleGameComplete} />}
          {activeTab === 'quiz' && <LoveQuizGame onComplete={handleGameComplete} />}
          {activeTab === 'mini' && <MiniGames onComplete={handleGameComplete} />}
        </div>
      </div>

      <AISuggestions />
    </section>
  );
}
