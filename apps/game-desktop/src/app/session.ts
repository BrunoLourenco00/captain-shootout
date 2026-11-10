/** Unambiguous characters (no 0/O, 1/I/L). */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Random, unpredictable session id. Placeholder until the session transport (Phase 3)
 * takes over session creation together with the join token.
 */
export function createSessionId(length = 8): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}
