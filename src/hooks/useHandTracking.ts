import { useEffect, useState, useCallback } from 'react';
import { Hands, Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

export type HandState = {
  x: number; // 0 to 1
  y: number; // 0 to 1
  isGrabbing: boolean;
  side: 'left' | 'right'; // Left half of camera (Player 2) or Right half (Player 1)
};

export function useHandTracking(videoRef: React.RefObject<HTMLVideoElement | null>, numPlayers: 1 | 2) {
  const [handsState, setHandsState] = useState<{ player1: HandState | null; player2: HandState | null }>({
    player1: null,
    player2: null,
  });
  const [rawResults, setRawResults] = useState<Results | null>(null);
  const [isReady, setIsReady] = useState(false);

  const onResults = useCallback((results: Results) => {
    setRawResults(results);
    if (!results.multiHandLandmarks || !results.multiHandedness) {
      setHandsState({ player1: null, player2: null });
      return;
    }

    let p1: HandState | null = null;
    let p2: HandState | null = null;

    results.multiHandLandmarks.forEach((landmarks) => {
      const wrist = landmarks[0];
      const indexMcp = landmarks[5];
      const pinkyMcp = landmarks[17];
      
      const centerX = (wrist.x + indexMcp.x + pinkyMcp.x) / 3;
      const centerY = (wrist.y + indexMcp.y + pinkyMcp.y) / 3;

      // Because the video is mirrored via CSS (-scale-x-100), the raw x coordinates are NOT mirrored.
      // So if the user's right hand is on the right side of their body, it appears on the left side of the raw camera image (x < 0.5).
      // But we want Player 1 (Right side of screen) to be controlled by the person on the right.
      // Let's just say: x < 0.5 is left side of raw image -> right side of mirrored screen -> Player 1.
      // x >= 0.5 is right side of raw image -> left side of mirrored screen -> Player 2.
      let side: 'left' | 'right' = 'right';
      if (numPlayers === 2) {
        side = centerX < 0.5 ? 'right' : 'left';
      }

      const indexTip = landmarks[8];
      const middleTip = landmarks[12];
      
      const distIndex = Math.hypot(indexTip.x - wrist.x, indexTip.y - wrist.y);
      const distMiddle = Math.hypot(middleTip.x - wrist.x, middleTip.y - wrist.y);
      
      // More forgiving grab threshold for smoother dragging
      const isGrabbing = distIndex < 0.25 && distMiddle < 0.25;

      const state: HandState = {
        x: centerX,
        y: centerY,
        isGrabbing,
        side,
      };

      if (side === 'right') {
        if (!p1) p1 = state;
      } else {
        if (!p2) p2 = state;
      }
    });

    setHandsState({ player1: p1, player2: p2 });
  }, [numPlayers]);

  useEffect(() => {
    if (!videoRef.current) return;

    let isCancelled = false;

    const hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      },
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.onResults(onResults);

    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        if (isCancelled) return;
        if (videoRef.current) {
          try {
            await hands.send({ image: videoRef.current });
          } catch (e) {
            console.error("Error sending to hands:", e);
          }
        }
      },
      width: 640,
      height: 480,
    });

    camera.start().then(() => {
      if (!isCancelled) setIsReady(true);
    });

    return () => {
      isCancelled = true;
      camera.stop();
      try {
        hands.close();
      } catch (e) {
        console.error("Error closing hands:", e);
      }
    };
  }, [videoRef, onResults]);

  return { handsState, isReady, rawResults };
}

