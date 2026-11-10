import type {
  ControllerView,
  HostHandlers,
  HostSessionInfo,
  HostTransport,
} from '@captain/game-protocol';
import {
  createUserWithEmailAndPassword,
  signInAnonymously,
  signInWithEmailAndPassword,
  type Auth,
} from 'firebase/auth';
import {
  off,
  onChildAdded,
  onValue,
  ref,
  remove,
  set,
  update,
  type DatabaseReference,
} from 'firebase/database';
import { getFirebase, type FirebaseSettings } from './firebase';
import {
  controllerPath,
  presencePath,
  publicPath,
  randomId,
  readyPath,
  sessionPath,
  shotsPath,
  viewPath,
  type SessionController,
  type SessionPublic,
} from './paths';

export interface KioskCredentials {
  email: string;
  password: string;
}

/** How long a closed session stays readable so the phone can show "thanks for playing". */
const CLOSED_SESSION_TTL_MS = 20_000;

/**
 * Signs the desktop in. With kiosk credentials the desktop may write the leaderboard
 * (see firestore.rules); without them it signs in anonymously (sessions only).
 */
async function signInHost(auth: Auth, kiosk: KioskCredentials | null, emulator: boolean) {
  if (auth.currentUser) return auth.currentUser;
  if (!kiosk) return (await signInAnonymously(auth)).user;
  try {
    return (await signInWithEmailAndPassword(auth, kiosk.email, kiosk.password)).user;
  } catch (error) {
    // The emulator starts empty: create the kiosk account on first run.
    if (!emulator) throw error;
    return (await createUserWithEmailAndPassword(auth, kiosk.email, kiosk.password)).user;
  }
}

export function createFirebaseHostTransport(
  settings: FirebaseSettings,
  kiosk: KioskCredentials | null,
): HostTransport {
  const { auth, db } = getFirebase(settings);
  let current: { sessionId: string; listeners: DatabaseReference[] } | null = null;

  function detach() {
    if (!current) return;
    for (const r of current.listeners) off(r);
    current = null;
  }

  async function closeSession() {
    if (!current) return;
    const { sessionId } = current;
    detach();
    try {
      await update(ref(db, sessionPath(sessionId)), {
        'public/status': 'closed',
        'view/status': 'closed',
      });
    } catch {
      // Offline: the session simply expires for the phone.
    }
    setTimeout(
      () => void remove(ref(db, sessionPath(sessionId))).catch(() => {}),
      CLOSED_SESSION_TTL_MS,
    );
  }

  return {
    async openSession(handlers: HostHandlers): Promise<HostSessionInfo> {
      await closeSession();
      const user = await signInHost(auth, kiosk, settings.useEmulators);
      const sessionId = randomId(8);
      const token = randomId(16);
      const pub: SessionPublic = { status: 'open', hostUid: user.uid, createdAt: Date.now() };
      await set(ref(db, sessionPath(sessionId)), { public: pub, secret: { token } });

      const controllerRef = ref(db, controllerPath(sessionId));
      const presenceRef = ref(db, presencePath(sessionId));
      const readyRef = ref(db, readyPath(sessionId));
      const shotsRef = ref(db, shotsPath(sessionId));
      current = { sessionId, listeners: [controllerRef, presenceRef, readyRef, shotsRef] };

      let joined = false;
      onValue(controllerRef, (snap) => {
        const controller = snap.val() as SessionController | null;
        if (!controller || joined) return;
        joined = true;
        void set(ref(db, `${publicPath(sessionId)}/status`), 'taken');
        handlers.onJoin({ nickname: String(controller.nickname ?? '') });
      });
      onValue(presenceRef, (snap) => {
        if (snap.exists()) handlers.onControllerPresence(snap.val() === true);
      });
      onValue(readyRef, (snap) => {
        if (snap.val() === true) handlers.onReady();
      });
      onChildAdded(shotsRef, (snap) => handlers.onShot(snap.val()));

      return { sessionId, token };
    },

    async publishView(view: ControllerView) {
      if (!current) return;
      await set(ref(db, viewPath(current.sessionId)), view);
    },

    closeSession,

    onConnection(listener) {
      const connectedRef = ref(db, '.info/connected');
      return onValue(connectedRef, (snap) => listener(snap.val() === true));
    },
  };
}
