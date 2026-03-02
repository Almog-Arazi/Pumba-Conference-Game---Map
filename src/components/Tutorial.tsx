import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Car2D } from './Car2D';
import type { CarType } from '../hooks/useGameEngine';
import type { HandState } from '../hooks/useHandTracking';
import type { Results } from '@mediapipe/hands';
import type { PlayerRegistration } from '../types/registration';

// ─── shared colour maps ────────────────────────────────────────────────────

const TYPE_COLOR: Record<CarType, string> = {
  small:  '#FFD700',
  family: '#33FFCC',
  suv:    '#FF9933',
};
const TYPE_LABEL: Record<CarType, string> = { small: 'S', family: 'M', suv: 'L' };
// "Large" instead of "SUV" throughout the tutorial
const TYPE_NAME: Record<CarType, string> = { small: 'Small', family: 'Family', suv: 'Large' };

const CAR_FITS: Record<CarType, CarType[]> = {
  small:  ['small', 'family', 'suv'],
  family: ['family', 'suv'],
  suv:    ['suv'],
};
const CAR_TYPES: CarType[] = ['small', 'family', 'suv'];

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
];

// ─── Step 1 decoration data ────────────────────────────────────────────────

const FLOATING_CARS: { type: CarType; color: string; left: string; top: string; delay: number; size: number }[] = [
  { type: 'small',  color: '#33CCFF', left: '3%',  top: '12%', delay: 0,   size: 58 },
  { type: 'family', color: '#FF3366', left: '88%', top: '8%',  delay: 0.5, size: 70 },
  { type: 'suv',    color: '#33CCFF', left: '12%', top: '72%', delay: 1,   size: 78 },
  { type: 'small',  color: '#FF3366', left: '78%', top: '68%', delay: 1.5, size: 54 },
  { type: 'family', color: '#33CCFF', left: '46%', top: '4%',  delay: 0.8, size: 64 },
  { type: 'suv',    color: '#FF3366', left: '91%', top: '42%', delay: 1.2, size: 74 },
  { type: 'small',  color: '#33CCFF', left: '2%',  top: '48%', delay: 0.3, size: 56 },
  { type: 'family', color: '#FF3366', left: '62%', top: '82%', delay: 1.7, size: 66 },
  { type: 'suv',    color: '#33CCFF', left: '73%', top: '22%', delay: 0.6, size: 72 },
  { type: 'small',  color: '#FF3366', left: '25%', top: '84%', delay: 2,   size: 60 },
];
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

const FLOATING_PINS: { left: string; top: string; delay: number; size: number; gif: string }[] = [
  { left: '33%', top: '5%',  delay: 0.4, size: 44, gif: SPOT_GIFS[0] },
  { left: '57%', top: '75%', delay: 1.1, size: 52, gif: SPOT_GIFS[1] },
  { left: '87%', top: '56%', delay: 0.7, size: 38, gif: SPOT_GIFS[2] },
  { left: '8%',  top: '30%', delay: 1.5, size: 48, gif: SPOT_GIFS[3] },
  { left: '65%', top: '13%', delay: 0.9, size: 42, gif: SPOT_GIFS[4] },
  { left: '42%', top: '88%', delay: 0.2, size: 36, gif: SPOT_GIFS[5] },
  { left: '20%', top: '60%', delay: 1.8, size: 50, gif: SPOT_GIFS[6] },
];

// ─── CameraPreview ─────────────────────────────────────────────────────────

function CameraPreview({ cameraRef }: { cameraRef: React.RefObject<HTMLVideoElement | null> }) {
  const localRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const sync = () => {
      const src = cameraRef.current?.srcObject;
      if (src && localRef.current && localRef.current.srcObject !== src) {
        localRef.current.srcObject = src as MediaStream;
        localRef.current.play().catch(() => {});
      }
    };
    sync();
    const timer = setInterval(sync, 600);
    return () => clearInterval(timer);
  }, [cameraRef]);

  return (
    <video
      ref={localRef}
      autoPlay
      playsInline
      muted
      className="absolute inset-0 w-full h-full object-cover"
      style={{ transform: 'scaleX(-1)' }}
    />
  );
}

// ─── HandCanvas – draws coloured MediaPipe landmarks ──────────────────────

const CANVAS_W = 1280;
const CANVAS_H = 720;

