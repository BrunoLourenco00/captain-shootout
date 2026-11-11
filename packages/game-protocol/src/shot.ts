import type { GameConfig } from './config';
import type { ShotCommand, Vec2 } from './types';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const MAX_ID_LENGTH = 64;

function isId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_ID_LENGTH;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Validates untrusted input (e.g. from the network) into a ShotCommand.
 * Malformed input is rejected; out-of-range numbers are clamped.
 */
export function parseShotCommand(input: unknown): ShotCommand | null {
  if (typeof input !== 'object' || input === null) return null;
  const c = input as Record<string, unknown>;
  if (!isId(c.sessionId) || !isId(c.shotId)) return null;
  if (
    !isFiniteNumber(c.directionX) ||
    !isFiniteNumber(c.directionY) ||
    !isFiniteNumber(c.power) ||
    !isFiniteNumber(c.clientTimestamp)
  ) {
    return null;
  }
  return {
    sessionId: c.sessionId,
    shotId: c.shotId,
    directionX: clamp(c.directionX, -1, 1),
    directionY: clamp(c.directionY, 0, 1),
    power: clamp(c.power, 0, 1),
    clientTimestamp: c.clientTimestamp,
  };
}

export interface SwipeInput {
  start: Vec2;
  end: Vec2;
  /** Size of the swipe surface, in the same units as start/end. */
  surface: { width: number; height: number };
}

export interface NormalizedSwipe {
  directionX: number;
  directionY: number;
  power: number;
}

/**
 * Maps a swipe (screen coordinates, y grows downward) to normalized shot values.
 * Returns null for swipes that are too short or not upward.
 * Shared by the phone controller and the desktop demo input so both feel the same.
 */
export function normalizeSwipe(
  { start, end, surface }: SwipeInput,
  gesture: GameConfig['gesture'],
): NormalizedSwipe | null {
  if (surface.width <= 0 || surface.height <= 0) return null;
  const up = (start.y - end.y) / surface.height;
  if (up < gesture.minSwipeFraction) return null;

  const dx = (end.x - start.x) / surface.width;
  const powerRange = gesture.fullPowerSwipeFraction - gesture.minSwipeFraction;
  return {
    directionX: clamp(dx / gesture.fullAimSwipeFraction, -1, 1),
    directionY: clamp(up, 0, 1),
    power: clamp((up - gesture.minSwipeFraction) / powerRange, 0, 1),
  };
}
