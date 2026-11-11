import { describe, expect, it } from 'vitest';
import { compareEntries, isBetterResult, type LeaderboardEntry } from './host';

const entry = (score: number, baskets: number, completedAt: number): LeaderboardEntry => ({
  nickname: 'X',
  score,
  baskets,
  shots: 10,
  completedAt,
});

describe('leaderboard ordering', () => {
  it('sorts by score, then baskets, then earliest completion', () => {
    const sorted = [entry(10, 4, 3), entry(12, 5, 9), entry(10, 5, 5), entry(10, 5, 1)].sort(
      compareEntries,
    );
    expect(sorted.map((e) => [e.score, e.baskets, e.completedAt])).toEqual([
      [12, 5, 9],
      [10, 5, 1],
      [10, 5, 5],
      [10, 4, 3],
    ]);
  });

  it('a replay only replaces the best result when it is strictly better', () => {
    const best = entry(10, 4, 1);
    expect(isBetterResult(entry(12, 1, 2), best)).toBe(true);
    expect(isBetterResult(entry(10, 5, 2), best)).toBe(true);
    expect(isBetterResult(entry(10, 4, 0), best)).toBe(false);
    expect(isBetterResult(entry(8, 9, 2), best)).toBe(false);
  });
});
