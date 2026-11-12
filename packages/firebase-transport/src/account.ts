import type { AccountService, AccountUser } from '@captain/game-protocol';
import { getApps, initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  OAuthProvider,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import type { CaptainSettings } from './captain';
import { EMULATOR_PORTS } from './firebase';

/** Named app: the default app is the game's own project (sessions, leaderboard). */
const APP_NAME = 'captain-accounts';

function toUser(user: User | null): AccountUser | null {
  // An anonymous session is not a CAPTAIN account (the desktop would reject it too).
  if (!user || user.isAnonymous) return null;
  return { uid: user.uid, email: user.email, displayName: user.displayName };
}

/**
 * CAPTAIN account on the phone: the same Firebase Auth as the CAPTAIN app and the
 * trycaptain.app sign-up page, so an account made here is the visitor's app account.
 * Firebase keeps the session on the device, so returning players are already signed in.
 */
export function createCaptainAccountService(
  settings: CaptainSettings,
  emulatorHost: string,
): AccountService {
  const app =
    getApps().find((a) => a.name === APP_NAME) ??
    initializeApp(
      {
        apiKey: settings.apiKey,
        authDomain: settings.authDomain,
        projectId: settings.projectId,
        appId: settings.appId,
      },
      APP_NAME,
    );
  const auth = getAuth(app);
  if (settings.useEmulators && !auth.emulatorConfig) {
    connectAuthEmulator(auth, `http://${emulatorHost}:${EMULATOR_PORTS.auth}`, {
      disableWarnings: true,
    });
  }

  const apple = new OAuthProvider('apple.com');
  apple.addScope('email');
  apple.addScope('name');

  return {
    onUser(listener) {
      return onAuthStateChanged(auth, (user) => listener(toUser(user)));
    },
    async signInWithGoogle() {
      await signInWithPopup(auth, new GoogleAuthProvider());
    },
    async signInWithApple() {
      await signInWithPopup(auth, apple);
    },
    async signInWithEmail(email, password) {
      await signInWithEmailAndPassword(auth, email, password);
    },
    async signUpWithEmail(email, password) {
      await createUserWithEmailAndPassword(auth, email, password);
    },
    async signOut() {
      await signOut(auth);
    },
    async idToken() {
      const user = auth.currentUser;
      return user && !user.isAnonymous ? user.getIdToken() : null;
    },
  };
}

const AUTH_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'That email already has a CAPTAIN account. Sign in instead.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/weak-password': 'Use a password of at least 8 characters.',
  'auth/password-does-not-meet-requirements': 'Use a stronger password (at least 8 characters).',
  'auth/invalid-credential': 'Wrong email or password.',
  'auth/wrong-password': 'Wrong email or password.',
  'auth/user-not-found': 'No account with that email. Create one instead.',
  'auth/too-many-requests': 'Too many attempts. Wait a minute and try again.',
  'auth/network-request-failed': 'No connection. Check your internet and try again.',
  'auth/popup-blocked': 'Your browser blocked the sign-in window. Allow pop-ups and try again.',
  'auth/unauthorized-domain': 'Sign-in is not available on this address yet. Play as a guest.',
  'auth/account-exists-with-different-credential':
    'That email already signs in another way. Use the method you used before.',
};

const CANCELLED = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request']);

/** A short message for the player, or null when they simply closed the popup. */
export function accountErrorMessage(error: unknown): string | null {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';
  if (CANCELLED.has(code)) return null;
  return AUTH_MESSAGES[code] ?? 'Something went wrong. Try again.';
}
