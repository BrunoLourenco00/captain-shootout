import { describe, expect, it } from 'vitest';
import { DEFAULT_GAME_CONFIG } from './config';
import { normalizeSwipe, parseShotCommand } from './shot';

const valid = {
  sessionId: 'S1',
  shotId: 'shot-1',
  directionX: 0.2,
  directionY: 0.4,
  power: 0.5,
  clientTimestamp: 123,
};

describe('parseShotCommand', () => {
  it('accepts a well-formed command', () => {
    expect(parseShotCommand(valid)).toEqual(valid);
  });

  it('clamps out-of-range values', () => {
    const parsed = parseShotCommand({ ...valid, directionX: -9, power: 4, directionY: -1 });
    expect(parsed).toMatchObject({ directionX: -1, power: 1, directionY: 0 });
  });

  it.each([
    null,
    'shot',
    { ...valid, shotId: '' },
    { ...valid, sessionId: 42 },
    { ...valid, power: Number.NaN },
    { ...valid, directionX: Infinity },
    { ...valid, power: '0.5' },
    { ...valid, shotId: 'x'.repeat(65) },
  ])('rejects malformed input %#', (input) => {
    expect(parseShotCommand(input)).toBeNull();
  });

  it('ignores extra fields such as a client-sent score', () => {
    expect(parseShotCommand({ ...valid, score: 9999 })).not.toHaveProperty('score');
  });
});

describe('normalizeSwipe', () => {
  const surface = { width: 400, height: 800 };
  const g = DEFAULT_GAME_CONFIG.gesture;

  it('ignores downward and tiny swipes', () => {
    expect(
      normalizeSwipe({ start: { x: 200, y: 400 }, end: { x: 200, y: 600 }, surface }, g),
    ).toBeNull();
    expect(
      normalizeSwipe({ start: { x: 200, y: 400 }, end: { x: 200, y: 390 }, surface }, g),
    ).toBeNull();
  });

  it('maps a straight full-length swipe to full power, centered', () => {
    const r = normalizeSwipe({ start: { x: 200, y: 700 }, end: { x: 200, y: 100 }, surface }, g);
    expect(r).toEqual({ directionX: 0, directionY: 0.75, power: 1 });
  });

  it('maps horizontal displacement to aim and clamps it', () => {
    const r = normalizeSwipe({ start: { x: 200, y: 700 }, end: { x: 0, y: 400 }, surface }, g);
    expect(r?.directionX).toBe(-1);
    const r2 = normalizeSwipe({ start: { x: 200, y: 700 }, end: { x: 250, y: 400 }, surface }, g);
    expect(r2?.directionX).toBeCloseTo(0.25);
  });

  it('power grows with swipe length', () => {
    const short = normalizeSwipe({ start: { x: 0, y: 700 }, end: { x: 0, y: 550 }, surface }, g);
    const long = normalizeSwipe({ start: { x: 0, y: 700 }, end: { x: 0, y: 350 }, surface }, g);
    expect(short!.power).toBeLessThan(long!.power);
  });
});
