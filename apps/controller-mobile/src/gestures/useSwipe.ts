import {
  normalizeSwipe,
  type GameConfig,
  type NormalizedSwipe,
  type Vec2,
} from '@captain/game-protocol';
import { useCallback, useRef, useState, type PointerEvent } from 'react';

export interface SwipeTrail {
  /** Element-relative coordinates. */
  start: Vec2;
  current: Vec2;
  /** Live preview of the shot the swipe would produce (null = would not shoot). */
  preview: NormalizedSwipe | null;
}

/**
 * Fixed-origin swipe on a single element using Pointer Events (mouse, touch and pen).
 * The shot fires on release. The element must have `touch-action: none`.
 */
export function useSwipe(
  enabled: boolean,
  gesture: GameConfig['gesture'],
  onSwipe: (shot: NormalizedSwipe) => void,
) {
  const [trail, setTrail] = useState<SwipeTrail | null>(null);
  const pointerId = useRef<number | null>(null);
  const startRef = useRef<Vec2 | null>(null);

  const measure = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const start = startRef.current ?? point;
      const preview = normalizeSwipe(
        { start, end: point, surface: { width: rect.width, height: rect.height } },
        gesture,
      );
      return { start, point, preview };
    },
    [gesture],
  );

  const onPointerDown = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      if (!enabled || pointerId.current !== null || !e.isPrimary) return;
      pointerId.current = e.pointerId;
      e.currentTarget.setPointerCapture(e.pointerId);
      const rect = e.currentTarget.getBoundingClientRect();
      const start = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      startRef.current = start;
      setTrail({ start, current: start, preview: null });
    },
    [enabled],
  );

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      if (e.pointerId !== pointerId.current) return;
      const { start, point, preview } = measure(e);
      setTrail({ start, current: point, preview });
    },
    [measure],
  );

  const end = useCallback(() => {
    pointerId.current = null;
    startRef.current = null;
    setTrail(null);
  }, []);

  const onPointerUp = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      if (e.pointerId !== pointerId.current) return;
      const { preview } = measure(e);
      end();
      if (enabled && preview) onSwipe(preview);
    },
    [enabled, end, measure, onSwipe],
  );

  return {
    trail,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: end },
  };
}