function HandCanvas({ results, numPlayers }: { results: Results | null; numPlayers: 1 | 2 }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    if (!results?.multiHandLandmarks) return;

    results.multiHandLandmarks.forEach((landmarks) => {
      const wrist = landmarks[0];
      // In 2-player mode: right hand (raw x < 0.5) → P1 blue, left hand → P2 red.
      // In 1-player mode: always blue regardless of which side.
      const color = numPlayers === 2 && wrist.x >= 0.5 ? '#FF3366' : '#33CCFF';

      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.fillStyle = color;

      ctx.beginPath();
      HAND_CONNECTIONS.forEach(([i, j]) => {
        ctx.moveTo(landmarks[i].x * CANVAS_W, landmarks[i].y * CANVAS_H);
        ctx.lineTo(landmarks[j].x * CANVAS_W, landmarks[j].y * CANVAS_H);
      });
      ctx.stroke();

      ctx.shadowBlur = 0;
      landmarks.forEach((lm) => {
        ctx.beginPath();
        ctx.arc(lm.x * CANVAS_W, lm.y * CANVAS_H, 5, 0, 2 * Math.PI);
        ctx.fill();
      });
    });
  }, [results]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ transform: 'scaleX(-1)' }}
    />
  );
}

// ─── LargeHandPanel ── side-mounted, very visible player hand indicator ────

function LargeHandPanel({
  color,
  label,
  isGrabbing,
  detected,
}: {
  color: string;
  label: string;
  isGrabbing: boolean;
  detected: boolean;
}) {
  const emoji = detected ? (isGrabbing ? '✊' : '✋') : null;
  const stateText = detected ? (isGrabbing ? 'GRAB!' : 'OPEN') : '—';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3, type: 'spring', stiffness: 260, damping: 22 }}
      className="flex flex-col items-center gap-3 select-none flex-shrink-0"
      style={{ width: 130 }}
    >
      {/* Player badge */}
      <div
        className="px-4 py-1 rounded-full font-black text-sm tracking-widest"
        style={{
          background: `${color}20`,
          border: `2px solid ${color}99`,
          color,
        }}
      >
        {label}
      </div>

      {/* Huge emoji — bounces when state changes */}
      <motion.div
        key={emoji ?? 'none'}
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 18 }}
        style={{
          fontSize: 100,
          lineHeight: 1,
          filter: detected ? `drop-shadow(0 0 18px ${color}) drop-shadow(0 0 36px ${color}88)` : 'none',
          opacity: detected ? 1 : 0.2,
        }}
      >
        {emoji ?? '✋'}
      </motion.div>

      {/* State label */}
      <motion.div
        key={stateText}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-black text-base tracking-widest uppercase"
        style={{ color: detected ? color : 'rgba(255,255,255,0.18)' }}
      >
        {stateText}
      </motion.div>

    </motion.div>
  );
}

// ─── SpotTile (Step 3) ─────────────────────────────────────────────────────

