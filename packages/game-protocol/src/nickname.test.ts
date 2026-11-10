import { describe, expect, it } from 'vitest';
import { DEFAULT_GAME_CONFIG } from './config';
import { nicknameKey, validateNickname } from './nickname';

const rules = DEFAULT_GAME_CONFIG.nickname;

describe('nicknameKey', () => {
  it('ignores case, accents, spaces and punctuation', () => {
    expect(nicknameKey('Bruno')).toBe('BRUNO');
    expect(nicknameKey('BRÚNO')).toBe('BRUNO');
    expect(nicknameKey(' br-uno ')).toBe('BRUNO');
  });
});

describe('validateNickname', () => {
  it('formats a valid nickname', () => {
    expect(validateNickname('  joão  silva ', rules)).toEqual({
      ok: true,
      nickname: 'JOÃO SILVA',
      key: 'JOAOSILVA',
    });
  });

  it('enforces 2..16 characters', () => {
    expect(validateNickname('A', rules)).toEqual({ ok: false, error: 'too_short' });
    expect(validateNickname('AB', rules).ok).toBe(true);
    expect(validateNickname('A'.repeat(16), rules).ok).toBe(true);
    expect(validateNickname('A'.repeat(17), rules)).toEqual({ ok: false, error: 'too_long' });
  });

  it('rejects names that are only punctuation', () => {
    expect(validateNickname('--', rules)).toEqual({ ok: false, error: 'too_short' });
  });

  it('rejects emoji and other symbols', () => {
    expect(validateNickname('BRUNO🔥', rules)).toEqual({ ok: false, error: 'invalid_characters' });
  });

  it('blocks profanity, including inside longer names', () => {
    expect(validateNickname('caralho', rules)).toEqual({ ok: false, error: 'blocked' });
    expect(validateNickname('xxMERDAxx', rules)).toEqual({ ok: false, error: 'blocked' });
    expect(validateNickname('puta', rules)).toEqual({ ok: false, error: 'blocked' });
  });

  it('does not block legitimate names that contain a short bad word', () => {
    expect(validateNickname('Pilar', rules).ok).toBe(true);
    expect(validateNickname('Dickson', rules).ok).toBe(true);
  });
});
