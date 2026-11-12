import { describe, expect, it } from 'vitest';
import { coachPitch } from './coach';

describe('coachPitch', () => {
  it('changes tone with the score', () => {
    expect(coachPitch(0).headline).toMatch(/Rough round/);
    expect(coachPitch(12).headline).toMatch(/Good shot/);
    expect(coachPitch(30).headline).toMatch(/touch/);
  });

  it('always names the AI Coach', () => {
    for (const score of [0, 15, 60]) expect(coachPitch(score).body).toContain('AI Coach');
  });
});
