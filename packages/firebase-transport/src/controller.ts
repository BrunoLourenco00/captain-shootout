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
  HEARTBEAT_STALE_MS,
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
  let presence: ReturnType<typeof ref> | null = null;
  const unsubscribers: Unsubscribe[] = [];

  /** Session over: stop presence so a late onDisconnect doesn't recreate a removed session. */
  function release() {
    for (const unsubscribe of unsubscribers.splice(0)) unsubscribe();
    if (presence)
      void onDisconnect(presence)
        .cancel()
        .catch(() => {});
    presence = null;
  }

  function emitClosed() {
    release();
    handlers?.onView({ ...CLOSED_VIEW, nickname });
  }

  async function uid(): Promise<string> {
    return auth.currentUser?.uid ?? (await signInAnonymously(auth)).user.uid;
  }

  /** RTDB omits null fields; restore the full shape the UI expects. */
  function normalizeView(raw: Partial<ControllerView>): ControllerView {
    return {
      ...CLOSED_VIEW,
      nickname,
      ...raw,
      lastShot: raw.lastShot ?? null,
      results: raw.results ?? null,
    };
  }

  /** Server-corrected clock. `.info/*` paths cannot be read with get(), only listened to. */
  function serverNow(): Promise<number> {
    return new Promise((resolve) => {
      onValue(
        ref(db, '.info/serverTimeOffset'),
        (snap) => {
          const offset: unknown = snap.val();
          resolve(Date.now() + (typeof offset === 'number' ? offset : 0));
        },
        () => resolve(Date.now()),
        { onlyOnce: true },
      );
    });
  }

  /** Starts presence + view listeners once this device owns the session. */
  async function attach(id: string) {
    sessionId = id;
    const presenceRef = ref(db, presencePath(id));
    presence = presenceRef;
    await onDisconnect(presenceRef).set(false);
    await set(presenceRef, true);

    unsubscribers.push(
      onValue(ref(db, '.info/connected'), (snap) => {
        const online = snap.val() === true;
        handlers?.onConnection(online ? 'online' : 'reconnecting');
        // Re-announce presence after a reconnect (onDisconnect fired while offline).
        if (online && presence) {
          void onDisconnect(presenceRef).set(false);
          void set(presenceRef, true).catch(() => {});
        }
      }),
      onValue(
        ref(db, viewPath(id)),
        (snap) => {
          const raw = snap.val() as Partial<ControllerView> | null;
          if (raw) {
            const view = normalizeView(raw);
            lastView = view;
            if (view.status === 'closed') emitClosed();
            else handlers?.onView(view);
          } else if (lastView) {
            emitClosed();
          }
        },
        // Permission lost = the session was removed.
        emitClosed,
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
        // An old QR (e.g. a photo) of a desktop that has since restarted.
        if ((await serverNow()) - Number(pub.heartbeatAt ?? 0) > HEARTBEAT_STALE_MS) {
          return { ok: false, error: 'session_expired' };
        }

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
      release();
    },
  };
}

export type { ConnectionState };