function SpotTile({ type, compatible }: { type: CarType; compatible: boolean }) {
  const col = TYPE_COLOR[type];
  return (
    <motion.div
      animate={{
        boxShadow: compatible ? `0 0 24px ${col}, 0 0 8px ${col}` : 'none',
        borderColor: compatible ? col : 'rgba(255,255,255,0.15)',
        scale: compatible ? 1.06 : 1,
      }}
      transition={{ duration: 0.3 }}
      className="relative flex flex-col items-center justify-center rounded-xl border-2"
      style={{
        width: 72,
        height: 72,
        background: compatible
          ? `radial-gradient(circle, ${col}22, transparent 70%)`
          : 'rgba(255,255,255,0.04)',
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
        style={{ background: col, opacity: compatible ? 1 : 0.3 }}
      />
      <span
        className="font-black text-lg"
        style={{ color: compatible ? col : 'rgba(255,255,255,0.35)' }}
      >
        {TYPE_LABEL[type]}
      </span>
      <span
        className="text-[9px] tracking-widest uppercase mt-0.5"
        style={{ color: compatible ? col : 'rgba(255,255,255,0.25)' }}
      >
        {TYPE_NAME[type]}
      </span>
      <AnimatePresence>
        <motion.div
          key={compatible ? 'check' : 'x'}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
          style={{
            background: compatible ? col : 'rgba(255,51,51,0.9)',
            color: compatible ? '#000' : '#fff',
          }}
        >
          {compatible ? '✓' : '✕'}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

// ─── StepRegister – player registration ────────────────────────────────────

const EMPTY_REG: PlayerRegistration = { name: '', company: '', contact: '' };

function PlayerForm({
  label,
  color,
  value,
  onChange,
}: {
  label: string;
  color: string;
  value: PlayerRegistration;
  onChange: (r: PlayerRegistration) => void;
}) {
  const field = (
    placeholder: string,
    key: keyof PlayerRegistration,
    large?: boolean,
  ) => (
    <input
      type="text"
      placeholder={placeholder}
      value={value[key]}
      onChange={e => onChange({ ...value, [key]: e.target.value })}
      className="w-full rounded-xl outline-none transition-all"
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: `1.5px solid ${value[key] ? color + '80' : 'rgba(255,255,255,0.12)'}`,
        color: '#fff',
        padding: large ? '14px 18px' : '10px 16px',
        fontSize: large ? 20 : 15,
        fontWeight: large ? 700 : 400,
      }}
    />
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col gap-3 flex-1"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: `2px solid ${color}30`,
        borderRadius: 20,
        padding: '24px 20px',
        minWidth: 260,
      }}
    >
      <div
        className="text-xs font-black tracking-widest uppercase mb-1 self-start px-3 py-1 rounded-full"
        style={{ background: `${color}20`, color }}
      >
        {label}
      </div>
      {field('Full Name *', 'name', true)}
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: -6, marginLeft: 4 }}>
        Company *
      </div>
      {field('Company / Organization', 'company')}
      {field('Phone or Email (optional)', 'contact')}
    </motion.div>
  );
}

function StepRegister({
  numPlayers,
  onChangeNumPlayers,
  registrations,
  onChangeRegistrations,
}: {
  numPlayers: 1 | 2;
  onChangeNumPlayers: (n: 1 | 2) => void;
  registrations: PlayerRegistration[];
  onChangeRegistrations: (r: PlayerRegistration[]) => void;
}) {
  const setPlayer = (idx: number, r: PlayerRegistration) => {
    const next = [...registrations];
    next[idx] = r;
    onChangeRegistrations(next);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-8"
    >
      <motion.span
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xs uppercase tracking-[0.25em] font-bold"
        style={{ color: '#33FFCC' }}
      >
        01 — Players
      </motion.span>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-3xl font-black text-white"
      >
        Who's playing?
      </motion.h2>

      {/* 1P / 2P toggle */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15 }}
        className="flex items-center gap-1 p-1 rounded-full"
        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
      >
        {([1, 2] as const).map(n => (
          <button
            key={n}
            onClick={() => onChangeNumPlayers(n)}
            className="px-6 py-2 rounded-full font-black text-sm tracking-wider transition-all"
            style={
              numPlayers === n
                ? { background: '#33FFCC', color: '#060a14' }
                : { color: 'rgba(255,255,255,0.45)' }
            }
          >
            {n === 1 ? '1 Player' : '2 Players'}
          </button>
        ))}
      </motion.div>

      {/* Player forms */}
      <div className="flex gap-5 w-full max-w-2xl">
        {numPlayers === 2 && (
          <PlayerForm
            label="Player 2"
            color="#FF3366"
            value={registrations[1] ?? EMPTY_REG}
            onChange={r => setPlayer(1, r)}
          />
        )}
        <PlayerForm
          label="Player 1"
          color="#33CCFF"
          value={registrations[0] ?? EMPTY_REG}
          onChange={r => setPlayer(0, r)}
        />
      </div>

      <p className="text-white/30 text-xs">* Required fields</p>
    </motion.div>
  );
}

// ─── Step 1 – Goal ─────────────────────────────────────────────────────────

