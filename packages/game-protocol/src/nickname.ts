import type { GameConfig } from './config';

/** Small PT/EN blocklist, matched against the normalized key. Extend as needed. */
const BLOCKLIST = [
  'FUCK',
  'SHIT',
  'BITCH',
  'CUNT',
  'DICK',
  'PUSSY',
  'NIGGER',
  'NIGGA',
  'FAGGOT',
  'WHORE',
  'NAZI',
  'HITLER',
  'CARALHO',
  'FODA',
  'FODASE',
  'FODER',
  'PUTA',
  'PUTO',
  'MERDA',
  'CONA',
  'PILA',
  'PICHA',
  'CABRAO',
  'PANELEIRO',
  'BICHA',
  'CORNO',
  'OTARIO',
  'BOCETA',
  'VIADO',
];

/**
 * Long words are matched anywhere; short ones only exactly, so that legitimate
 * names such as "PILAR" or "DICKSON" are not rejected.
 */
const SUBSTRING_MIN_LENGTH = 5;

function isBlocked(key: string): boolean {
  return BLOCKLIST.some((word) =>
    word.length >= SUBSTRING_MIN_LENGTH ? key.includes(word) : key === word,
  );
}

/** Display form: trimmed, single spaces, uppercase. */
export function formatNickname(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toUpperCase();
}

/**
 * Uniqueness key: case- and accent-insensitive, letters and digits only.
 * "Bruno" , "BRÚNO" and "br uno" share the same key.
 */
export function nicknameKey(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

export type NicknameError = 'too_short' | 'too_long' | 'invalid_characters' | 'blocked';

const ALLOWED = /^[\p{L}\p{N} ._-]+$/u;

export function validateNickname(
  raw: string,
  rules: GameConfig['nickname'],
): { ok: true; nickname: string; key: string } | { ok: false; error: NicknameError } {
  const nickname = formatNickname(raw);
  const length = [...nickname].length;
  if (length < rules.minLength) return { ok: false, error: 'too_short' };
  if (length > rules.maxLength) return { ok: false, error: 'too_long' };
  if (!ALLOWED.test(nickname)) return { ok: false, error: 'invalid_characters' };

  const key = nicknameKey(nickname);
  if (key.length < rules.minLength) return { ok: false, error: 'too_short' };
  if (isBlocked(key)) return { ok: false, error: 'blocked' };
  return { ok: true, nickname, key };
}
