import { HOOP, type Vec3 } from './courtGeometry';

/**
 * Where the rim centre is right now. The hoop moves at higher levels: the Hoop component
 * writes this every frame and balls read it for basket detection. A plain mutable object
 * on purpose (per-frame data must not go through React state).
 */
export const liveHoopCenter: Vec3 = { ...HOOP.center };

export interface HoopMotion {
  phase: number;
  sway: number;
  bob: number;
}

export interface HoopMotionTarget {
  hoopSwayM: number;
  hoopBobM: number;
  hoopPeriodMs: number;
}

/** Seconds for the travel to ease ~63% of the way to a new level's amplitude. */
const EASE_SECONDS = 0.8;

/**
 * Advances the hoop motion by `dt` seconds and returns the offset from the regulation
 * position. Amplitudes ease in so a level-up never teleports the hoop.
 */
export function stepHoopMotion(
  motion: HoopMotion,
  target: HoopMotionTarget,
  dt: number,
): { x: number; y: number } {
  const k = 1 - Math.exp(-dt / EASE_SECONDS);
  motion.sway += (target.hoopSwayM - motion.sway) * k;
  motion.bob += (target.hoopBobM - motion.bob) * k;
  motion.phase += (dt * Math.PI * 2 * 1000) / Math.max(500, target.hoopPeriodMs);
  return {
    x: motion.sway * Math.sin(motion.phase),
    // Bob twice per sway cycle: the hoop draws a figure-eight at the top level.
    y: motion.bob * Math.sin(motion.phase * 2),
  };
}
