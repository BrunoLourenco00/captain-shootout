import {
  createRemoteJWKSet,
  decodeJwt,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyGetKey,
} from 'jose';

/** Google's public keys for Firebase Auth ID tokens (served with CORS, cached by jose). */
const FIREBASE_JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken%40system.gserviceaccount.com';

/** Longest token we accept from the phone (real ones are ~1 KB). */
export const MAX_ID_TOKEN_LENGTH = 4096;

export interface CaptainTokenOptions {
  projectId: string;
  /** Emulator tokens are unsigned: skip the signature, keep every claim check. */
  unsigned?: boolean;
  /** Override the key source (tests). */
  keys?: JWTVerifyGetKey;
  /** Seconds since epoch (tests). */
  now?: number;
}

/**
 * Returns the CAPTAIN account uid a Firebase ID token proves, or null when the token is
 * malformed, forged, expired, for another project or anonymous. Never throws.
 * Same checks as the Admin SDK's verifyIdToken (except revocation, which needs a server).
 */
export function createCaptainTokenVerifier(options: CaptainTokenOptions) {
  const { projectId } = options;
  const issuer = `https://securetoken.google.com/${projectId}`;
  const keys = options.keys ?? createRemoteJWKSet(new URL(FIREBASE_JWKS_URL));

  async function claims(token: string): Promise<JWTPayload | null> {
    if (options.unsigned) {
      const payload = decodeJwt(token);
      const now = options.now ?? Math.floor(Date.now() / 1000);
      if (payload.iss !== issuer || payload.aud !== projectId) return null;
      if (typeof payload.exp !== 'number' || payload.exp <= now) return null;
      return payload;
    }
    const { payload } = await jwtVerify(token, keys, {
      issuer,
      audience: projectId,
      algorithms: ['RS256'],
      currentDate: options.now === undefined ? undefined : new Date(options.now * 1000),
    });
    return payload;
  }

  return async function verify(token: unknown): Promise<string | null> {
    if (typeof token !== 'string' || token.length === 0 || token.length > MAX_ID_TOKEN_LENGTH) {
      return null;
    }
    try {
      const payload = await claims(token);
      if (!payload) return null;
      const uid = payload.sub;
      if (typeof uid !== 'string' || uid.length === 0 || uid.length > 128) return null;
      const firebase = payload.firebase as { sign_in_provider?: unknown } | undefined;
      // An anonymous CAPTAIN session is not an account.
      if (firebase?.sign_in_provider === 'anonymous') return null;
      return uid;
    } catch {
      return null;
    }
  };
}

export type CaptainTokenVerifier = ReturnType<typeof createCaptainTokenVerifier>;
