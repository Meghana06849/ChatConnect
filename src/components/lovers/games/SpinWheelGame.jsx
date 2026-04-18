import { useMemo, useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const SEGMENTS = ['Compliment', 'Kiss', 'Challenge', 'Memory', 'Secret', 'Interaction'];
const FULL_TURNS = 6;

export default function SpinWheelGame({ onComplete }) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);

  const segmentAngle = 360 / SEGMENTS.length;

  // Call onComplete when result is shown
  useEffect(() => {
    if (result && onComplete) {
      // Award coins based on result (50-100)
      const coinsEarned = Math.floor(Math.random() * 51) + 50;
      onComplete(coinsEarned);
    }
  }, [result, onComplete]);

  const gradient = useMemo(() => {
    const colorA = '#ff4d6d';
    const colorB = '#7b2cbf';

    const stops = SEGMENTS.map((_, index) => {
      const start = index * segmentAngle;
      const end = (index + 1) * segmentAngle;
      const color = index % 2 === 0 ? colorA : colorB;
      return `${color} ${start}deg ${end}deg`;
    }).join(',\n      ');

    return `conic-gradient(\n      ${stops}\n    )`;
  }, [segmentAngle]);

  const spin = () => {
    if (spinning) return;

    setSpinning(true);
    setResult(null);

    const randomStop = Math.floor(Math.random() * 360);
    const totalRotation = rotation + FULL_TURNS * 360 + randomStop;
    setRotation(totalRotation);

    const normalized = (360 - (totalRotation % 360)) % 360;
    const selectedIndex = Math.floor(normalized / segmentAngle) % SEGMENTS.length;

    window.setTimeout(() => {
      setResult(SEGMENTS[selectedIndex]);
      setSpinning(false);
    }, 2400);
  };

  return (
    <div className="rounded-3xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-xl">
      <h3 className="mb-4 text-center text-xl font-bold text-white">Spin Wheel</h3>

      <div className="relative mx-auto mb-6 h-72 w-72">
        <div className="absolute left-1/2 top-0 z-20 h-0 w-0 -translate-x-1/2 border-l-[14px] border-r-[14px] border-t-[24px] border-l-transparent border-r-transparent border-t-white drop-shadow" />

        <motion.div
          animate={{ rotate: rotation }}
          transition={{ duration: 2.4, ease: [0.16, 1, 0.3, 1] }}
          className={`relative h-full w-full rounded-full border-4 border-white/40 ${spinning ? 'shadow-[0_0_50px_rgba(255,77,109,0.65)]' : 'shadow-xl'}`}
          style={{ background: gradient }}
        >
          {SEGMENTS.map((label, index) => {
            const angle = index * segmentAngle + segmentAngle / 2;
            return (
              <div
                key={label}
                className="absolute left-1/2 top-1/2 text-[11px] font-semibold text-white"
                style={{
                  transform: `rotate(${angle}deg) translateY(-118px) rotate(-${angle}deg) translateX(-50%)`,
                  transformOrigin: 'center',
                }}
              >
                {label}
              </div>
            );
          })}

          <div className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/50 bg-black/30" />
        </motion.div>
      </div>

      <div className="flex justify-center">
        <motion.button
          whileHover={{ scale: 1.06, boxShadow: '0 0 25px rgba(255,77,109,0.6)' }}
          whileTap={{ scale: 0.94 }}
          onClick={spin}
          disabled={spinning}
          className="rounded-full bg-gradient-to-r from-[#ff4d6d] to-[#7b2cbf] px-8 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {spinning ? 'Spinning...' : 'Spin'}
        </motion.button>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92 }}
            className="mt-5 rounded-2xl border border-[#ff4d6d]/40 bg-[#7b2cbf]/25 p-4 text-center text-white"
          >
            <p className="text-xs uppercase tracking-wider text-white/70">Result</p>
            <p className="mt-1 text-2xl font-extrabold">{result}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
