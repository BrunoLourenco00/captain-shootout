import type { AccountService, AccountUser } from '@captain/game-protocol';

/** Local stand-in for CAPTAIN sign-in (no network). Never used in production. */
export function createMockAccount(): AccountService {
  let user: AccountUser | null = null;
  const listeners = new Set<(user: AccountUser | null) => void>();

  async function signIn(email = 'player@example.com') {
    await new Promise((r) => setTimeout(r, 300));
    user = { uid: 'mock-uid', email, displayName: 'Mock Player' };
    for (const listener of listeners) listener(user);
  }

  return {
    onUser(listener) {
      listeners.add(listener);
      listener(user);
      return () => listeners.delete(listener);
    },
    signInWithGoogle: () => signIn(),
    signInWithApple: () => signIn(),
    signInWithEmail: (email) => signIn(email),
    signUpWithEmail: (email) => signIn(email),
    async signOut() {
      user = null;
      for (const listener of listeners) listener(null);
    },
    async idToken() {
      return user ? 'mock-id-token' : null;
    },
  };
}
