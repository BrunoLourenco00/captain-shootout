import type { Vec3 } from './courtGeometry';

export interface ShotTuning {
  /** Aim this many metres past the rim centre; gives clearance over the front rim. */
  aimDepthBias: number;
  /** Seconds for an ideal shot to reach rim height on the way down. Higher = more arc. */
  flightTime: number;
  /** Power within ±assistZone of 0.5 lands exactly on target (arcade forgiveness). */
  powerAssistZone: number;
  /** Distance multiplier at power 0 and 1 (power 0.5 = 1.0). */
  minDistanceFactor: number;
  maxDistanceFactor: number;
  /** |directionX| below this is treated as straight. */
  aimDeadZone: number;
  /** Aim angle at directionX = ±1, in radians. */
  maxAimAngle: number;
  gravity: number;
}

export const DEFAULT_SHOT_TUNING: ShotTuning = {
  aimDepthBias: 0.05,
  flightTime: 1.15,
  powerAssistZone: 0.12,
  minDistanceFactor: 0.72,
  maxDistanceFactor: 1.28,
  aimDeadZone: 0.15,
  maxAimAngle: (14 * Math.PI) / 180,
  gravity: 9.81,
};

/** Rescales |v| outside a dead zone back to 0..1, keeping the sign. */
function applyDeadZone(value: number, deadZone: number): number {
  const magnitude = Math.abs(value);
  if (magnitude <= deadZone) return 0;
  return (Math.sign(value) * (magnitude - deadZone)) / (1 - deadZone);
}

export function distanceFactor(power: number, tuning: ShotTuning): number {
  // Map power 0..1 to -1..1 around the sweet spot, then flatten the centre.
  const offset = applyDeadZone(power * 2 - 1, tuning.powerAssistZone * 2);
  return offset >= 0
    ? 1 + offset * (tuning.maxDistanceFactor - 1)
    : 1 + offset * (1 - tuning.minDistanceFactor);
}

/**
 * Initial velocity for a shot. A centred shot with power in the sweet spot follows a
 * ballistic arc that reaches rim height (just past the rim centre, see aimDepthBias)
 * on its way down after `flightTime` seconds.
 * Power scales the horizontal distance, directionX rotates the aim left/right.
 */
export function calculateShotVelocity(
  shot: { directionX: number; power: number },
  launch: Vec3,
  target: Vec3,
  tuning: ShotTuning = DEFAULT_SHOT_TUNING,
): Vec3 {
  const t = tuning.flightTime;
  const rawDx = target.x - launch.x;
  const rawDz = target.z - launch.z;
  const depth = 1 + tuning.aimDepthBias / Math.hypot(rawDx, rawDz);
  const dx = rawDx * depth;
  const dz = rawDz * depth;
  const dy = target.y - launch.y;

  const factor = distanceFactor(shot.power, tuning);
  const angle = applyDeadZone(shot.directionX, tuning.aimDeadZone) * tuning.maxAimAngle;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  // Rotate the horizontal target vector; positive directionX aims right (+X).
  const hx = (dx * cos - dz * sin) * factor;
  const hz = (dx * sin + dz * cos) * factor;

  return {
    x: hx / t,
    y: (dy + 0.5 * tuning.gravity * t * t) / t,
    z: hz / t,
  };
}
