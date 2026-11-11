import type { GameConfig } from './config';
import type { ShotOutcome } from './types';

/** A streak of `minStreak` consecutive baskets (and more) multiplies each basket. */
export interface StreakTier {
  minStreak: number;
  multiplier: number;
}

/** Multiplier for a basket that is the `streak`-th in a row (1 = no bonus). */
export function streakMultiplier(streak: number, tiers: readonly StreakTier[]): number {
  let multiplier = 1;
  for (const tier of tiers) {
    if (streak >= tier.minStreak && tier.multiplier > multiplier) multiplier = tier.multiplier;
  }
  return multiplier;
}

/**
 * Points for one shot given how many consecutive baskets it completes.
 * Rounded to whole points (a 3-point perfect at x1.5 is worth 5).
 */
export function basketPoints(
  outcome: ShotOutcome,
  streakIncludingThis: number,
  scoring: GameConfig['scoring'],
): number {
  if (outcome === 'missed') return 0;
  const base = outcome === 'perfect' ? scoring.perfectPoints : scoring.basketPoints;
  return Math.round(base * streakMultiplier(streakIncludingThis, scoring.streakTiers));
}