function Step1() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center gap-6"
    >
      {/* 10 floating cars */}
      {FLOATING_CARS.map((car, i) => (
        <motion.div
          key={i}
          className="absolute opacity-[0.11] pointer-events-none"
          style={{ left: car.left, top: car.top, width: car.size, height: car.size }}
          animate={{ y: [0, -10, 0], rotate: [0, 2, -2, 0] }}
          transition={{ duration: 3.5 + (i % 3) * 0.8, repeat: Infinity, ease: 'easeInOut', delay: car.delay }}
        >
          <Car2D color={car.color} type={car.type} />
        </motion.div>
      ))}

      {/* Floating map-pin / location markers with parking spot photo cards */}
      {FLOATING_PINS.map((pin, i) => (
        <motion.div
          key={`pin-${i}`}
          className="absolute pointer-events-none flex flex-col items-center"
          style={{ left: pin.left, top: pin.top }}
          initial={{ opacity: 0, y: 12, scale: 0.85 }}
          animate={{ opacity: 1, y: [0, -8, 0], scale: 1 }}
          transition={{ duration: 4 + (i % 3) * 0.8, repeat: Infinity, ease: 'easeInOut', delay: pin.delay }}
        >
          {/* Pin icon */}
          <img
            src="/logo_2.svg"
            alt=""
            style={{ width: pin.size, height: 'auto', display: 'block', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))' }}
          />

          {/* White-framed parking spot photo */}
          <div
            style={{
              background: '#fff',
              borderRadius: 6,
              padding: '4px 4px 2px',
              boxShadow: '0 4px 18px rgba(0,0,0,0.55)',
              width: pin.size * 2.2,
              marginTop: 4,
            }}
          >
            <div style={{ borderRadius: 3, overflow: 'hidden', lineHeight: 0 }}>
              <img
                src={`/${pin.gif}`}
                alt="parking spot"
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            </div>
            {/* "Now" label like the reference design */}
            <div
              style={{
                background: '#1a8c3c',
                borderRadius: '0 0 3px 3px',
                textAlign: 'center',
                padding: '2px 0',
                fontSize: pin.size * 0.22,
                fontWeight: 800,
                color: '#fff',
                letterSpacing: '0.08em',
              }}
            >
              Now
            </div>
          </div>
        </motion.div>
      ))}

      <motion.img
        src="/logo_2.svg"
        alt="Pumba"
        initial={{ opacity: 0, y: -20, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.05, type: 'spring', stiffness: 220, damping: 20 }}
        className="drop-shadow-[0_0_40px_rgba(51,255,204,0.5)]"
        style={{ height: 240 }}
      />

      <motion.span
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-xs uppercase tracking-[0.25em] font-bold"
        style={{ color: '#33FFCC' }}
      >
        01 — Goal
      </motion.span>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-8xl font-black leading-none text-white"
        style={{ textShadow: '0 0 60px rgba(51,255,204,0.5)' }}
      >
        Park it in<br />
        <span style={{ color: '#33FFCC' }}>Tel Aviv</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="text-xl text-white/70 max-w-md leading-relaxed"
      >
        Grab cars with your hand and park them in matching spots.
        The player who parks the{' '}
        <span className="text-white font-bold">most cars</span> wins!
      </motion.p>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, type: 'spring' }}
        className="flex items-center gap-4 px-6 py-3 rounded-2xl"
        style={{ background: 'rgba(51,255,204,0.08)', border: '1px solid rgba(51,255,204,0.2)' }}
      >
        <span className="text-3xl">🏆</span>
        <span className="text-white/80 text-base">60 seconds · most parked cars wins</span>
      </motion.div>
    </motion.div>
  );
}

// ─── Step 2 – Controls ─────────────────────────────────────────────────────

