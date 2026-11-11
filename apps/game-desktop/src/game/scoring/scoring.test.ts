import { DEFAULT_GAME_CONFIG, type ShotOutcome } from '@captain/game-protocol';
import { describe, expect, it } from 'vitest';
import {
  EMPTY_SCORE,
  accuracy,
  applyOutcome,
  nextMultiplier,
  recordAttempt,
  type ScoreState,
} from './scoring';

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

  it('x1.5 from the 5th basket in a row, x2 from the 10th', () => {
    const { points, state } = play([
      ...Array<ShotOutcome>(4).fill('scored'),
      'scored', // 5th: 2 x 1.5
      'perfect', // 6th: 3 x 1.5 = 4.5, rounded to 5
      ...Array<ShotOutcome>(3).fill('scored'),
      'scored', // 10th: 2 x 2
      'perfect', // 11th: 3 x 2
    ]);
    expect(points).toEqual([2, 2, 2, 2, 3, 5, 3, 3, 3, 4, 6]);
    expect(state.score).toBe(35);
    expect(state.bestStreak).toBe(11);
  });

  it('says which multiplier the next basket gets', () => {
    const after = (n: number) => play(Array<ShotOutcome>(n).fill('scored')).state;
    expect(nextMultiplier(after(3), scoring)).toBe(1);
    expect(nextMultiplier(after(4), scoring)).toBe(1.5);
    expect(nextMultiplier(after(9), scoring)).toBe(2);
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
