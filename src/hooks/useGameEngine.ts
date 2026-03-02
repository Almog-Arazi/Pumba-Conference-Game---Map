import { useState, useEffect, useCallback, useRef } from 'react';

export type CarType = 'small' | 'family' | 'suv';
export type PlayerId = 'player1' | 'player2';

export interface Car {
  id: string;
  type: CarType;
  playerId: PlayerId;
  isParked: boolean;
  x: number;
  y: number;
  isDragging: boolean;
  originalX: number;
  originalY: number;
  hoveredSpotId?: string;
}

const SPOT_GIFS = [
  '26-03-01--124804_5073b_None_865bb11a.gif',
  '26-03-01--141800_5073a_None_0ebc02bb.gif',
  '26-03-01--141815_5073b_None_865bb11a.gif',
  '26-03-01--142704_5058b_None_0a844b91.gif',
  '26-03-01--143654_1613b_None_af3d9d1e.gif',
  '26-03-01--155549_1602d_None_e22bf9ad.gif',
  '26-03-01--185541_5073a_None_ee629a2a.gif',
  '26-03-01--235109_1051a_00906914_9b73c8ee.gif',
];

export interface ParkingSpot {
  id: string;
  type: CarType;
  x: number;
  y: number;
  parkedBy: PlayerId | null;
  parkedCarType?: CarType; // the actual car type that parked here (may differ from spot.type)
  createdAt: number;
  gif: string; // assigned once at spawn, stable for spot's lifetime
}

export type GameState = 'lobby' | 'countdown' | 'playing' | 'gameover';

export interface BonusCamera {
  id: string;
  x: number; // 0-1, same coordinate space as parking spots
  y: number;
}

const GAME_DURATION = 60;

// Panel grid slots for each player
const P1_SLOTS = [
  { x: 0.83, y: 0.76 }, { x: 0.89, y: 0.76 }, { x: 0.95, y: 0.76 },
  { x: 0.83, y: 0.88 }, { x: 0.89, y: 0.88 }, { x: 0.95, y: 0.88 },
];
const P2_SLOTS = [
  { x: 0.05, y: 0.76 }, { x: 0.11, y: 0.76 }, { x: 0.17, y: 0.76 },
  { x: 0.05, y: 0.88 }, { x: 0.11, y: 0.88 }, { x: 0.17, y: 0.88 },
];

const ALL_TYPES: CarType[] = ['small', 'family', 'suv'];

