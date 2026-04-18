import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const RAPID_FIRE = [
  { question: 'Kisses in rain?', answers: ['Yes', 'Maybe later', 'Only if music plays'] },
  { question: 'Midnight snack date?', answers: ['Always', 'Only weekends', 'Cook together'] },
  { question: 'Voice note right now?', answers: ['Send it', 'After this game', 'Only one line'] },
  { question: 'Truth or flirt?', answers: ['Truth', 'Flirt', 'Both'] },
];

const MEMORY_ICONS = ['💌', '🌹', '🎵', '✨', '💕', '🌙', '🍓', '🕯️'];

const buildMemoryDeck = () => {
  const base = [...MEMORY_ICONS, ...MEMORY_ICONS]
    .map((icon, index) => ({ id: `${icon}-${index}`, icon, matched: false }))
    .sort(() => Math.random() - 0.5)
    .map((card, idx) => ({ ...card, slot: idx }));
  return base;
};

export default function MiniGames({ onComplete }) {
  const [tab, setTab] = useState('rapid');

  // Rapid fire state
  const [rfIndex, setRfIndex] = useState(0);
  const [rfScore, setRfScore] = useState(0);
  const [rfTime, setRfTime] = useState(8);
  const [rfDone, setRfDone] = useState(false);

  // Memory state
  const [deck, setDeck] = useState(buildMemoryDeck());
  const [flipped, setFlipped] = useState([]);
  const [lock, setLock] = useState(false);

  // Call onComplete when rapid fire is done
  useEffect(() => {
    if (rfDone && onComplete) {
      // Award coins based on score (20-40)
      const coinsEarned = Math.floor((rfScore / RAPID_FIRE.length) * 20) + 20;
      onComplete(coinsEarned);
    }
  }, [rfDone, rfScore, onComplete]);

  useEffect(() => {
    if (tab !== 'rapid' || rfDone) return;

    const timer = window.setInterval(() => {
      setRfTime((prev) => {
        if (prev <= 1) {
          moveRapidFire();
          return 8;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [tab, rfDone, rfIndex]);

  useEffect(() => {
    if (tab !== 'rapid') return;
    setRfTime(8);
  }, [rfIndex, tab]);

  const moveRapidFire = (correct = false) => {
    if (correct) setRfScore((v) => v + 1);

    if (rfIndex >= RAPID_FIRE.length - 1) {
      setRfDone(true);
      return;
    }

    setRfIndex((v) => v + 1);
    setRfTime(8);
  };

  const resetRapid = () => {
    setRfIndex(0);
    setRfScore(0);
    setRfTime(8);
    setRfDone(false);
  };

  const progressWidth = useMemo(() => `${(rfTime / 8) * 100}%`, [rfTime]);

  const flipCard = (id) => {
    if (lock || flipped.includes(id)) return;

    const next = [...flipped, id];
    setFlipped(next);

    if (next.length !== 2) return;

    setLock(true);

    const [a, b] = next;
    const first = deck.find((card) => card.id === a);
    const second = deck.find((card) => card.id === b);

    if (first && second && first.icon === second.icon) {
      setDeck((prev) =>
        prev.map((card) =>
          card.id === a || card.id === b ? { ...card, matched: true } : card
        )
      );
      setFlipped([]);
      setLock(false);
      return;
    }

    window.setTimeout(() => {
      setFlipped([]);
      setLock(false);
    }, 750);
  };

  const resetMemory = () => {
    setDeck(buildMemoryDeck());
    setFlipped([]);
    setLock(false);
  };

  const allMatched = deck.every((card) => card.matched);

  return (
    <div className="rounded-3xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-xl">
      <div className="mb-4 flex gap-2">
        {[
          { key: 'rapid', label: 'Rapid Fire' },
          { key: 'memory', label: 'Memory Match' },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === item.key
                ? 'bg-gradient-to-r from-[#ff4d6d] to-[#7b2cbf] text-white'
                : 'border border-white/20 bg-white/10 text-white/80'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'rapid' ? (
          <motion.div
            key="rapid"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            {!rfDone ? (
              <>
                <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#ff4d6d] to-[#7b2cbf]"
                    animate={{ width: progressWidth }}
                  />
                </div>

                <p className="mb-3 text-sm text-white/75">Question {rfIndex + 1} / {RAPID_FIRE.length}</p>
                <h4 className="mb-4 text-lg font-semibold text-white">{RAPID_FIRE[rfIndex].question}</h4>

                <div className="grid gap-3">
                  {RAPID_FIRE[rfIndex].answers.map((answer, idx) => (
                    <motion.button
                      key={answer}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => moveRapidFire(idx === 0)}
                      className="rounded-full border border-white/20 bg-white/10 px-4 py-3 text-left text-sm text-white/90"
                    >
                      {answer}
                    </motion.button>
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-[#ff4d6d]/40 bg-[#7b2cbf]/20 p-5 text-center text-white">
                <p className="text-xl font-bold">Rapid Fire Complete</p>
                <p className="mt-2 text-sm">Score: {rfScore} / {RAPID_FIRE.length}</p>
                <button
                  onClick={resetRapid}
                  className="mt-4 rounded-full bg-gradient-to-r from-[#ff4d6d] to-[#7b2cbf] px-5 py-2 text-sm font-semibold"
                >
                  Restart
                </button>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="memory"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-lg font-semibold text-white">Match all pairs</h4>
              <button
                onClick={resetMemory}
                className="rounded-full border border-white/25 px-3 py-1 text-xs text-white/80"
              >
                Shuffle
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {deck.map((card) => {
                const isFlipped = flipped.includes(card.id) || card.matched;
                return (
                  <button
                    key={card.id}
                    onClick={() => flipCard(card.id)}
                    className="aspect-square [perspective:1000px]"
                    disabled={card.matched}
                  >
                    <motion.div
                      animate={{ rotateY: isFlipped ? 180 : 0 }}
                      transition={{ duration: 0.35 }}
                      style={{ transformStyle: 'preserve-3d' }}
                      className={`relative h-full w-full rounded-2xl border ${
                        card.matched
                          ? 'border-[#ff4d6d] shadow-[0_0_14px_rgba(255,77,109,0.45)]'
                          : 'border-white/20'
                      }`}
                    >
                      <div
                        className="absolute inset-0 rounded-2xl bg-white/10"
                        style={{ backfaceVisibility: 'hidden' }}
                      />
                      <div
                        className="absolute inset-0 flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff4d6d]/90 to-[#7b2cbf]/90 text-2xl"
                        style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                      >
                        {card.icon}
                      </div>
                    </motion.div>
                  </button>
                );
              })}
            </div>

            {allMatched && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-4 rounded-2xl border border-[#ff4d6d]/40 bg-[#7b2cbf]/20 p-4 text-center text-white"
              >
                Perfect match. You cleared the board.
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