function Step2({
  cameraRef,
  isReady,
  rawResults,
  handsState,
  numPlayers,
  onChangeNumPlayers,
}: {
  onNext: () => void;
  onPrev: () => void;
  cameraRef: React.RefObject<HTMLVideoElement | null>;
  isReady: boolean;
  numPlayers: 1 | 2;
  onChangeNumPlayers: (n: 1 | 2) => void;
  rawResults: Results | null;
  handsState: { player1: HandState | null; player2: HandState | null };
}) {
  const p1 = handsState.player1;
  const p2 = handsState.player2;

  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4"
    >
      {/* Step label + title */}
      <motion.span
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-xs uppercase tracking-[0.25em] font-bold"
        style={{ color: '#33FFCC' }}
      >
        03 — Controls
      </motion.span>
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="text-2xl font-black text-white"
      >
        Place your <span style={{ color: '#33FFCC' }}>hand</span> in front of the camera
      </motion.h2>

      {/* ── camera row: [P2?] | camera | [P1] ── */}
      <div className="flex items-center gap-4 w-full">

        {/* P2 panel — only in 2-player mode */}
        <AnimatePresence>
          {numPlayers === 2 && (
            <motion.div
              key="p2"
              initial={{ opacity: 0, x: -20, width: 0 }}
              animate={{ opacity: 1, x: 0, width: 140 }}
              exit={{ opacity: 0, x: -20, width: 0 }}
              transition={{ duration: 0.3 }}
              className="relative flex items-center justify-center flex-shrink-0 overflow-hidden"
            >
              <LargeHandPanel
                color="#FF3366"
                label="P2"
                isGrabbing={p2?.isGrabbing ?? false}
                detected={!!p2}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Camera */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="relative rounded-2xl overflow-hidden flex-1"
          style={{
            aspectRatio: '16/9',
            border: '2px solid rgba(255,255,255,0.1)',
            boxShadow: '0 0 50px rgba(0,0,0,0.6)',
            background: '#0d1221',
            maxHeight: 800,
          }}
        >
          {isReady ? (
            <>
              <CameraPreview cameraRef={cameraRef} />
              <HandCanvas results={rawResults} numPlayers={numPlayers} />
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/40">
              <div
                className="w-10 h-10 border-2 rounded-full animate-spin"
                style={{ borderColor: 'rgba(51,255,204,0.4)', borderTopColor: 'transparent' }}
              />
              <span className="text-sm">Starting camera…</span>
            </div>
          )}

          {/* Black dashed divider — only in 2P */}
          {numPlayers === 2 && (
            <div
              className="absolute inset-y-0 left-1/2 pointer-events-none"
              style={{
                width: 0,
                borderLeft: '3px dashed rgba(0,0,0,0.9)',
                filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.2))',
              }}
            />
          )}

          {/* Player badges */}
          {numPlayers === 2 && (
            <div
              className="absolute top-3 left-4 text-xs font-black tracking-wider px-2 py-1 rounded-lg"
              style={{ background: 'rgba(255,51,102,0.8)', color: '#fff' }}
            >
              P2
            </div>
          )}
          <div
            className="absolute top-3 right-4 text-xs font-black tracking-wider px-2 py-1 rounded-lg"
            style={{ background: 'rgba(51,204,255,0.8)', color: '#fff' }}
          >
            P1
          </div>
        </motion.div>

        {/* P1 panel — always visible on the right */}
        <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: 140 }}>
          <LargeHandPanel
            color="#33CCFF"
            label="P1"
            isGrabbing={p1?.isGrabbing ?? false}
            detected={!!p1}
          />
        </div>
      </div>

      {/* Gesture guide */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex items-center gap-5 mt-8"
      >
        {[
          { icon: '✋', label: 'Open hand', desc: 'Hover over car' },
          { arrow: true },
          { icon: '✊', label: 'Close fist', desc: 'Grab & drag' },
          { arrow: true },
          { icon: '✋', label: 'Open hand', desc: 'Release to park' },
        ].map((item, i) =>
          'arrow' in item ? (
            <span key={i} className="text-white/30 text-xl select-none">→</span>
          ) : (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <span className="text-2xl">{item.icon}</span>
              <span className="text-white/80 text-xs font-bold">{item.label}</span>
              <span className="text-white/40 text-[10px]">{item.desc}</span>
            </div>
          )
        )}
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-sm px-4 py-1.5 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}
      >
        <span className="font-bold text-white">2 players:</span> stand on opposite sides of the camera
      </motion.p>
    </motion.div>
  );
}

// ─── Step 3 – Car types ─────────────────────────────────────────────────────

const ANIM_CYCLE_MS = 2200;

