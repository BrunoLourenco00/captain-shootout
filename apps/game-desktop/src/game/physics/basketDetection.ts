import type { Vec3 } from './courtGeometry';

export interface ScoringZone {
  center: Vec3;
  /** Max horizontal distance from the rim centre for the ball centre to count. */
  radius: number;
}

/**
 * True when the ball centre crossed the rim plane *downwards* between two frames,
 * inside the scoring radius. Balls going up through the hoop never count.
 */
export function crossedHoopDownward(prev: Vec3, curr: Vec3, zone: ScoringZone): boolean {
  const planeY = zone.center.y;
  if (!(prev.y >= planeY && curr.y < planeY)) return false;
  // Interpolate the crossing point so fast balls are not missed between frames.
  const t = (prev.y - planeY) / (prev.y - curr.y);
  const x = prev.x + (curr.x - prev.x) * t;
  const z = prev.z + (curr.z - prev.z) * t;
  return Math.hypot(x - zone.center.x, z - zone.center.z) <= zone.radius;
}
