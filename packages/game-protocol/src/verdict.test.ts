import { describe, expect, it } from 'vitest';
import type { RoundSummary } from './controller';
import { roundVerdict } from './verdict';

function round(overrides: Partial<RoundSummary>): RoundSummary {
  return { score: 0, baskets: 0, shots: 10, accuracy: 0.5, rank: 7, ...overrides };
}

describe('roundVerdict', () => {
  it('picks the tier from the score', () => {
    expect(roundVerdict(round({ score: 0 })).tier).toBe('airball');
    expect(roundVerdict(round({ score: 4 })).tier).toBe('rookie');
    expect(roundVerdict(round({ score: 8 })).tier).toBe('starter');
    expect(roundVerdict(round({ score: 20 })).tier).toBe('allstar');
    expect(roundVerdict(round({ score: 19 })).tier).toBe('starter');
    expect(roundVerdict(round({ score: 35 })).title).toBe('MVP');
  });

  it('gives the same line for the same round', () => {
    const r = round({ score: 14 });
    expect(roundVerdict(r).line).toBe(roundVerdict(r).line);
  });

  it('calls out the leader and sharp shooters', () => {
    expect(roundVerdict(round({ score: 30, rank: 1 })).line).toMatch(/Number one/);
    expect(roundVerdict(round({ score: 20, shots: 8, accuracy: 0.9 })).line).toMatch(/Sniper/);
  });

  it('handles a round with no shots', () => {
    const v = roundVerdict(round({ score: 0, shots: 0, accuracy: 0, rank: null }));
    expect(v.tier).toBe('airball');
    expect(v.line.length).toBeGreaterThan(0);
  });
});
