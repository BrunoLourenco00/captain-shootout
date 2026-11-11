import type { GameConfig, ShotOutcome } from '@captain/game-protocol';

export interface ScoreState {
  score: number;
  shots: number;
  baskets: number;
  perfects: number;
  /** Consecutive baskets in the current streak. */
  streak: number;
  bestStreak: number;
}

export const EMPTY_SCORE: ScoreState = {
  score: 0,
  shots: 0,
  baskets: 0,
  perfects: 0,
  streak: 0,
  bestStreak: 0,
};

/** Points a basket is worth given how many consecutive baskets it completes. */
export function pointsFor(
  outcome: ShotOutcome,
  streakIncludingThis: number,
  scoring: GameConfig['scoring'],
): number {
  if (outcome === 'missed') return 0;
  const base = outcome === 'perfect' ? scoring.perfectPoints : scoring.basketPoints;
  return streakIncludingThis >= scoring.streakThreshold ? base * scoring.streakMultiplier : base;
}

export function isOnFire(score: ScoreState, scoring: GameConfig['scoring']): boolean {
  // The *next* basket will be multiplied.
  return score.streak + 1 >= scoring.streakThreshold;
}

export function recordAttempt(state: ScoreState): ScoreState {
  return { ...state, shots: state.shots + 1 };
}

export function applyOutcome(
  state: ScoreState,
  outcome: ShotOutcome,
  scoring: GameConfig['scoring'],
): { state: ScoreState; points: number } {
  if (outcome === 'missed') {
    return { state: { ...state, streak: 0 }, points: 0 };
  }
  const streak = state.streak + 1;
  const points = pointsFor(outcome, streak, scoring);
  return {
    points,
    state: {
      ...state,
      score: state.score + points,
      baskets: state.baskets + 1,
      perfects: state.perfects + (outcome === 'perfect' ? 1 : 0),
      streak,
      bestStreak: Math.max(state.bestStreak, streak),
    },
  };
}

/** 0..1, 0 when no shots were taken. */
export function accuracy(state: ScoreState): number {
  return state.shots === 0 ? 0 : state.baskets / state.shots;
}
