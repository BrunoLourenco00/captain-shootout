import { describe, expect, it } from 'vitest';
import { stepHoopMotion, type HoopMotion } from './liveHoop';

const still = { hoopSwayM: 0, hoopBobM: 0, hoopPeriodMs: 4000 };
const sway = { hoopSwayM: 0.6, hoopBobM: 0, hoopPeriodMs: 3000 };

describe('stepHoopMotion', () => {
  it('stays put on a still level', () => {
    const m: HoopMotion = { phase: 0, sway: 0, bob: 0 };
    for (let i = 0; i < 100; i++) {
      const { x, y } = stepHoopMotion(m, still, 1 / 60);
      expect(Math.abs(x) + Math.abs(y)).toBe(0);
    }
  });

  it('eases into a new amplitude instead of jumping', () => {
    const m: HoopMotion = { phase: Math.PI / 2, sway: 0, bob: 0 };
    const first = stepHoopMotion(m, sway, 1 / 60);
    expect(Math.abs(first.x)).toBeLessThan(0.05);
    for (let i = 0; i < 600; i++) stepHoopMotion(m, sway, 1 / 60);
    expect(m.sway).toBeCloseTo(0.6, 2);
  });

  it('never travels further than the level amplitude', () => {
    const m: HoopMotion = { phase: 0, sway: 0, bob: 0 };
    for (let i = 0; i < 2000; i++) {
      const { x } = stepHoopMotion(m, sway, 1 / 60);
      expect(Math.abs(x)).toBeLessThanOrEqual(0.6 + 1e-9);
    }
  });
});
