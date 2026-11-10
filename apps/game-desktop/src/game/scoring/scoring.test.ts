import { DEFAULT_GAME_CONFIG, type ShotOutcome } from '@captain/game-protocol';
import { describe, expect, it } from 'vitest';
import { EMPTY_SCORE, accuracy, applyOutcome, recordAttempt, type ScoreState } from './scoring';

const scoring = DEFAULT_GAME_CONFIG.scoring;

function play(outcomes: ShotOutcome[]): { state: ScoreState; points: number[] } {
  let state = EMPTY_SCORE;
  const points: number[] = [];
  for (const outcome of outcomes) {
    state = recordAttempt(state);
    const r = applyOutcome(state, outcome, scoring);
    state = r.state;
    points.push(r.points);
  }
  return { state, points };
}

describe('scoring', () => {
  it('basket = 2, perfect = 3, miss = 0', () => {
    expect(play(['scored', 'missed', 'perfect']).points).toEqual([2, 0, 3]);
  });

  it('doubles from the 5th consecutive basket onwards', () => {
    const { points, state } = play(['scored', 'scored', 'scored', 'scored', 'scored', 'perfect']);
    expect(points).toEqual([2, 2, 2, 2, 4, 6]);
    expect(state.score).toBe(18);
    expect(state.bestStreak).toBe(6);
  });

  it('a miss resets the streak', () => {
    const outcomes: ShotOutcome[] = ['scored', 'scored', 'scored', 'scored', 'missed', 'scored'];
    const { points, state } = play(outcomes);
    expect(points.at(-1)).toBe(2);
    expect(state.streak).toBe(1);
    expect(state.bestStreak).toBe(4);
  });

  it('tracks attempts, baskets and accuracy', () => {
    const { state } = play(['scored', 'missed', 'perfect', 'missed']);
    expect(state).toMatchObject({ shots: 4, baskets: 2, perfects: 1 });
    expect(accuracy(state)).toBe(0.5);
    expect(accuracy(EMPTY_SCORE)).toBe(0);
  });
});