function Step3() {
  const [activeCar, setActiveCar] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActiveCar(prev => (prev + 1) % CAR_TYPES.length), ANIM_CYCLE_MS);
    return () => clearInterval(id);
  }, []);

  const currentType = CAR_TYPES[activeCar];
  const fitsSpots   = CAR_FITS[currentType];

  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 flex flex-col items-center justify-center px-8 gap-5"
    >
      <motion.span
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-xs uppercase tracking-[0.25em] font-bold"
        style={{ color: '#33FFCC' }}
      >
        03 — Car Types
      </motion.span>

      <h2 className="text-4xl font-black text-white text-center">
        Match cars to their <span style={{ color: '#33FFCC' }}>parking spots</span>
      </h2>

      <div className="flex flex-col items-center gap-5 w-full max-w-2xl">
        {/* Cars row */}
        <div className="flex items-end justify-center gap-8">
          {CAR_TYPES.map((type, i) => {
            const isActive = i === activeCar;
            const col = TYPE_COLOR[type];
            return (
              <motion.div
                key={type}
                animate={{ scale: isActive ? 1.1 : 0.88, opacity: isActive ? 1 : 0.4 }}
                transition={{ duration: 0.35 }}
                className="flex flex-col items-center gap-2"
              >
                <div
                  className="rounded-2xl p-1 transition-all duration-300"
                  style={{
                    width: 90, height: 90,
                    background: isActive ? `${col}18` : 'transparent',
                    border: `2px solid ${isActive ? col : 'transparent'}`,
                    boxShadow: isActive ? `0 0 22px ${col}55` : 'none',
                  }}
                >
                  <Car2D color={col} type={type} />
                </div>
                <span
                  className="text-xs font-black tracking-widest uppercase"
                  style={{ color: isActive ? col : 'rgba(255,255,255,0.3)' }}
                >
                  {TYPE_NAME[type]}
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* Animated arrow row */}
        <div className="flex justify-center gap-8">
          {CAR_TYPES.map((type, i) => {
            const isActive = i === activeCar;
            const col = TYPE_COLOR[type];
            return (
              <div key={type} className="flex flex-col items-center" style={{ width: 90 }}>
                {isActive && (
                  <motion.div
                    initial={{ scaleY: 0, opacity: 0 }}
                    animate={{ scaleY: 1, opacity: 1 }}
                    className="flex flex-col items-center"
                  >
                    <div className="w-0.5 h-6" style={{ background: col }} />
                    <div style={{
                      width: 0, height: 0,
                      borderLeft: '5px solid transparent',
                      borderRight: '5px solid transparent',
                      borderTop: `8px solid ${col}`,
                    }} />
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>

        {/* Parking spots row */}
        <div className="flex items-start justify-center gap-8">
          {CAR_TYPES.map(spotType => (
            <SpotTile key={spotType} type={spotType} compatible={fitsSpots.includes(spotType)} />
          ))}
        </div>
      </div>

      {/* Rule callout */}
      <motion.div
        key={currentType}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 px-5 py-3 rounded-2xl text-sm font-bold"
        style={{
          background: `${TYPE_COLOR[currentType]}18`,
          border:     `1px solid ${TYPE_COLOR[currentType]}44`,
          color:       TYPE_COLOR[currentType],
        }}
      >
        <span className="text-xl">
          {currentType === 'small' ? '🚗' : currentType === 'family' ? '🚙' : '🛻'}
        </span>
        {currentType === 'small'  && 'Small car fits in ANY parking spot!'}
        {currentType === 'family' && 'Family car fits in Family or Large spots'}
        {currentType === 'suv'    && 'Large car only fits in Large spots'}
      </motion.div>

      {/* Bonus Camera callout */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex items-center gap-6 px-7 py-5 rounded-3xl w-full max-w-lg"
        style={{
          background: 'rgba(255,215,0,0.10)',
          border: '2px solid rgba(255,215,0,0.5)',
          boxShadow: '0 0 32px rgba(255,215,0,0.15)',
        }}
      >
        {/* Camera thumbnail */}
        <div
          className="rounded-xl overflow-hidden flex-shrink-0"
          style={{
            width: 90,
            boxShadow: '0 0 20px #FFD70088',
            border: '2px solid #FFD700AA',
          }}
        >
          <img src="/bonus-camera.jpg" alt="Bonus Camera" className="w-full h-auto block" />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span
              className="text-base font-black tracking-widest uppercase"
              style={{ color: '#FFD700' }}
            >
              Bonus Camera
            </span>
            <span
              className="px-3 py-1 rounded-full text-sm font-black"
              style={{ background: '#FFD700', color: '#000' }}
            >
              +5 pts
            </span>
          </div>
          <span className="text-white/65 text-sm leading-relaxed">
            Grab the security camera when it appears —<br />
            instant <span className="text-yellow-300 font-bold">+5 point bonus!</span> It spawns rarely, don't miss it!
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Tutorial ─────────────────────────────────────────────────────────

// Step order: 0=Goal, 1=Register, 2=Camera, 3=Cars
const TOTAL_STEPS = 4;

export interface TutorialProps {
  onDone: (numPlayers: 1 | 2, registrations: PlayerRegistration[]) => void;
  cameraRef: React.RefObject<HTMLVideoElement | null>;
  isReady: boolean;
  rawResults: Results | null;
  handsState: { player1: HandState | null; player2: HandState | null };
}

export function Tutorial({ onDone, cameraRef, isReady, rawResults, handsState }: TutorialProps) {
  const [step, setStep] = useState(0);
  const [numPlayers, setNumPlayers] = useState<1 | 2>(2);
  const [registrations, setRegistrations] = useState<PlayerRegistration[]>([
    { name: '', company: '', contact: '' },
    { name: '', company: '', contact: '' },
  ]);

  // Require name+company on the registration step before proceeding
  const canProceed = step !== 1 || (
    registrations[0].name.trim() !== '' && registrations[0].company.trim() !== '' &&
    (numPlayers === 1 || (registrations[1].name.trim() !== '' && registrations[1].company.trim() !== ''))
  );

  const done = () => onDone(numPlayers, registrations.slice(0, numPlayers));
  const next = () => { if (!canProceed) return; step < TOTAL_STEPS - 1 ? setStep(step + 1) : done(); };
  const prev = () => setStep(Math.max(0, step - 1));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[200] overflow-hidden"
      style={{ background: '#080c18' }}
    >
      {/* Subtle grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 pt-5 z-10">
        <img src="/logo_2.svg" alt="Pumba" className="h-8 opacity-80" />
        <button
          onClick={done}
          className="text-white/30 hover:text-white/70 text-xs tracking-[0.2em] uppercase transition-colors font-bold"
        >
          Skip →
        </button>
      </div>

      {/* Step dots */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <button
            key={i}
            onClick={() => setStep(i)}
            className="transition-all duration-300 rounded-full"
            style={{
              width: i === step ? 28 : 8,
              height: 8,
              background: i === step ? '#33FFCC' : 'rgba(255,255,255,0.2)',
            }}
          />
        ))}
      </div>

      {/* Step content */}
      <div className="absolute inset-0 pt-16 pb-20">
        <AnimatePresence mode="wait">
          {step === 0 && <Step1 key="s1" />}
          {step === 1 && (
            <StepRegister
              key="sr"
              numPlayers={numPlayers}
              onChangeNumPlayers={setNumPlayers}
              registrations={registrations}
              onChangeRegistrations={setRegistrations}
            />
          )}
          {step === 2 && (
            <Step2
              key="s2"
              onNext={next}
              onPrev={prev}
              cameraRef={cameraRef}
              isReady={isReady}
              numPlayers={numPlayers}
              onChangeNumPlayers={setNumPlayers}
              rawResults={rawResults}
              handsState={handsState}
            />
          )}
          {step === 3 && <Step3 key="s3" />}
        </AnimatePresence>
      </div>

      {/* Bottom nav */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-12 pb-6 z-10">
        <button
          onClick={prev}
          disabled={step === 0}
          className="font-bold text-base transition-all"
          style={{ color: step === 0 ? 'transparent' : 'rgba(255,255,255,0.45)' }}
        >
          ← Back
        </button>
        <motion.button
          onClick={next}
          whileHover={canProceed ? { scale: 1.04 } : {}}
          whileTap={canProceed ? { scale: 0.97 } : {}}
          className="px-8 py-3 rounded-2xl font-black text-base tracking-wide transition-opacity"
          style={{
            background: 'linear-gradient(135deg, #33FFCC 0%, #00AAFF 100%)',
            color: '#060a14',
            boxShadow: canProceed ? '0 0 28px rgba(51,255,204,0.35)' : 'none',
            opacity: canProceed ? 1 : 0.35,
            cursor: canProceed ? 'pointer' : 'not-allowed',
          }}
        >
          {step === TOTAL_STEPS - 1 ? "Let's Park! 🚗" : 'Next →'}
        </motion.button>
      </div>
    </motion.div>
  );
}
