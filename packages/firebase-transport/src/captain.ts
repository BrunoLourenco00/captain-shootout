import { DEMO_PROJECT_ID } from './firebase';

/**
 * The CAPTAIN app's own Firebase project (player accounts). It is a different project
 * from the game's (sessions + leaderboard): the phone signs in there, and the desktop
 * verifies the resulting ID token itself. All values are public web config.
 */
export interface CaptainEnv {
  VITE_CAPTAIN_FIREBASE_API_KEY?: string;
  VITE_CAPTAIN_FIREBASE_AUTH_DOMAIN?: string;
  VITE_CAPTAIN_FIREBASE_PROJECT_ID?: string;
  VITE_CAPTAIN_FIREBASE_APP_ID?: string;
  VITE_FIREBASE_USE_EMULATORS?: string;
}

export interface CaptainSettings {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  appId?: string;
  /** Emulator tokens are unsigned: only the claims are checked. */
  useEmulators: boolean;
}

/** Null when CAPTAIN accounts are not configured (everyone then plays as a guest). */
export function readCaptainSettings(env: CaptainEnv): CaptainSettings | null {
  if (env.VITE_FIREBASE_USE_EMULATORS === 'true') {
    // The emulators run in single-project mode: accounts live in the demo project too.
    return { apiKey: 'demo-api-key', projectId: DEMO_PROJECT_ID, useEmulators: true };
  }
  const projectId = env.VITE_CAPTAIN_FIREBASE_PROJECT_ID;
  if (!projectId) return null;
  return {
    apiKey: env.VITE_CAPTAIN_FIREBASE_API_KEY ?? '',
    authDomain: env.VITE_CAPTAIN_FIREBASE_AUTH_DOMAIN,
    projectId,
    appId: env.VITE_CAPTAIN_FIREBASE_APP_ID,
    useEmulators: false,
  };
}
