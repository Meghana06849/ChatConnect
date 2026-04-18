import { useState } from 'react';
import { motion } from 'framer-motion';
import SpinWheelGame from './SpinWheelGame';
import AISuggestions from './AISuggestions';
import LoveQuizGame from './LoveQuizGame';
import MiniGames from './MiniGames';

const TABS = [
  { id: 'wheel', label: 'Spin Wheel' },
  { id: 'quiz', label: 'Love Quiz' },
  { id: 'mini', label: 'Mini Games' },
];

export default function LoversModeGames() {
  const [activeTab, setActiveTab] = useState('wheel');

  return (
    <section className="relative min-h-[calc(100vh-2rem)] overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#ff4d6d]/20 via-[#7b2cbf]/20 to-black/40 p-4 text-white shadow-2xl sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,77,109,0.28),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(123,44,191,0.35),transparent_48%)]" />

      <div className="relative z-10 mx-auto w-full max-w-5xl">
        <header className="mb-6 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-xl">
          <p className="text-xs uppercase tracking-[0.2em] text-white/70">Lovers Mode</p>
          <h2 className="mt-1 text-2xl font-extrabold">Games Arena</h2>
          <p className="mt-1 text-sm text-white/80">Play, flirt, and connect without leaving chat context.</p>
        </header>

        <div className="mb-5 flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <motion.button
              key={tab.id}
              whileHover={{ scale: 1.04, boxShadow: '0 0 18px rgba(255,77,109,0.45)' }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-[#ff4d6d] to-[#7b2cbf] text-white'
                  : 'border border-white/20 bg-white/10 text-white/85 hover:bg-white/15'
              }`}
            >
              {tab.label}
            </motion.button>
          ))}
        </div>

        <div className="grid gap-4">
          {activeTab === 'wheel' && <SpinWheelGame />}
          {activeTab === 'quiz' && <LoveQuizGame />}
          {activeTab === 'mini' && <MiniGames />}
        </div>
      </div>

      <AISuggestions />
    </section>
  );
}
