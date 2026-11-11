import { describe, expect, it } from 'vitest';
import { buildJoinUrl, parseJoinParams } from './controller';

describe('join url', () => {
  it('round-trips session id and token', () => {
    const url = buildJoinUrl('https://challenge.trycaptain.app/', {
      sessionId: 'ABCD2345',
      token: 'tok_123-x',
    });
    expect(url).toBe('https://challenge.trycaptain.app/?s=ABCD2345&t=tok_123-x');
    expect(parseJoinParams(new URL(url).search)).toEqual({
      sessionId: 'ABCD2345',
      token: 'tok_123-x',
    });
  });

  it('keeps an existing path on the base url', () => {
    expect(buildJoinUrl('https://trycaptain.app/play', { sessionId: 'ABCD', token: 'TOKN' })).toBe(
      'https://trycaptain.app/play?s=ABCD&t=TOKN',
    );
  });

  it.each(['', '?s=ABCD', '?t=TOKN', '?s=AB&t=TOKN', '?s=AB CD&t=TOKN', '?s=ABCD&t=<script>'])(
    'rejects missing or malformed params: %s',
    (search) => {
      expect(parseJoinParams(search)).toBeNull();
    },
  );
});
