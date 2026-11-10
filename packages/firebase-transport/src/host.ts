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
  serverTimestamp,
  set,
  update,
  type DatabaseReference,
} from 'firebase/database';
import { getFirebase, type FirebaseSettings } from './firebase';
import {
  HEARTBEAT_INTERVAL_MS,
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
  let current: {
    sessionId: string;
    listeners: DatabaseReference[];
    heartbeat: ReturnType<typeof setInterval>;
  } | null = null;
  // Open/close run strictly one after another (React may fire effects twice in dev).
  let queue: Promise<unknown> = Promise.resolve();
  function serial<T>(task: () => Promise<T>): Promise<T> {
    const run = queue.then(task, task);
    queue = run.catch(() => {});
    return run;
  }

  function detach() {
    if (!current) return;
    for (const r of current.listeners) off(r);
    clearInterval(current.heartbeat);
    current = null;
  }

  async function closeCurrent() {
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
    openSession: (handlers: HostHandlers) => serial(() => open(handlers)),

    async publishView(view: ControllerView) {
      if (!current) return;
      await set(ref(db, viewPath(current.sessionId)), view);
    },

    closeSession: () => serial(closeCurrent),

    onConnection(listener) {
      const connectedRef = ref(db, '.info/connected');
      return onValue(connectedRef, (snap) => listener(snap.val() === true));
    },
  };

  async function open(handlers: HostHandlers): Promise<HostSessionInfo> {
    await closeCurrent();
    const user = await signInHost(auth, kiosk, settings.useEmulators);
    const sessionId = randomId(8);
    const token = randomId(16);
    const pub: Omit<SessionPublic, 'createdAt' | 'heartbeatAt'> = {
      status: 'open',
      hostUid: user.uid,
    };
    await set(ref(db, sessionPath(sessionId)), {
      public: { ...pub, createdAt: serverTimestamp(), heartbeatAt: serverTimestamp() },
      secret: { token },
    });
    const heartbeat = setInterval(() => {
      void set(ref(db, `${publicPath(sessionId)}/heartbeatAt`), serverTimestamp()).catch(() => {});
    }, HEARTBEAT_INTERVAL_MS);

    const controllerRef = ref(db, controllerPath(sessionId));
    const presenceRef = ref(db, presencePath(sessionId));
    const readyRef = ref(db, readyPath(sessionId));
    const shotsRef = ref(db, shotsPath(sessionId));
    current = { sessionId, listeners: [controllerRef, presenceRef, readyRef, shotsRef], heartbeat };

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
  }
}
