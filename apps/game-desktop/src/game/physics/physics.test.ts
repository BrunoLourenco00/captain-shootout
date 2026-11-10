import { describe, expect, it } from 'vitest';
import { crossedHoopDownward } from './basketDetection';
import { HOOP, LAUNCH_POSITION, type Vec3 } from './courtGeometry';
import { DEFAULT_SHOT_TUNING, calculateShotVelocity, distanceFactor } from './shotVelocity';

const zone = { center: HOOP.center, radius: 0.18 };

/** Position along a drag-free ballistic arc. */
function at(v: Vec3, t: number): Vec3 {
  const g = DEFAULT_SHOT_TUNING.gravity;
  return {
    x: LAUNCH_POSITION.x + v.x * t,
    y: LAUNCH_POSITION.y + v.y * t - 0.5 * g * t * t,
    z: LAUNCH_POSITION.z + v.z * t,
  };
}

describe('calculateShotVelocity', () => {
  it('a centred sweet-spot shot reaches rim height just past the centre, descending', () => {
    const v = calculateShotVelocity({ directionX: 0, power: 0.5 }, LAUNCH_POSITION, HOOP.center);
    const t = DEFAULT_SHOT_TUNING.flightTime;
    const p = at(v, t);
    expect(p.x).toBeCloseTo(HOOP.center.x);
    expect(p.y).toBeCloseTo(HOOP.center.y);
    expect(p.z).toBeCloseTo(HOOP.center.z - DEFAULT_SHOT_TUNING.aimDepthBias);
    expect(v.y - DEFAULT_SHOT_TUNING.gravity * t).toBeLessThan(0);
  });

  it('power inside the assist zone gives the ideal distance', () => {
    expect(distanceFactor(0.5, DEFAULT_SHOT_TUNING)).toBe(1);
    expect(distanceFactor(0.4, DEFAULT_SHOT_TUNING)).toBe(1);
    expect(distanceFactor(0.6, DEFAULT_SHOT_TUNING)).toBe(1);
    expect(distanceFactor(0, DEFAULT_SHOT_TUNING)).toBeCloseTo(
      DEFAULT_SHOT_TUNING.minDistanceFactor,
    );
    expect(distanceFactor(1, DEFAULT_SHOT_TUNING)).toBeCloseTo(
      DEFAULT_SHOT_TUNING.maxDistanceFactor,
    );
  });

  it('more power goes further, aim right goes to +X', () => {
    const weak = calculateShotVelocity({ directionX: 0, power: 0.1 }, LAUNCH_POSITION, HOOP.center);
    const strong = calculateShotVelocity(
      { directionX: 0, power: 0.9 },
      LAUNCH_POSITION,
      HOOP.center,
    );
    expect(Math.abs(strong.z)).toBeGreaterThan(Math.abs(weak.z));
    const right = calculateShotVelocity(
      { directionX: 1, power: 0.5 },
      LAUNCH_POSITION,
      HOOP.center,
    );
    expect(right.x).toBeGreaterThan(0);
  });
});

describe('crossedHoopDownward', () => {
  const above = { x: 0, y: 3.15, z: -4.2 };
  const below = { x: 0, y: 2.95, z: -4.2 };

  it('counts a ball dropping through the centre', () => {
    expect(crossedHoopDownward(above, below, zone)).toBe(true);
  });

  it('never counts a ball going up through the hoop', () => {
    expect(crossedHoopDownward(below, above, zone)).toBe(false);
  });

  it('does not count a ball crossing the plane outside the rim', () => {
    const offset = (p: Vec3) => ({ ...p, x: p.x + 0.3 });
    expect(crossedHoopDownward(offset(above), offset(below), zone)).toBe(false);
  });

  it('interpolates the crossing point for fast-moving balls', () => {
    // Starts outside the zone, ends outside on the other side, but crosses the plane at the centre.
    expect(
      crossedHoopDownward({ x: -0.4, y: 3.25, z: -4.2 }, { x: 0.4, y: 2.85, z: -4.2 }, zone),
    ).toBe(true);
  });

  it('the ideal shot trajectory registers as a basket', () => {
    const v = calculateShotVelocity({ directionX: 0, power: 0.5 }, LAUNCH_POSITION, HOOP.center);
    let scored = false;
    let prev = at(v, 0);
    for (let t = 1 / 60; t < 2; t += 1 / 60) {
      const curr = at(v, t);
      scored ||= crossedHoopDownward(prev, curr, zone);
      prev = curr;
    }
    expect(scored).toBe(true);
  });
});
