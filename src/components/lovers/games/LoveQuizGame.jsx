import { useMemo, useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const QUESTIONS = [
  {
    question: 'Ideal weekend together?',
    options: [
      { label: 'Cozy movie night', points: 3 },
      { label: 'Road trip adventure', points: 2 },
      { label: 'Deep talk over coffee', points: 4 },
      { label: 'Surprise date challenge', points: 1 },
    ],
  },
  {
    question: 'How do you show love most often?',
    options: [
      { label: 'Words', points: 4 },
      { label: 'Touch', points: 3 },
      { label: 'Acts of care', points: 2 },
      { label: 'Gift surprises', points: 1 },
    ],
  },
  {
    question: 'What helps during conflict?',
    options: [
      { label: 'Take space then talk', points: 2 },
      { label: 'Talk immediately', points: 4 },
      { label: 'Write feelings first', points: 3 },
      { label: 'Humor first', points: 1 },
    ],
  },
  {
    question: 'Pick your romance vibe:',
    options: [
      { label: 'Soft + slow', points: 4 },
      { label: 'Playful + loud', points: 2 },
      { label: 'Bold + spontaneous', points: 1 },
      { label: 'Balanced + meaningful', points: 3 },
    ],
  },
];

const MAX_POINTS = QUESTIONS.length * 4;

export default function LoveQuizGame({ onComplete }) {
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const progress = ((index + (done ? 1 : 0)) / QUESTIONS.length) * 100;
  const compatibility = useMemo(() => Math.round((score / MAX_POINTS) * 100), [score]);

  // Call onComplete when quiz is done
  useEffect(() => {
    if (done && onComplete) {
      // Award coins based on compatibility score (25-50)
      const coinsEarned = Math.floor((compatibility / 100) * 25) + 25;
      onComplete(coinsEarned);
    }
  }, [done, compatibility, onComplete]);

  const pickOption = (points) => {
    const nextScore = score + points;
    setScore(nextScore);

    if (index === QUESTIONS.length - 1) {
      setDone(true);
      return;
    }

    setIndex((v) => v + 1);
  };

  const restart = () => {
    setIndex(0);
    setScore(0);
    setDone(false);
  };

  return (
    <div className="rounded-3xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-xl">
      <h3 className="mb-4 text-xl font-bold text-white">Love Quiz</h3>

      <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full bg-gradient-to-r from-[#ff4d6d] to-[#7b2cbf]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
        />
      </div>

      <AnimatePresence mode="wait">
        {!done ? (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <p className="text-sm text-white/75">
              Question {index + 1} of {QUESTIONS.length}
            </p>
            <h4 className="text-lg font-semibold text-white">{QUESTIONS[index].question}</h4>

            <div className="grid gap-3">
              {QUESTIONS[index].options.map((option) => (
                <motion.button
                  key={option.label}
                  whileHover={{ scale: 1.02, boxShadow: '0 0 16px rgba(123,44,191,0.35)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => pickOption(option.points)}
                  className="rounded-full border border-white/20 bg-white/10 px-4 py-3 text-left text-sm text-white/90"
                >
                  {option.label}
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-[#ff4d6d]/45 bg-[#7b2cbf]/20 p-5 text-center"
          >
            <p className="text-xs uppercase tracking-wider text-white/70">Result</p>
            <p className="mt-2 text-2xl font-black text-white">Score: {score} / {MAX_POINTS}</p>
            <p className="mt-2 text-lg font-semibold text-[#ff9fb2]">
              Compatibility: {compatibility}%
            </p>

            <motion.button
              whileHover={{ scale: 1.04, boxShadow: '0 0 22px rgba(255,77,109,0.45)' }}
              whileTap={{ scale: 0.96 }}
              onClick={restart}
              className="mt-5 rounded-full bg-gradient-to-r from-[#ff4d6d] to-[#7b2cbf] px-5 py-2 text-sm font-semibold text-white"
            >
              Play Again
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
