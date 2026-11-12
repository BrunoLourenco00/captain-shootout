import { readFirebaseSettings } from '@captain/firebase-transport';
import { readCaptainSettings } from '@captain/firebase-transport/captain';
import { createFirebaseHostTransport } from '@captain/firebase-transport/host';
import { createFirestoreLeaderboard } from '@captain/firebase-transport/leaderboard';
import type { HostTransport, LeaderboardStore } from '@captain/game-protocol';

export interface Backend {
  host: HostTransport;
  leaderboard: LeaderboardStore;
}

/**
 * Picks the backend from env (see .env.example). Null = not configured: the desktop
 * still runs, but only demo mode is available (no QR / phone).
 */
function createBackend(): Backend | null {
  const env = import.meta.env;
  const settings = readFirebaseSettings(env);
  if (!settings) return null;
  const kiosk =
    env.VITE_KIOSK_EMAIL && env.VITE_KIOSK_PASSWORD
      ? { email: env.VITE_KIOSK_EMAIL, password: env.VITE_KIOSK_PASSWORD }
      : null;
  return {
    host: createFirebaseHostTransport(settings, kiosk, readCaptainSettings(env)),
    leaderboard: createFirestoreLeaderboard(settings),
  };
}

export const backend = createBackend();

/** Public URL of the phone controller. Defaults to this host on the controller dev port. */
export const controllerBaseUrl: string =
  import.meta.env.VITE_CONTROLLER_BASE_URL || `${location.protocol}//${location.hostname}:5174/`;
