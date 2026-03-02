/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { useHandTracking, HandState } from './hooks/useHandTracking';
import { useGameEngine } from './hooks/useGameEngine';
import { Lobby } from './components/Lobby';
import { Countdown } from './components/Countdown';
import { GameOver } from './components/GameOver';
import { Tutorial } from './components/Tutorial';
import { AdminPanel } from './components/AdminPanel';
import { MapBackground } from './components/MapBackground';
import { Car2D } from './components/Car2D';
import { motion, AnimatePresence } from 'motion/react';
import { CarFront } from 'lucide-react';
import { Results } from '@mediapipe/hands';
import type { PlayerRegistration } from './types/registration';
import { saveMatchRecord } from './types/registration';

// Ripple effect shown when a car is successfully parked
interface ParkRipple {
  id: number;
  x: number;
  y: number;
  color: string;
}

// Wrong-type drop feedback
interface WrongDrop {
  id: number;
  x: number;
  y: number;
}

// Bonus camera collection pop-up
interface BonusCollect {
  id: number;
  x: number;
  y: number;
  color: string;
}

// Size hierarchy: small=1, family=2, suv=3
const SIZE_RANK: Record<string, number> = { small: 1, family: 2, suv: 3 };

// A car fits a spot if the spot is >= the car's size
function carFitsSpot(carType: string, spotType: string): boolean {
  return SIZE_RANK[spotType] >= SIZE_RANK[carType];
}

// Parking snap radius — tweak these to make snapping easier/harder.
// Values are fractions of the game-entities container (0–1).
// PARK_RADIUS_Y ≈ PARK_RADIUS_X × (containerW / containerH) to look circular on 16:9.
const PARK_RADIUS_X = 0.045;
const PARK_RADIUS_Y = 0.085;

// Type accent colors shared across cars and spots
export const TYPE_COLOR: Record<string, string> = {
  small: '#FFD700',
  family: '#33FFCC',
  suv: '#FF9933',
};

function useAudioManager() {
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const mutedRef = useRef(false);

  const setMuted = useCallback((muted: boolean) => {
    mutedRef.current = muted;
    if (bgMusicRef.current) {
      bgMusicRef.current.muted = muted;
    }
  }, []);

  const stopBgMusic = useCallback(() => {
    if (bgMusicRef.current) {
      bgMusicRef.current.pause();
      bgMusicRef.current.currentTime = 0;
      bgMusicRef.current = null;
    }
  }, []);

  const playTrack = useCallback((src: string, volume: number) => {
    if (bgMusicRef.current) {
      bgMusicRef.current.pause();
      bgMusicRef.current.currentTime = 0;
    }
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = volume;
    audio.muted = mutedRef.current;
    audio.play().catch(() => {});
    bgMusicRef.current = audio;
  }, []);

  const playLobbyMusic = useCallback(() => {
    playTrack('/lobby-music.mp3', 0.25);
  }, [playTrack]);

  const playBgMusic = useCallback(() => {
    playTrack('/lobby-music.mp3', 0.2);
  }, [playTrack]);

  const playGameOverMusic = useCallback(() => {
    stopBgMusic();
    if (!mutedRef.current) {
      const audio = new Audio('/gameover.mp3');
      audio.volume = 0.6;
      audio.play().catch(() => {});
    }
  }, [stopBgMusic]);

  const playParkSound = useCallback(() => {
    if (mutedRef.current) return;
    const audio = new Audio('/park-success.mp3');
    audio.volume = 0.6;
    audio.play().catch(() => {});
  }, []);

  return { playLobbyMusic, playBgMusic, stopBgMusic, playGameOverMusic, playParkSound, setMuted };
}

function HandOverlay({ results, side, numPlayers }: { results: Results | null, side: 'left' | 'right', numPlayers: 1 | 2 }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    if (!results || !results.multiHandLandmarks) return;
    
    results.multiHandLandmarks.forEach((landmarks) => {
      const wrist = landmarks[0];
      const isLeftRaw = wrist.x < 0.5;
      const hSide = numPlayers === 2 ? (isLeftRaw ? 'right' : 'left') : 'right';
      
      if (hSide === side || numPlayers === 1) {
        ctx.fillStyle = side === 'left' ? '#FF3366' : '#33CCFF';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        
        // Draw connections
        const connections = [
          [0,1], [1,2], [2,3], [3,4], // thumb
          [0,5], [5,6], [6,7], [7,8], // index
          [5,9], [9,10], [10,11], [11,12], // middle
          [9,13], [13,14], [14,15], [15,16], // ring
          [13,17], [0,17], [17,18], [18,19], [19,20] // pinky
        ];
        
        ctx.beginPath();
        connections.forEach(([i, j]) => {
          const p1 = landmarks[i];
          const p2 = landmarks[j];
          ctx.moveTo(p1.x * 640, p1.y * 480);
          ctx.lineTo(p2.x * 640, p2.y * 480);
        });
        ctx.stroke();

        // Draw joints
        landmarks.forEach((lm) => {
          ctx.beginPath();
          ctx.arc(lm.x * 640, lm.y * 480, 4, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
        });
      }
    });
  }, [results, side, numPlayers]);
  
  return (
    <canvas 
      ref={canvasRef} 
      width={640} 
      height={480} 
      className="absolute inset-0 w-[200%] h-full max-w-none object-cover transform -scale-x-100 z-20 pointer-events-none" 
      style={side === 'left' ? { left: '0%' } : { left: '-100%' }} 
    />
  );
}

