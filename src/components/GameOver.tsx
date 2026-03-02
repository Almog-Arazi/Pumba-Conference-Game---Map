import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';
import type { PlayerRegistration } from '../types/registration';

interface GameOverProps {
  scores: { player1: number; player2: number };
  registrations: PlayerRegistration[];
  numPlayers: 1 | 2;
  onRestart: () => void;
}

export function GameOver({ scores, registrations, numPlayers, onRestart }: GameOverProps) {
  useEffect(() => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#2C37B2', '#CC3333', '#42C8BE']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#2C37B2', '#CC3333', '#42C8BE']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  const p1Name = registrations[0]?.name || 'Player 1';
  const p2Name = registrations[1]?.name || 'Player 2';

  const isTie = numPlayers === 2 && scores.player1 === scores.player2;
  const p1Wins = numPlayers === 1 || scores.player1 > scores.player2;
  const winnerName = isTie ? null : (p1Wins ? p1Name : p2Name);
  const winnerColor = p1Wins ? '#33CCFF' : '#FF3366';

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-50 backdrop-blur-md"
    >
      <h2 className="text-4xl font-bold text-white/40 mb-2 tracking-widest uppercase">Game Over</h2>

      {isTie ? (
        <h1 className="text-8xl font-black mb-12 text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.2)]">
          IT'S A TIE!
        </h1>
      ) : (
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 260, damping: 20 }}
          className="flex flex-col items-center mb-10"
        >
          <span className="text-xl font-bold tracking-widest uppercase mb-1" style={{ color: winnerColor }}>
            Winner
          </span>
          <h1
            className="font-black leading-none"
            style={{ fontSize: 72, color: winnerColor, textShadow: `0 0 60px ${winnerColor}88` }}
          >
            {winnerName}
          </h1>
          {registrations[p1Wins ? 0 : 1]?.company && (
            <span className="text-white/40 text-lg font-bold mt-1">
              {registrations[p1Wins ? 0 : 1].company}
            </span>
          )}
        </motion.div>
      )}

      <div className="flex gap-16 mb-12">
        {numPlayers === 2 && (
          <>
            <div className="text-center">
              <p className="text-sm font-black tracking-widest uppercase mb-0.5" style={{ color: '#FF3366' }}>
                {p2Name}
              </p>
              {registrations[1]?.company && (
                <p className="text-white/35 text-xs mb-2">{registrations[1].company}</p>
              )}
              <p className="text-6xl font-black text-white">{scores.player2}</p>
            </div>
            <div className="w-px bg-white/15 self-stretch" />
          </>
        )}
        <div className="text-center">
          <p className="text-sm font-black tracking-widest uppercase mb-0.5" style={{ color: '#33CCFF' }}>
            {p1Name}
          </p>
          {registrations[0]?.company && (
            <p className="text-white/35 text-xs mb-2">{registrations[0].company}</p>
          )}
          <p className="text-6xl font-black text-white">{scores.player1}</p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-6">
        <button
          onClick={onRestart}
          className="px-10 py-4 bg-white text-black font-bold rounded-full text-xl hover:scale-105 transition-transform"
        >
          PLAY AGAIN
        </button>

        <div className="mt-4 p-6 bg-white/5 border border-white/10 rounded-2xl text-center max-w-md">
          <p className="text-[#42C8BE] font-bold text-xl mb-2">Download Pumba Parking</p>
          <p className="text-gray-400 text-sm mb-4">Find blue-and-white parking in Tel Aviv instantly.</p>
          <a
            href="https://pumbaparking.com"
            target="_blank"
            rel="noreferrer"
            className="inline-block px-6 py-2 bg-[#42C8BE] text-black font-bold rounded-full text-sm hover:bg-[#35a39a]"
          >
            GET THE APP
          </a>
        </div>
      </div>
    </motion.div>
  );
}
