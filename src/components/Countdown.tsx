import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

export function Countdown() {
  const [count, setCount] = useState(3);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Play Mario Kart race start sound once on mount
    const audio = new Audio('/countdown-start.mp3');
    audio.volume = 0.7;
    audio.play().catch(() => {});
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

  useEffect(() => {
    if (count > 0) {
      const timer = setTimeout(() => setCount(count - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [count]);

  const getCountText = () => {
    if (count === 3) return { text: '3', color: 'text-white' };
    if (count === 2) return { text: '2', color: 'text-white' };
    if (count === 1) return { text: '1', color: 'text-white' };
    return { text: 'GO!', color: 'text-white' };
  };

  const current = getCountText();

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#2C37B2]/40 z-50 backdrop-blur-xl">
      <AnimatePresence mode="wait">
        <motion.div
          key={count}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 0.5 }}
          className={`text-[15rem] font-black tracking-tighter ${current.color} drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]`}
        >
          {current.text}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
