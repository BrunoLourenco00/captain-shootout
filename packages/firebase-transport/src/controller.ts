import type {
  ConnectionState,
  ControllerTransport,
  ControllerView,
  JoinParams,
  JoinResult,
  ShotCommand,
} from '@captain/game-protocol';
import { signInAnonymously } from 'firebase/auth';
import { get, onDisconnect, onValue, ref, set, type Unsubscribe } from 'firebase/database';
import { getFirebase, type FirebaseSettings } from './firebase';
import {
  controllerPath,
  presencePath,
  publicPath,
  readyPath,
  shotsPath,
  viewPath,
  type SessionController,
  type SessionPublic,
} from './paths';

const CLOSED_VIEW: Omit<ControllerView, 'nickname'> = {
  status: 'closed',
  secondsLeft: 0,
  score: 0,
  onFire: false,
  lastShot: null,
  results: null,
};

export function createFirebaseControllerTransport(settings: FirebaseSettings): ControllerTransport {
  const { auth, db } = getFirebase(settings);
  let handlers: Parameters<ControllerTransport['subscribe']>[0] | null = null;
  let sessionId: string | null = null;
  let nickname = '';
  let lastView: ControllerView | null = null;
  const unsubscribers: Unsubscribe[] = [];

  async function uid(): Promise<string> {
    return auth.currentUser?.uid ?? (await signInAnonymously(auth)).user.uid;
  }

  /** Starts presence + view listeners once this device owns the session. */
  async function attach(id: string) {
    sessionId = id;
    const presenceRef = ref(db, presencePath(id));
    await onDisconnect(presenceRef).set(false);
    await set(presenceRef, true);

    unsubscribers.push(
      onValue(ref(db, '.info/connected'), (snap) => {
        const online = snap.val() === true;
        handlers?.onConnection(online ? 'online' : 'reconnecting');
        // Re-announce presence after a reconnect (onDisconnect fired while offline).
        if (online) {
          void onDisconnect(presenceRef).set(false);
          void set(presenceRef, true).catch(() => {});
        }
      }),
      onValue(
        ref(db, viewPath(id)),
        (snap) => {
          const view = snap.val() as ControllerView | null;
          if (view) {
            lastView = view;
            handlers?.onView(view);
          } else if (lastView) {
            handlers?.onView({ ...CLOSED_VIEW, nickname });
          }
        },
        // Permission lost = the session was removed.
        () => handlers?.onView({ ...CLOSED_VIEW, nickname }),
      ),
    );
  }

  return {
    async join(params: JoinParams, requestedNickname: string): Promise<JoinResult> {
      try {
        const me = await uid();
        const pub = (
          await get(ref(db, publicPath(params.sessionId)))
        ).val() as SessionPublic | null;
        if (!pub) return { ok: false, error: 'invalid_session' };
        if (pub.status === 'closed') return { ok: false, error: 'session_expired' };
        if (pub.status !== 'open') return { ok: false, error: 'session_busy' };

        const controller: SessionController = {
          uid: me,
          nickname: requestedNickname,
          token: params.token,
          joinedAt: Date.now(),
        };
        try {
          await set(ref(db, controllerPath(params.sessionId)), controller);
        } catch {
          // Rules reject a wrong token or a session someone else already claimed.
          const latest = (
            await get(ref(db, publicPath(params.sessionId)))
          ).val() as SessionPublic | null;
          return {
            ok: false,
            error: latest?.status === 'open' ? 'invalid_session' : 'session_busy',
          };
        }
        nickname = requestedNickname;
        await attach(params.sessionId);
        return { ok: true };
      } catch {
        return { ok: false, error: 'network' };
      }
    },

    async resume(params: JoinParams): Promise<string | null> {
      try {
        const me = await uid();
        const snap = await get(ref(db, controllerPath(params.sessionId)));
        const controller = snap.val() as SessionController | null;
        if (!controller || controller.uid !== me) return null;
        nickname = controller.nickname;
        await attach(params.sessionId);
        return nickname;
      } catch {
        // Not readable = not our session.
        return null;
      }
    },

    async setReady() {
      if (sessionId) await set(ref(db, readyPath(sessionId)), true);
    },

    async sendShot(command: ShotCommand) {
      if (sessionId) await set(ref(db, `${shotsPath(sessionId)}/${command.shotId}`), command);
    },

    subscribe(next) {
      handlers = next;
      return () => {
        handlers = null;
      };
    },

    async leave() {
      for (const unsubscribe of unsubscribers.splice(0)) unsubscribe();
    },
  };
}

export type { ConnectionState };
