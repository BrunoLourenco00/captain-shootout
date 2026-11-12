/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_DATABASE_URL?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_FIREBASE_USE_EMULATORS?: string;
  readonly VITE_FIREBASE_EMULATOR_HOST?: string;
  /** CAPTAIN accounts project (see .env.example). */
  readonly VITE_CAPTAIN_FIREBASE_API_KEY?: string;
  readonly VITE_CAPTAIN_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_CAPTAIN_FIREBASE_PROJECT_ID?: string;
  readonly VITE_CAPTAIN_FIREBASE_APP_ID?: string;
}

// Fontsource CSS entry points imported for their side effect (e.g. '.../latin-800').
declare module '@fontsource/big-shoulders-display/*';
