import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectDatabaseEmulator, getDatabase, type Database } from 'firebase/database';

/** Vite env subset used to configure Firebase. All values are public web config. */
export interface FirebaseEnv {
  VITE_FIREBASE_API_KEY?: string;
  VITE_FIREBASE_AUTH_DOMAIN?: string;
  VITE_FIREBASE_DATABASE_URL?: string;
  VITE_FIREBASE_PROJECT_ID?: string;
  VITE_FIREBASE_APP_ID?: string;
  /** "true" → connect to the local Firebase emulators (pnpm emulators). */
  VITE_FIREBASE_USE_EMULATORS?: string;
}

export interface FirebaseSettings {
  apiKey: string;
  authDomain?: string;
  databaseURL: string;
  projectId: string;
  appId?: string;
  useEmulators: boolean;
}

export const EMULATOR_HOST = '127.0.0.1';
export const EMULATOR_PORTS = { auth: 9099, database: 9000, firestore: 8080 } as const;
/** "demo-" projects run fully offline on the emulators, no credentials needed. */
export const DEMO_PROJECT_ID = 'demo-captain-shootout';

/** Returns null when Firebase is not configured (the apps then fall back to local mocks). */
export function readFirebaseSettings(env: FirebaseEnv): FirebaseSettings | null {
  const useEmulators = env.VITE_FIREBASE_USE_EMULATORS === 'true';
  if (useEmulators) {
    const projectId = env.VITE_FIREBASE_PROJECT_ID || DEMO_PROJECT_ID;
    return {
      apiKey: env.VITE_FIREBASE_API_KEY || 'demo-api-key',
      projectId,
      databaseURL: `http://${EMULATOR_HOST}:${EMULATOR_PORTS.database}?ns=${projectId}`,
      useEmulators,
    };
  }
  const { VITE_FIREBASE_API_KEY, VITE_FIREBASE_DATABASE_URL, VITE_FIREBASE_PROJECT_ID } = env;
  if (!VITE_FIREBASE_API_KEY || !VITE_FIREBASE_DATABASE_URL || !VITE_FIREBASE_PROJECT_ID) {
    return null;
  }
  return {
    apiKey: VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: VITE_FIREBASE_DATABASE_URL,
    projectId: VITE_FIREBASE_PROJECT_ID,
    appId: env.VITE_FIREBASE_APP_ID,
    useEmulators,
  };
}

export interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Database;
  settings: FirebaseSettings;
}

let services: FirebaseServices | null = null;

/** Initializes Firebase once per page. */
export function getFirebase(settings: FirebaseSettings): FirebaseServices {
  if (services) return services;
  const app =
    getApps()[0] ??
    initializeApp({
      apiKey: settings.apiKey,
      authDomain: settings.authDomain,
      databaseURL: settings.databaseURL,
      projectId: settings.projectId,
      appId: settings.appId,
    });
  const auth = getAuth(app);
  const db = getDatabase(app);
  if (settings.useEmulators) {
    connectAuthEmulator(auth, `http://${EMULATOR_HOST}:${EMULATOR_PORTS.auth}`, {
      disableWarnings: true,
    });
    connectDatabaseEmulator(db, EMULATOR_HOST, EMULATOR_PORTS.database);
  }
  services = { app, auth, db, settings };
  return services;
}
