import { motion } from 'motion/react';
import { useState } from 'react';

interface LobbyProps {
  onStart: (players: 1 | 2) => void;
  isCameraReady: boolean;
  onBackToInstructions: () => void;
}

export function Lobby({ onStart, isCameraReady, onBackToInstructions }: LobbyProps) {
  const [selectedPlayers, setSelectedPlayers] = useState<1 | 2>(2);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex flex-col items-center justify-center bg-[#0B0F19]/90 text-white z-50 backdrop-blur-md"
    >
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#33FFCC] to-transparent"></div>
      
      <div className="z-10 text-center flex flex-col items-center">
        <div className="mb-4 drop-shadow-[0_0_20px_rgba(51,255,204,0.5)]">
          <img src="/logo_2.svg" alt="Pumba Logo" className="h-48" />
        </div>
        <p className="text-xl text-[#33CCFF] mb-12 max-w-md">
          Control your cars with hand gestures! First to park wins.
        </p>

        <div className="flex gap-8 mb-12">
          <div className="flex flex-col items-center bg-white/5 p-6 rounded-2xl border border-white/10 shadow-lg">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4 border border-white/20">
              <span className="text-3xl">🖐️</span>
            </div>
            <p className="font-bold text-[#33FFCC]">Open Hand</p>
            <p className="text-sm text-gray-400">Move Cursor</p>
          </div>
          <div className="flex flex-col items-center bg-white/5 p-6 rounded-2xl border border-white/10 shadow-lg">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4 border border-white/20">
              <span className="text-3xl">✊</span>
            </div>
            <p className="font-bold text-[#FF3366]">Closed Fist</p>
            <p className="text-sm text-gray-400">Grab & Drop</p>
          </div>
        </div>

        <div className="mb-8 flex gap-4 bg-black/50 p-2 rounded-full border border-white/10">
          <button
            onClick={() => setSelectedPlayers(1)}
            className={`px-8 py-3 rounded-full font-bold transition-all ${
              selectedPlayers === 1 ? 'bg-[#33CCFF] text-black shadow-[0_0_15px_#33CCFF]' : 'text-gray-400 hover:text-white'
            }`}
          >
            1 PLAYER
          </button>
          <button
            onClick={() => setSelectedPlayers(2)}
            className={`px-8 py-3 rounded-full font-bold transition-all ${
              selectedPlayers === 2 ? 'bg-[#FF3366] text-black shadow-[0_0_15px_#FF3366]' : 'text-gray-400 hover:text-white'
            }`}
          >
            2 PLAYERS
          </button>
        </div>

        <button
          onClick={() => onStart(selectedPlayers)}
          disabled={!isCameraReady}
          className={`px-16 py-5 rounded-full text-2xl font-black tracking-widest transition-all ${
            isCameraReady 
              ? 'bg-[#33FFCC] text-black hover:bg-white hover:scale-105 shadow-[0_0_30px_rgba(51,255,204,0.6)]' 
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isCameraReady ? 'START GAME' : 'WAITING FOR CAMERA...'}
        </button>

        <button
          onClick={onBackToInstructions}
          className="mt-4 text-white/35 hover:text-white/70 text-sm font-bold tracking-widest uppercase transition-colors"
        >
          ← Back to Instructions
        </button>
      </div>
    </motion.div>
  );
}
