import {
  normalizeSwipe,
  type GameConfig,
  type NormalizedSwipe,
  type Vec2,
} from '@captain/game-protocol';
import { useEffect } from 'react';

/**
 * Desktop stand-in for the phone controller (dev testing and demo mode).
 * - Mouse/touch drag upward anywhere: same swipe mapping as the phone.
 * - Space: a centred sweet-spot shot.
 */
export function useDemoInput(
  enabled: boolean,
  gesture: GameConfig['gesture'],
  onShot: (shot: NormalizedSwipe) => void,
): void {
  useEffect(() => {
    if (!enabled) return;
    let start: Vec2 | null = null;

    function onPointerDown(e: PointerEvent) {
      start = { x: e.clientX, y: e.clientY };
    }
    function onPointerUp(e: PointerEvent) {
      if (!start) return;
      const shot = normalizeSwipe(
        {
          start,
          end: { x: e.clientX, y: e.clientY },
          surface: { width: window.innerWidth, height: window.innerHeight },
        },
        gesture,
      );
      start = null;
      if (shot) onShot(shot);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        onShot({ directionX: 0, directionY: 0.35, power: 0.5 });
      }
    }

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [enabled, gesture, onShot]);
}