const SPOT_GIF_WIDTH: Record<string, number> = {
  small:  56,
  family: 72,
  suv:    90,
};

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null); // Hidden tracking video
  const videoRefLeft = useRef<HTMLVideoElement>(null);
  const videoRefRight = useRef<HTMLVideoElement>(null);
  const [parkRipples, setParkRipples] = useState<ParkRipple[]>([]);
  const rippleIdRef = useRef(0);
  const [wrongDrops, setWrongDrops] = useState<WrongDrop[]>([]);
  const wrongDropIdRef = useRef(0);
  const [bonusCollects, setBonusCollects] = useState<BonusCollect[]>([]);
  const bonusCollectIdRef = useRef(0);
  // Prevents double-collection within a single camera appearance
  const bonusCameraCollectedRef = useRef(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const [registrations, setRegistrations] = useState<PlayerRegistration[]>([]);
  // Track whether we've already saved this round to avoid double-write on re-render
  const matchSavedRef = useRef(false);

  // Logical game canvas size — all coordinates and pixel values are designed for this.
  const BASE_W = 1920;
  const BASE_H = 1080;
  const [gameScale, setGameScale] = useState(1);

  // Track previously-seen parked car IDs so we detect each park exactly once
  const prevParkedIdsRef = useRef<Set<string>>(new Set());
  // All pending respawn timeouts — cleared on game end so stale timeouts don't fire
  const respawnTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const { playLobbyMusic, playBgMusic, stopBgMusic, playGameOverMusic, playParkSound, setMuted } = useAudioManager();

  const toggleMute = useCallback(() => {
    const next = !isMuted;
    setIsMuted(next);
    setMuted(next);
  }, [isMuted, setMuted]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Auto-enter fullscreen on first load
  useEffect(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }, []);

  // Keep isFullscreen in sync with actual fullscreen state (e.g. Escape key)
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Scale the 1920×1080 game canvas to always fill the viewport without clipping
  useEffect(() => {
    const update = () =>
      setGameScale(Math.min(window.innerWidth / BASE_W, window.innerHeight / BASE_H));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [BASE_W, BASE_H]);
  
  const {
    gameState,
    numPlayers,
    timeLeft,
    scores,
    cars,
    parkingSpots,
    setCars,
    setParkingSpots,
    setScores,
    startGame,
    setGameState,
    addNewCarForPlayer,
    bonusCamera,
    collectBonusCamera,
  } = useGameEngine();

  const { handsState, isReady, rawResults } = useHandTracking(videoRef, numPlayers);

  // Start lobby music on the first user interaction (browsers block autoplay before that).
  // This covers the tutorial screen and the lobby.
  useEffect(() => {
    const startOnInteraction = () => {
      playLobbyMusic();
      document.removeEventListener('click', startOnInteraction);
      document.removeEventListener('keydown', startOnInteraction);
    };
    document.addEventListener('click', startOnInteraction, { once: true });
    document.addEventListener('keydown', startOnInteraction, { once: true });
    return () => {
      document.removeEventListener('click', startOnInteraction);
      document.removeEventListener('keydown', startOnInteraction);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Background music control — switches tracks as game state changes
  useEffect(() => {
    if (gameState === 'playing') {
      playBgMusic();
    } else if (gameState === 'gameover') {
      playGameOverMusic();
    } else if (gameState === 'lobby') {
      // Returning to lobby after game — restart lobby music
      playLobbyMusic();
    }
  }, [gameState, playLobbyMusic, playBgMusic, stopBgMusic, playGameOverMusic]);

  // Save match record when game ends (once per round)
  useEffect(() => {
    if (gameState === 'playing') {
      matchSavedRef.current = false; // reset for new round
    }
    if (gameState === 'gameover' && !matchSavedRef.current && registrations.length > 0) {
      matchSavedRef.current = true;
      const p1Score = scores.player1;
      const p2Score = scores.player2;
      const p1Wins = numPlayers === 1 ? true : p1Score >= p2Score;
      saveMatchRecord({
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        numPlayers,
        players: registrations.map((reg, i) => {
          const pid = i === 0 ? 'player1' : 'player2' as const;
          const score = i === 0 ? p1Score : p2Score;
          const isWinner = numPlayers === 1 ? true : (i === 0 ? p1Score >= p2Score : p2Score > p1Score);
          return { playerId: pid, registration: reg, score, isWinner };
        }),
      });
      void p1Wins; // suppress unused warning
    }
  }, [gameState, registrations, scores, numPlayers]);

  // Sync video streams to the UI videos
  useEffect(() => {
    if (isReady && videoRef.current && videoRef.current.srcObject) {
      if (videoRefLeft.current) videoRefLeft.current.srcObject = videoRef.current.srcObject;
      if (videoRefRight.current) videoRefRight.current.srcObject = videoRef.current.srcObject;
    }
  }, [isReady]);

  // Helper to map camera coordinates to screen coordinates
  const getP2ScreenX = (camX: number) => {
    const mirroredX = 1 - camX;
    return mirroredX * 1.6;
  };
  const getP1ScreenX = (camX: number) => {
    const mirroredX = 1 - camX;
    if (numPlayers === 1) {
      // Amplify around centre: natural arm range (~60% of camera) covers full screen
      return 0.5 + (mirroredX - 0.5) * 1.6;
    }
    return 0.2 + (mirroredX - 0.5) * 1.6;
  };

  // Reset the collection guard each time a fresh bonus camera appears
  useEffect(() => {
    if (bonusCamera) bonusCameraCollectedRef.current = false;
  }, [bonusCamera]);

  // Detect hand-grab on bonus camera → award +5
  useEffect(() => {
    if (gameState !== 'playing' || !bonusCamera || bonusCameraCollectedRef.current) return;

    const tryCollect = (
      hand: { x: number; y: number; isGrabbing: boolean } | null,
      playerId: 'player1' | 'player2',
      toScreenX: (x: number) => number,
    ) => {
      if (!hand?.isGrabbing) return;
      const sx = toScreenX(hand.x);
      if (Math.abs(sx - bonusCamera.x) >= 0.09 || Math.abs(hand.y - bonusCamera.y) >= 0.11) return;
      bonusCameraCollectedRef.current = true;
      collectBonusCamera(playerId);
      playParkSound();
      const id = ++bonusCollectIdRef.current;
      setBonusCollects(prev => [
        ...prev,
        { id, x: bonusCamera.x, y: bonusCamera.y, color: playerId === 'player1' ? '#33CCFF' : '#FF3366' },
      ]);
      setTimeout(() => setBonusCollects(prev => prev.filter(b => b.id !== id)), 2000);
    };

    // Inline the coordinate mapping so we don't depend on the local helper functions
    const p1toX = (x: number) => {
      const m = 1 - x;
      return numPlayers === 1 ? 0.5 + (m - 0.5) * 1.6 : 0.2 + (m - 0.5) * 1.6;
    };
    const p2toX = (x: number) => (1 - x) * 1.6;

    tryCollect(handsState.player1, 'player1', p1toX);
    if (numPlayers === 2) tryCollect(handsState.player2, 'player2', p2toX);
  }, [handsState, gameState, bonusCamera, numPlayers, collectBonusCamera, playParkSound]);

  // Keep a ref to parkingSpots to avoid re-triggering drag effect on spot spawn
  const parkingSpotsRef = useRef(parkingSpots);
  useEffect(() => {
    parkingSpotsRef.current = parkingSpots;
  }, [parkingSpots]);

  // Handle dragging logic
  useEffect(() => {
    if (gameState !== 'playing') return;

    setCars(prevCars => {
      let updatedCars = [...prevCars];

      const dropCar = (carIndex: number, playerId: 'player1' | 'player2') => {
        const car = updatedCars[carIndex];
        // Increased drop radius significantly to make it easier to lock onto a spot
        const spot = parkingSpotsRef.current.find(s =>
          !s.parkedBy && carFitsSpot(car.type, s.type) &&
          Math.abs(s.x - car.x) < PARK_RADIUS_X && Math.abs(s.y - car.y) < PARK_RADIUS_Y
        );

        if (spot) {
          // Play car honk sound
          playParkSound();
          
          // Spawn ripple at spot position
          const rippleColor = playerId === 'player1' ? '#33CCFF' : '#FF3366';
          const newRipple: ParkRipple = { id: ++rippleIdRef.current, x: spot.x, y: spot.y, color: rippleColor };
          setParkRipples(prev => [...prev, newRipple]);
          setTimeout(() => setParkRipples(prev => prev.filter(r => r.id !== newRipple.id)), 700);

          setParkingSpots(prev => prev.map(s => s.id === spot.id ? { ...s, parkedBy: playerId, parkedCarType: car.type } : s));
          setScores(s => ({ ...s, [playerId]: s[playerId] + 1 }));
          
          updatedCars[carIndex] = { ...car, isDragging: false, isParked: true, x: spot.x, y: spot.y, hoveredSpotId: undefined };
        } else {
          // Check if dropped on a wrong-type spot nearby → show feedback
          const wrongSpot = parkingSpotsRef.current.find(s =>
            !s.parkedBy && !carFitsSpot(car.type, s.type) &&
            Math.abs(s.x - car.x) < PARK_RADIUS_X && Math.abs(s.y - car.y) < PARK_RADIUS_Y
          );
          if (wrongSpot) {
            const newWrong: WrongDrop = { id: ++wrongDropIdRef.current, x: wrongSpot.x, y: wrongSpot.y };
            setWrongDrops(prev => [...prev, newWrong]);
            setTimeout(() => setWrongDrops(prev => prev.filter(w => w.id !== newWrong.id)), 1200);
          }
          updatedCars[carIndex] = { ...car, isDragging: false, isParked: false, x: car.originalX, y: car.originalY, hoveredSpotId: undefined };
        }
      };

      const handlePlayer = (playerId: 'player1' | 'player2', handState: HandState | null, getScreenX: (x: number) => number) => {
        const draggedCarIndex = updatedCars.findIndex(c => c.playerId === playerId && c.isDragging);
        
        if (handState) {
          const x = getScreenX(handState.x);
          const y = handState.y;
          
          if (handState.isGrabbing) {
            if (draggedCarIndex !== -1) {
              const car = updatedCars[draggedCarIndex];
              const spot = parkingSpotsRef.current.find(s => 
                !s.parkedBy && carFitsSpot(car.type, s.type) &&
                Math.abs(s.x - x) < PARK_RADIUS_X && Math.abs(s.y - y) < PARK_RADIUS_Y
              );
              updatedCars[draggedCarIndex] = { 
                ...updatedCars[draggedCarIndex], 
                x, 
                y,
                hoveredSpotId: spot ? spot.id : undefined
              };
            } else {
              const carToGrab = updatedCars.findIndex(c => 
                c.playerId === playerId && !c.isParked && 
                Math.abs(c.x - x) < 0.12 && Math.abs(c.y - y) < 0.18
              );
              if (carToGrab !== -1) {
                updatedCars[carToGrab] = { ...updatedCars[carToGrab], isDragging: true, x, y };
              }
            }
          } else {
            if (draggedCarIndex !== -1) dropCar(draggedCarIndex, playerId);
          }
        } else {
          // Hand lost, drop car
          if (draggedCarIndex !== -1) dropCar(draggedCarIndex, playerId);
        }
      };

      handlePlayer('player1', handsState.player1, getP1ScreenX);
      if (numPlayers === 2) {
        handlePlayer('player2', handsState.player2, getP2ScreenX);
      }

      return updatedCars;
    });
  }, [handsState, gameState, numPlayers, setCars, setParkingSpots, setScores, playParkSound, isMuted, addNewCarForPlayer]);

  // Detect newly-parked cars and schedule exactly ONE respawn per park,
  // completely outside the setCars updater to prevent side-effect duplication.
  useEffect(() => {
    if (gameState !== 'playing') return;
    const currentParkedIds = new Set(cars.filter(c => c.isParked).map(c => c.id));
    const newlyParked = cars.filter(c => c.isParked && !prevParkedIdsRef.current.has(c.id));
    prevParkedIdsRef.current = currentParkedIds;

    newlyParked.forEach(car => {
      const tid = setTimeout(() => addNewCarForPlayer(car.playerId), 3000);
      respawnTimeoutsRef.current.push(tid);
    });
  }, [cars, gameState, addNewCarForPlayer]);

  // Cancel all pending respawn timeouts when the game is no longer playing
  useEffect(() => {
    if (gameState !== 'playing') {
      respawnTimeoutsRef.current.forEach(clearTimeout);
      respawnTimeoutsRef.current = [];
      prevParkedIdsRef.current = new Set();
    }
  }, [gameState]);

  // Ticking sound for the last 10 seconds
  const tickAudioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (gameState === 'playing' && timeLeft === 10) {
      const audio = new Audio('/tick.mp3');
      audio.loop = true;
      audio.volume = 0.5;
      audio.muted = isMuted;
      audio.play().catch(() => {});
      tickAudioRef.current = audio;
    } else if (gameState !== 'playing' || timeLeft <= 0) {
      if (tickAudioRef.current) {
        tickAudioRef.current.pause();
        tickAudioRef.current.currentTime = 0;
        tickAudioRef.current = null;
      }
    }
    // Sync mute state to tick audio
    if (tickAudioRef.current) {
      tickAudioRef.current.muted = isMuted;
    }
  }, [timeLeft, gameState, isMuted]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.00`;
  };

  return (
    <div className="w-screen h-screen bg-[#2C37B2] overflow-hidden font-sans select-none relative">
      {/* Hidden tracking video */}
      <video ref={videoRef} className="hidden" autoPlay playsInline muted />

      {/* Background Bubbles — viewport-relative, purely decorative */}
      <div className="absolute top-[-10%] left-[10%] w-[30vw] h-[30vw] rounded-full bg-[#42C8BE] opacity-80 pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[25vw] h-[25vw] rounded-full bg-[#42C8BE] opacity-80 pointer-events-none" />
      <div className="absolute top-[20%] right-[-10%] w-[35vw] h-[35vw] rounded-full bg-[#42C8BE] opacity-80 pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[20%] w-[20vw] h-[20vw] rounded-full bg-[#42C8BE] opacity-80 pointer-events-none" />

      {/* ── Game world: fixed 1920×1080, scaled to fit any viewport ── */}
      <div
        className="absolute bg-transparent"
        style={{
          width:  BASE_W,
          height: BASE_H,
          left:   '50%',
          top:    '50%',
          transform: `translate(-50%, -50%) scale(${gameScale})`,
          transformOrigin: 'center center',
        }}
      >

      {/* Controls: Restart + Mute + Fullscreen */}
      <div className="absolute top-4 right-4 z-[1000] flex gap-2">
        <button
          onClick={() => setGameState('lobby')}
          title="Restart — go to lobby"
          className="w-10 h-10 rounded-full bg-black/40 border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/60 transition-all backdrop-blur-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
        </button>
        <button
          onClick={toggleMute}
          title={isMuted ? 'Unmute' : 'Mute'}
          className="w-10 h-10 rounded-full bg-black/40 border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/60 transition-all backdrop-blur-sm"
        >
          {isMuted ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
            </svg>
          )}
        </button>
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          className="w-10 h-10 rounded-full bg-black/40 border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/60 transition-all backdrop-blur-sm"
        >
          {isFullscreen ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
            </svg>
          )}
        </button>
      </div>

      {/* Main game area — fills the 1920×1080 world */}
      <div className="relative w-full h-full bg-transparent z-10">
        
        {gameState === 'playing' && (
          <>
            {/* Panels Container — inset more to leave space for bottom logo */}
            <div className="absolute top-8 bottom-20 left-8 right-8 flex justify-between gap-6">
              
              {/* Left Panel (Player 2) - Hidden in 1 Player mode */}
              {numPlayers === 2 && (
                <div className="w-[22%] h-full bg-[#0B0F19]/90 rounded-2xl border border-white/10 flex flex-col items-center py-6 px-4 relative shadow-2xl">
                  <h2 className="text-3xl font-bold text-[#FF3366] mb-4 tracking-widest">PLAYER 2</h2>
                  <div className="w-32 h-16 border-2 border-[#FF3366] rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(255,51,102,0.4)] mb-8">
                    <span className="text-4xl font-black text-[#FF3366]">{scores.player2.toString().padStart(3, '0')}</span>
                  </div>
                  
                  <div className="w-full aspect-video border-2 border-[#FF3366] rounded-lg shadow-[0_0_15px_rgba(255,51,102,0.4)] mb-auto flex items-center justify-center relative overflow-hidden">
                    <video ref={videoRefLeft} className="absolute inset-0 w-[200%] h-full max-w-none object-cover transform -scale-x-100" style={{ left: '0%' }} autoPlay playsInline muted />
                    <HandOverlay results={rawResults} side="left" numPlayers={numPlayers} />
                    <div className="absolute inset-0 bg-[#FF3366]/10 pointer-events-none"></div>
                    {!isReady && <span className="text-[#FF3366] font-bold text-sm z-10 text-center px-2">PLAYER 2<br/>CAMERA FEED</span>}
                  </div>

                  {/* Car Grid Backgrounds */}
                  <div className="w-full grid grid-cols-3 gap-2 mt-8">
                    {[0,1,2,3,4,5].map(i => (
                      <div key={i} className="aspect-square border border-[#FF3366]/50 rounded-lg flex items-center justify-center">
                        <CarFront className="w-8 h-8 text-[#FF3366]/30" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Center Panel (Timer + Map) — takes full width in 1-player mode */}
              <div className="flex-1 h-full flex flex-col gap-4">
                
                {/* Timer (Above Map) */}
                <div className="h-24 bg-[#0B0F19]/90 rounded-2xl border border-white/10 flex items-center justify-center shadow-2xl shrink-0">
                  <div className={`text-6xl font-black drop-shadow-[0_0_20px_rgba(51,255,204,0.8)] tracking-widest ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-[#33FFCC]'}`}>
                    {formatTime(timeLeft)}
                  </div>
                </div>

                {/* Map */}
                <div className="flex-1 bg-[#0B0F19] rounded-2xl border border-white/10 relative overflow-hidden shadow-2xl">
                  <MapBackground />
                  <div className="absolute inset-0 bg-[#33FFCC]/10 mix-blend-screen pointer-events-none z-[400]"></div>
                </div>
              </div>

              {/* Right Panel (Player 1) */}
              <div className="w-[22%] h-full bg-[#0B0F19]/90 rounded-2xl border border-white/10 flex flex-col items-center py-6 px-4 relative shadow-2xl">
                <h2 className="text-3xl font-bold text-[#33CCFF] mb-4 tracking-widest">PLAYER 1</h2>
                <div className="w-32 h-16 border-2 border-[#33CCFF] rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(51,204,255,0.4)] mb-8">
                  <span className="text-4xl font-black text-[#33CCFF]">{scores.player1.toString().padStart(3, '0')}</span>
                </div>
                
                <div className="w-full aspect-video border-2 border-[#33CCFF] rounded-lg shadow-[0_0_15px_rgba(51,204,255,0.4)] mb-auto flex items-center justify-center relative overflow-hidden">
                  <video
                    ref={videoRefRight}
                    className={`absolute inset-0 h-full max-w-none object-cover transform -scale-x-100 ${numPlayers === 1 ? 'w-full left-0' : 'w-[200%]'}`}
                    style={{ left: numPlayers === 2 ? '-100%' : '0%' }}
                    autoPlay playsInline muted
                  />
                  <HandOverlay results={rawResults} side="right" numPlayers={numPlayers} />
                  <div className="absolute inset-0 bg-[#33CCFF]/10 pointer-events-none"></div>
                  {!isReady && <span className="text-[#33CCFF] font-bold text-sm z-10 text-center px-2">PLAYER 1<br/>CAMERA FEED</span>}
                </div>

                {/* Car Grid Backgrounds */}
                <div className="w-full grid grid-cols-3 gap-2 mt-8">
                  {[0,1,2,3,4,5].map(i => (
                    <div key={i} className="aspect-square border border-[#33CCFF]/50 rounded-lg flex items-center justify-center">
                      <CarFront className="w-8 h-8 text-[#33CCFF]/30" />
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Logo */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 drop-shadow-lg">
              <img src="/logo_2.svg" alt="Pumba Logo" className="h-12" />
            </div>

            {/* Small Logo Bottom Left with black circle backdrop */}
            <div className="absolute bottom-4 left-4 z-30">
              <div className="relative w-20 h-20 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-black/60 backdrop-blur-sm"></div>
                <img src="/logo.png" alt="Pumba Small Logo" className="relative h-20 w-20 object-contain" />
              </div>
            </div>

            {/* Game Entities (Cars, Spots, Cursors) */}
            <div className="absolute top-8 bottom-20 left-8 right-8 z-[600] pointer-events-none">
              {/* Parking Spots */}
              {(() => {
                // Determine which car type is currently being dragged (for dimming)
                const draggingCar = cars.find(c => c.isDragging);
                return (
                  <AnimatePresence>
                    {parkingSpots.map((spot) => {
                      const hoveringCar = cars.find(c => c.hoveredSpotId === spot.id);
                      const isHovered = !!hoveringCar;
                      const hoverColor = hoveringCar?.playerId === 'player1' ? '#33CCFF' : '#FF3366';
                      const typeColor = TYPE_COLOR[spot.type];
                      
                      // Dim spots that don't match the dragged car type
                      const isDimmed = !!draggingCar && !spot.parkedBy && !carFitsSpot(draggingCar.type, spot.type);

                      const sizeClass = spot.type === 'small' ? 'w-10 h-16 -ml-5 -mt-8' : 
                                        spot.type === 'suv' ? 'w-16 h-28 -ml-8 -mt-14' : 
                                        'w-12 h-24 -ml-6 -mt-12';

                      const gifWidth = SPOT_GIF_WIDTH[spot.type];

                      return (
                        <motion.div
                          key={spot.id}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: isHovered ? 1.2 : 1, opacity: isDimmed ? 0.3 : 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          className={`absolute ${sizeClass} flex items-center justify-center transition-all duration-200`}
                          style={{ 
                            left: `${spot.x * 100}%`, 
                            top: `${spot.y * 100}%`,
                            filter: isHovered && !spot.parkedBy
                              ? `drop-shadow(0 0 15px ${hoverColor})`
                              : `drop-shadow(0 0 6px ${typeColor}) drop-shadow(0 5px 10px rgba(0,0,0,0.5))`
                          }}
                        >
                          {/* GIF photo card — shown only when the spot is free */}
                          {!spot.parkedBy && spot.gif && (
                            <div
                              className="absolute pointer-events-none"
                              style={{
                                top: '100%',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                marginTop: 2,
                                background: '#fff',
                                borderRadius: 4,
                                padding: '3px 3px 0',
                                boxShadow: '0 3px 14px rgba(0,0,0,0.6)',
                                width: gifWidth,
                                zIndex: 10,
                                filter: 'none',
                              }}
                            >
                              <div style={{ borderRadius: 2, overflow: 'hidden', lineHeight: 0 }}>
                                <img
                                  src={`/${spot.gif}`}
                                  alt=""
                                  style={{ width: '100%', height: 'auto', display: 'block' }}
                                />
                              </div>
                              <div
                                style={{
                                  background: '#1a8c3c',
                                  textAlign: 'center',
                                  padding: '1px 0 2px',
                                  fontSize: gifWidth * 0.13,
                                  fontWeight: 800,
                                  color: '#fff',
                                  letterSpacing: '0.08em',
                                  borderRadius: '0 0 2px 2px',
                                }}
                              >
                                Now
                              </div>
                            </div>
                          )}

                          {spot.parkedBy ? (
                            <motion.div 
                              initial={{ scale: 1.5, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className="absolute inset-0 flex items-center justify-center z-40"
                            >
                              <Car2D color={spot.parkedBy === 'player1' ? '#33CCFF' : '#FF3366'} type={spot.parkedCarType ?? spot.type} />
                            </motion.div>
                          ) : (
                            <svg width="100%" height="100%" viewBox="0 0 125 193" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M61.9746 155.362C66.5848 155.362 70.6798 156.737 73.96 159.657L74.2754 159.945L74.2842 159.953C77.6687 163.14 79.2695 167.326 79.2695 172.107C79.2694 176.885 77.6705 181.081 74.2793 184.265C70.9424 187.397 66.7279 188.852 61.9746 188.852C57.227 188.851 53.0026 187.401 49.6699 184.265C46.2704 181.073 44.6808 176.883 44.6807 172.107C44.6807 167.326 46.2815 163.14 49.666 159.953C52.9994 156.814 57.2251 155.362 61.9746 155.362Z" fill={isHovered ? hoverColor : typeColor} stroke="white" strokeWidth="8"/>
                              <path d="M124.08 51.8233C124.08 59.6886 121.968 67.1679 118.204 73.8534L118.144 73.9772L117.07 75.7687L116.596 76.5407C99.7516 100.479 82.9003 124.424 66.0565 148.362H57.7864C41.2241 124.708 24.6545 101.047 8.09217 77.3927L5.29845 72.7828L5.27622 72.7391C1.88225 66.3377 0 59.2662 0 51.8233C0 23.2098 27.7965 0 62.04 0C96.2836 0 124.08 23.2098 124.08 51.8233Z" fill={isHovered ? hoverColor : typeColor} opacity="0.8"/>
                              <path d="M93.5636 38.5364C91.6295 34.225 89.0507 30.8969 85.8049 28.5227C82.574 26.1559 78.9725 24.9761 75.0302 24.9761C70.3764 24.9761 66.2933 26.5273 62.7734 29.6297C59.2608 32.7321 56.9191 37.5387 55.7335 44.0566V25.5514H39.8604V101.575H55.7335V62.9114C56.9191 69.4367 59.2608 74.2432 62.7734 77.3456C66.2859 80.448 70.3764 81.9992 75.0302 81.9992C78.9799 81.9992 82.574 80.8194 85.8049 78.4453C89.0433 76.0784 91.6221 72.743 93.5636 68.4389C95.4977 64.1349 96.4611 59.1463 96.4611 53.4804C96.4611 47.8145 95.4977 42.8331 93.5636 38.5291V38.5364ZM76.5197 63.7853C74.4299 66.2323 71.5621 67.4485 67.931 67.4485C64.5444 67.4485 61.6988 66.2687 59.409 63.9019C57.1118 61.535 55.8965 58.2578 55.7409 54.0703V52.905C55.8965 48.7102 57.1192 45.433 59.409 43.0735C61.6914 40.6993 64.537 39.5195 67.931 39.5195C71.5695 39.5195 74.4299 40.743 76.5197 43.19C78.602 45.637 79.6469 49.0598 79.6469 53.4804C79.6469 57.9009 78.602 61.3384 76.5197 63.7853Z" fill="#2D2C2B"/>
                            </svg>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                );
              })()}

              {/* Cars */}
              {cars.map(car => {
                if (car.isParked) return null;
                const size = 108;
                const half = size / 2;
                const playerColor = car.playerId === 'player1' ? '#33CCFF' : '#FF3366';
                return (
                  <motion.div
                    key={car.id}
                    // initial uses the slot position (originalX/Y) so the car never
                    // flies in from a corner — it pops into existence right in its cell.
                    initial={{
                      left: `${car.originalX * 100}%`,
                      top: `${car.originalY * 100}%`,
                      scale: 0,
                      opacity: 0,
                    }}
                    animate={{
                      left: `${car.x * 100}%`,
                      top: `${car.y * 100}%`,
                      scale: 1,
                      opacity: 1,
                    }}
                    transition={
                      car.isDragging
                        ? { duration: 0 }
                        : {
                            left:    { type: 'spring', stiffness: 300, damping: 22 },
                            top:     { type: 'spring', stiffness: 300, damping: 22 },
                            scale:   { type: 'spring', stiffness: 500, damping: 22 },
                            opacity: { duration: 0.15 },
                          }
                    }
                    className={`absolute ${car.isDragging ? 'z-50' : 'z-30'}`}
                    style={{ width: size, height: size, marginLeft: -half, marginTop: -half }}
                  >
                    <Car2D color={playerColor} isDragging={car.isDragging} type={car.type} />
                  </motion.div>
                );
              })}

              {/* ── Bonus Camera ─────────────────────────────── */}
              <AnimatePresence>
                {bonusCamera && gameState === 'playing' && (
                  <motion.div
                    key={bonusCamera.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0, rotate: 20 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 20 }}
                    className="absolute pointer-events-none z-[450]"
                    style={{
                      left: `${bonusCamera.x * 100}%`,
                      top:  `${bonusCamera.y * 100}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    {/* Outer pulse ring */}
                    <motion.div
                      animate={{ scale: [1, 1.7, 1], opacity: [0.7, 0, 0.7] }}
                      transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute rounded-full"
                      style={{
                        inset: -18,
                        border: '2px solid #FFD700',
                        background: 'radial-gradient(circle, #FFD70030, transparent 65%)',
                      }}
                    />
                    {/* Second ring – slower */}
                    <motion.div
                      animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
                      transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
                      className="absolute rounded-full"
                      style={{ inset: -8, border: '1.5px solid #FFD70088' }}
                    />
                    {/* Camera image */}
                    <motion.div
                      animate={{
                        filter: [
                          'drop-shadow(0 0 10px #FFD700) drop-shadow(0 0 20px #FFD70066)',
                          'drop-shadow(0 0 18px #FFD700) drop-shadow(0 0 36px #FFD70099)',
                          'drop-shadow(0 0 10px #FFD700) drop-shadow(0 0 20px #FFD70066)',
                        ],
                      }}
                      transition={{ duration: 1.3, repeat: Infinity }}
                      className="relative rounded-xl overflow-hidden"
                      style={{ width: 76 }}
                    >
                      <img src="/bonus-camera.jpg" alt="Bonus Camera" className="w-full h-auto block" />
                    </motion.div>
                    {/* +5 badge */}
                    <motion.div
                      animate={{ y: [0, -5, 0], scale: [1, 1.1, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                      className="absolute -top-3 -right-1 px-1.5 py-0.5 rounded-full font-black text-xs leading-none"
                      style={{ background: '#FFD700', color: '#000', fontSize: 11 }}
                    >
                      +5
                    </motion.div>
                    {/* BONUS label */}
                    <div className="mt-1 text-center">
                      <span
                        className="text-[10px] font-black tracking-widest uppercase"
                        style={{ color: '#FFD700', textShadow: '0 0 8px #FFD700' }}
                      >
                        BONUS
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bonus collect pop-ups (+5 ⭐) */}
              <AnimatePresence>
                {bonusCollects.map(b => (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 1, y: 0, scale: 0.8 }}
                    animate={{ opacity: 0, y: -100, scale: 1.6 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.4, ease: 'easeOut' }}
                    className="absolute pointer-events-none z-[1000] font-black select-none text-center"
                    style={{
                      left: `${b.x * 100}%`,
                      top:  `${b.y * 100}%`,
                      transform: 'translate(-50%, -50%)',
                      color: '#FFD700',
                      fontSize: 28,
                      textShadow: '0 0 16px #FFD700, 0 0 32px #FFD70099',
                    }}
                  >
                    +5 ⭐
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Park Ripple Effects */}
              <AnimatePresence>
                {parkRipples.map(ripple => (
                  <motion.div
                    key={ripple.id}
                    initial={{ scale: 0.2, opacity: 1 }}
                    animate={{ scale: 2.2, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.65, ease: 'easeOut' }}
                    className="absolute pointer-events-none rounded-full border-4 z-[800]"
                    style={{
                      width: '48px',
                      height: '48px',
                      left: `calc(${ripple.x * 100}% - 24px)`,
                      top: `calc(${ripple.y * 100}% - 24px)`,
                      borderColor: ripple.color,
                      boxShadow: `0 0 20px ${ripple.color}`,
                    }}
                  />
                ))}
              </AnimatePresence>

              {/* Wrong-type drop feedback */}
              <AnimatePresence>
                {wrongDrops.map(w => (
                  <motion.div
                    key={w.id}
                    initial={{ opacity: 1, y: 0 }}
                    animate={{ opacity: 0, y: -50 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.1, ease: 'easeOut' }}
                    className="absolute pointer-events-none z-[900] select-none text-center"
                    style={{
                      left: `${w.x * 100}%`,
                      top:  `${w.y * 100}%`,
                      transform: 'translate(-50%, -120%)',
                    }}
                  >
                    <span
                      className="inline-block font-black text-sm tracking-wide px-2 py-1 rounded-lg"
                      style={{
                        color: '#FF3333',
                        background: 'rgba(0,0,0,0.65)',
                        textShadow: '0 0 8px #FF3333',
                        border: '1px solid rgba(255,51,51,0.5)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Spot too small!
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Cursors */}
              {numPlayers === 2 && handsState.player2 && (
                <div
                  className={`absolute w-8 h-8 -ml-4 -mt-4 rounded-full border-2 border-white z-[700] flex items-center justify-center transition-transform shadow-[0_0_10px_#FF3366]
                    ${handsState.player2.isGrabbing ? 'scale-75 bg-[#FF3366]' : 'scale-100 bg-[#FF3366]/50'}`}
                  style={{ left: `${getP2ScreenX(handsState.player2.x) * 100}%`, top: `${handsState.player2.y * 100}%` }}
                >
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                </div>
              )}
              {handsState.player1 && (
                <div
                  className={`absolute w-8 h-8 -ml-4 -mt-4 rounded-full border-2 border-white z-[700] flex items-center justify-center transition-transform shadow-[0_0_10px_#33CCFF]
                    ${handsState.player1.isGrabbing ? 'scale-75 bg-[#33CCFF]' : 'scale-100 bg-[#33CCFF]/50'}`}
                  style={{ left: `${getP1ScreenX(handsState.player1.x) * 100}%`, top: `${handsState.player1.y * 100}%` }}
                >
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Countdown overlay — sits above background, hides all game content */}
        <AnimatePresence>
          {gameState === 'countdown' && <Countdown />}
        </AnimatePresence>

        {/* Overlays */}
        <AnimatePresence>
          {gameState === 'lobby' && (
            <Lobby
              onStart={startGame}
              isCameraReady={isReady}
              onBackToInstructions={() => setShowTutorial(true)}
            />
          )}
          {gameState === 'gameover' && (
            <GameOver
              scores={scores}
              registrations={registrations}
              numPlayers={numPlayers}
              onRestart={() => setGameState('lobby')}
            />
          )}
        </AnimatePresence>

        {/* Tutorial — shown once on first load, before the lobby */}
        <AnimatePresence>
          {showTutorial && (
            <Tutorial
              key="tutorial"
              onDone={(n, regs) => { setShowTutorial(false); setRegistrations(regs); startGame(n); }}
              cameraRef={videoRef}
              isReady={isReady}
              rawResults={rawResults}
              handsState={handsState}
            />
          )}
        </AnimatePresence>
      </div>{/* end main game area */}

      </div>{/* end game world scale wrapper */}
    </div>
  );
}

// Root wrapper — renders AdminPanel when URL hash is #admin, otherwise the game
export function Root() {
  const isAdmin = window.location.hash === '#admin';
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);

  if (isAdmin && !adminAuthed) {
    return (
      <div style={{ background: '#080c18', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (pin === 'pumba') {
              setAdminAuthed(true);
              setPinError(false);
            } else {
              setPinError(true);
            }
          }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}
        >
          <img src="/logo_2.svg" alt="Pumba" style={{ height: 48, marginBottom: 8 }} />
          <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 700, fontSize: 13, letterSpacing: '0.2em' }}>ADMIN ACCESS</span>
          <input
            type="password"
            placeholder="Enter PIN"
            value={pin}
            onChange={(e) => { setPin(e.target.value); setPinError(false); }}
            autoFocus
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: pinError ? '1px solid #FF5555' : '1px solid rgba(255,255,255,0.12)',
              borderRadius: 10,
              padding: '12px 20px',
              color: '#fff',
              fontSize: 16,
              textAlign: 'center',
              outline: 'none',
              width: 220,
            }}
          />
          {pinError && <span style={{ color: '#FF5555', fontSize: 13 }}>Wrong PIN</span>}
          <button
            type="submit"
            style={{
              background: '#33FFCC',
              color: '#060a14',
              border: 'none',
              borderRadius: 10,
              padding: '10px 32px',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Enter
          </button>
        </form>
      </div>
    );
  }

  if (isAdmin && adminAuthed) return <AdminPanel />;
  return <App />;
}
