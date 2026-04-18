import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const SUGGESTION_BANK = {
  Cute: [
    'Send a 5-word love note and one heart emoji.',
    'Share your favorite photo together and one reason you love it.',
    'Give your partner a nickname challenge for today only.',
    'Send a voice note saying goodnight in a funny accent.',
    'Describe your partner in 3 adorable words.',
    'Write a mini poem in 2 lines about your day together.',
  ],
  Deep: [
    'What moment made you feel safest with me?',
    'What do you want us to heal together this month?',
    'Share one dream you are afraid to say out loud.',
    'What does commitment look like for you right now?',
    'Tell me one thing I do that makes you feel seen.',
    'If we could restart one memory, which one and why?',
  ],
  Spicy: [
    'Describe your ideal date night in 3 bold steps.',
    'Send one playful dare your partner must do in 60 seconds.',
    'Share one flirty text you always wanted to send.',
    'Pick: slow dance now or surprise compliment storm?',
    'Tell your partner one thing they do that drives you wild.',
    'Set a fun “no phones for 20 minutes” challenge.',
  ],
};

const randomSuggestions = (category) => {
  const pool = [...SUGGESTION_BANK[category]];
  const picks = [];
  while (picks.length < 3 && pool.length) {
    const index = Math.floor(Math.random() * pool.length);
    picks.push(pool.splice(index, 1)[0]);
  }
  return picks;
};

export default function AISuggestions() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('Cute');
  const [seed, setSeed] = useState(0);

  const suggestions = useMemo(() => randomSuggestions(category), [category, seed]);

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.06, boxShadow: '0 0 24px rgba(255,77,109,0.45)' }}
        whileTap={{ scale: 0.96 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-30 rounded-full bg-gradient-to-r from-[#ff4d6d] to-[#7b2cbf] px-5 py-3 text-sm font-semibold text-white shadow-xl"
      >
        ✨ Suggest
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 md:items-center"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: 40, scale: 0.96, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 30, scale: 0.97, opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur-xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">AI Suggestion Panel</h3>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-white/25 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
                >
                  Close
                </button>
              </div>

              <div className="mb-4 grid grid-cols-3 gap-2">
                {['Cute', 'Deep', 'Spicy'].map((item) => (
                  <button
                    key={item}
                    onClick={() => setCategory(item)}
                    className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                      category === item
                        ? 'bg-gradient-to-r from-[#ff4d6d] to-[#7b2cbf] text-white'
                        : 'border border-white/20 bg-white/5 text-white/80 hover:bg-white/10'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {suggestions.map((item, index) => (
                  <motion.div
                    key={`${item}-${index}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.06 }}
                    className="rounded-2xl border border-white/15 bg-white/10 p-3 text-sm text-white/90 shadow-lg"
                  >
                    {item}
                  </motion.div>
                ))}
              </div>

              <div className="mt-5 flex justify-end">
                <motion.button
                  whileHover={{ scale: 1.04, boxShadow: '0 0 20px rgba(123,44,191,0.45)' }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setSeed((v) => v + 1)}
                  className="rounded-full bg-[#7b2cbf] px-4 py-2 text-sm font-semibold text-white"
                >
                  Regenerate
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
