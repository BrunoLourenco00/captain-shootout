/// <reference types="vite/client" />

/** Fontsource maps these imports to CSS files. */
declare module '@fontsource/big-shoulders-display/*';

interface ImportMetaEnv {
  readonly VITE_CONTROLLER_BASE_URL?: string;
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_DATABASE_URL?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_FIREBASE_USE_EMULATORS?: string;
  readonly VITE_FIREBASE_EMULATOR_HOST?: string;
  /** CAPTAIN accounts project (see .env.example). */
  readonly VITE_CAPTAIN_FIREBASE_PROJECT_ID?: string;
  /** Kiosk account allowed to write the leaderboard. Desktop only, never in the phone app. */
  readonly VITE_KIOSK_EMAIL?: string;
  readonly VITE_KIOSK_PASSWORD?: string;
}
