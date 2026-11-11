import { describe, expect, it } from 'vitest';
import { coachLink, coachPitch } from './coach';

describe('coachPitch', () => {
  it('changes tone with the score', () => {
    expect(coachPitch(0).headline).toMatch(/Rough round/);
    expect(coachPitch(12).headline).toMatch(/Good shot/);
    expect(coachPitch(30).headline).toMatch(/touch/);
  });

  it('always names Coach Cap', () => {
    for (const score of [0, 15, 60]) expect(coachPitch(score).body).toContain('Coach Cap');
  });
});

describe('coachLink', () => {
  it('tags the link with the booth campaign', () => {
    const url = new URL(coachLink('https://trycaptain.app'));
    expect(url.hostname).toBe('trycaptain.app');
    expect(url.searchParams.get('utm_source')).toBe('shootout');
  });

  it('returns an invalid base untouched', () => {
    expect(coachLink('not a url')).toBe('not a url');
  });
});