function randomType(): CarType {
  return ALL_TYPES[Math.floor(Math.random() * ALL_TYPES.length)];
}

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function useGameEngine() {
  const [gameState, setGameState] = useState<GameState>('lobby');
  const [numPlayers, setNumPlayers] = useState<1 | 2>(2);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [scores, setScores] = useState({ player1: 0, player2: 0 });
  const [cars, setCars] = useState<Car[]>([]);
  const [parkingSpots, setParkingSpots] = useState<ParkingSpot[]>([]);
  const [bonusCamera, setBonusCamera] = useState<BonusCamera | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const initCars = useCallback((players: 1 | 2) => {
    const newCars: Car[] = [];

    // Two of each type, shuffled so order is random
    const types: CarType[] = shuffled(['small', 'small', 'family', 'family', 'suv', 'suv']);

    if (players === 2) {
      types.forEach((type, index) => {
        const slot = P2_SLOTS[index];
        newCars.push({
          id: `p2-${index}`,
          type,
          playerId: 'player2',
          isParked: false,
          isDragging: false,
          x: slot.x,
          y: slot.y,
          originalX: slot.x,
          originalY: slot.y,
        });
      });
    }

    const typesP1: CarType[] = shuffled(['small', 'small', 'family', 'family', 'suv', 'suv']);
    typesP1.forEach((type, index) => {
      const slot = P1_SLOTS[index];
      newCars.push({
        id: `p1-${index}`,
        type,
        playerId: 'player1',
        isParked: false,
        isDragging: false,
        x: slot.x,
        y: slot.y,
        originalX: slot.x,
        originalY: slot.y,
      });
    });

    setCars(newCars);
  }, []);

  // Spawn a replacement car for a player after a car is parked
  const addNewCarForPlayer = useCallback((playerId: PlayerId) => {
    const slots = playerId === 'player1' ? P1_SLOTS : P2_SLOTS;
    setCars(prev => {
      // Always check active count inside the functional update (avoids race conditions)
      const activeCars = prev.filter(c => !c.isParked && c.playerId === playerId);
      if (activeCars.length >= 6) return prev;

      const occupied = new Set(activeCars.map(c => `${c.originalX},${c.originalY}`));
      const freeSlot = slots.find(s => !occupied.has(`${s.x},${s.y}`));
      if (!freeSlot) return prev;

      const newCar: Car = {
        id: `${playerId}-respawn-${Date.now()}`,
        type: randomType(),
        playerId,
        isParked: false,
        isDragging: false,
        x: freeSlot.x,
        y: freeSlot.y,
        originalX: freeSlot.x,
        originalY: freeSlot.y,
      };
      return [...prev, newCar];
    });
  }, []);

  const startGame = useCallback((players: 1 | 2) => {
    setNumPlayers(players);
    setGameState('countdown');
    setTimeout(() => {
      setGameState('playing');
      setTimeLeft(GAME_DURATION);
      setScores({ player1: 0, player2: 0 });
      initCars(players);
      setParkingSpots([]);
    }, 4000);
  }, [initCars]);

  // Timer
  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setGameState('gameover');
            clearInterval(timerRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState]);

  // Spawn parking spots
  useEffect(() => {
    if (gameState !== 'playing') return;
    const spawnInterval = setInterval(() => {
      setParkingSpots(prev => {
        const activeSpots = prev.filter(s => !s.parkedBy);
        if (activeSpots.length >= 8) return prev;
        const newSpot: ParkingSpot = {
          id: `spot-${Date.now()}`,
          type: randomType(),
          x: 0.26 + Math.random() * 0.48,
          y: 0.25 + Math.random() * 0.60,
          parkedBy: null,
          createdAt: Date.now(),
          gif: SPOT_GIFS[Math.floor(Math.random() * SPOT_GIFS.length)],
        };
        return [...prev, newSpot];
      });
    }, 2000);
    return () => clearInterval(spawnInterval);
  }, [gameState]);

  // Remove old unparked spots
  useEffect(() => {
    if (gameState !== 'playing') return;
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setParkingSpots(prev => prev.filter(s => s.parkedBy || now - s.createdAt < 15000));
    }, 1000);
    return () => clearInterval(cleanupInterval);
  }, [gameState]);

  // Bonus camera: spawn once every ~20-35 seconds during gameplay, visible for 9 seconds
  useEffect(() => {
    if (gameState !== 'playing') {
      setBonusCamera(null);
      return;
    }

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const scheduleSpawn = (delay: number) => {
      const t = setTimeout(() => {
        if (cancelled) return;
        const id = `bonus-${Date.now()}`;
        // Spawn in the middle playfield, away from player panels
        const x = 0.30 + Math.random() * 0.40;
        const y = 0.22 + Math.random() * 0.46;
        setBonusCamera({ id, x, y });

        // Auto-despawn after 9 s, then schedule next appearance
        const t2 = setTimeout(() => {
          if (cancelled) return;
          setBonusCamera(prev => (prev?.id === id ? null : prev));
          scheduleSpawn(16000 + Math.random() * 10000); // 16-26 s gap
        }, 9000);
        timers.push(t2);
      }, delay);
      timers.push(t);
    };

    scheduleSpawn(13000 + Math.random() * 9000); // first: 13-22 s in

    return () => {
      cancelled = true;
      timers.forEach(t => clearTimeout(t));
      setBonusCamera(null);
    };
  }, [gameState]);

  // Award +5 points and remove the bonus camera
  const collectBonusCamera = useCallback((playerId: PlayerId) => {
    setBonusCamera(null);
    setScores(prev => ({ ...prev, [playerId]: prev[playerId] + 5 }));
  }, []);

  return {
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
  };
}
