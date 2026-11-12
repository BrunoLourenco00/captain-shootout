import {
  buildJoinUrl,
  parseShotCommand,
  validateNickname,
  type GameConfig,
  type HostSessionInfo,
  type LeaderboardEntry,
} from '@captain/game-protocol';
import { useEffect, useRef, useState, type Dispatch } from 'react';
import { toControllerView } from '../game/state/controllerView';
import type { GameAction, GameState } from '../game/state/gameState';
import { backend, controllerBaseUrl } from './backend';

const PUBLISH_INTERVAL_MS = 250;
const RETRY_OPEN_MS = 3000;
/** Entries loaded for the attract board (it scrolls through them; results show the top 5). */
const LEADERBOARD_SIZE = 20;

export interface HostSessionState {
  /** Null while no session is open (or no backend configured). */
  joinUrl: string | null;
  online: boolean;
  configured: boolean;
  leaderboard: LeaderboardEntry[];
}

/**
 * Bridges the pure game state and the transport:
 * - opens a fresh session (new QR) whenever the game is back on attract,
 * - validates every phone input before it reaches the reducer,
 * - publishes the display-only view to the phone,
 * - saves finished live rounds to the leaderboard.
 */
export function useHostSession(
  state: GameState,
  dispatch: Dispatch<GameAction>,
  config: GameConfig,
): HostSessionState {
  const [session, setSession] = useState<HostSessionInfo | null>(null);
  const [online, setOnline] = useState(true);
  const [retry, setRetry] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const sessionRef = useRef<HostSessionInfo | null>(null);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const needsSession = backend !== null && state.status === 'attract' && state.sessionId === null;

  // Open a new session whenever the attract screen has none.
  useEffect(() => {
    if (!backend || !needsSession) return;
    let cancelled = false;
    backend.host
      .openSession({
        onJoin: ({ nickname, playerId }) => {
          const checked = validateNickname(nickname, config.nickname);
          const sessionId = sessionRef.current?.sessionId;
          if (!checked.ok || !sessionId) {
            dispatch({ type: 'RESET' });
            return;
          }
          dispatch({
            type: 'PLAYER_JOINED',
            sessionId,
            nickname: checked.nickname,
            playerId,
            now: Date.now(),
          });
        },
        onReady: () => dispatch({ type: 'PLAYER_READY', now: Date.now() }),
        onShot: (raw) => {
          const command = parseShotCommand(raw);
          if (command) dispatch({ type: 'SHOT', command, now: Date.now() });
        },
        onControllerPresence: (connected) => dispatch({ type: 'CONTROLLER_PRESENCE', connected }),
      })
      .then((info) => {
        if (cancelled) return;
        sessionRef.current = info;
        setSession(info);
        dispatch({ type: 'SESSION_OPENED', sessionId: info.sessionId });
      })
      .catch(() => {
        if (!cancelled) setTimeout(() => setRetry((n) => n + 1), RETRY_OPEN_MS);
      });
    return () => {
      cancelled = true;
    };
  }, [needsSession, retry, dispatch, config.nickname]);

  // A demo round never uses the phone session: close it so nobody can join mid-demo.
  useEffect(() => {
    if (backend && state.mode === 'demo' && sessionRef.current) {
      sessionRef.current = null;
      setSession(null);
      void backend.host.closeSession();
    }
  }, [state.mode]);

  // Publish the phone view (only when it changes).
  useEffect(() => {
    const host = backend?.host;
    if (!host) return;
    let last = '';
    const id = setInterval(() => {
      const view = toControllerView(stateRef.current, Date.now(), config);
      if (!view) return;
      const json = JSON.stringify(view);
      if (json === last) return;
      last = json;
      void host.publishView(view).catch(() => {
        last = ''; // retry on the next interval
      });
    }, PUBLISH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [config]);

  useEffect(() => backend?.host.onConnection(setOnline), []);

  // Best effort: tell the phone right away when the kiosk page is closed or reloaded
  // (the session heartbeat covers the cases where this cannot run).
  useEffect(() => {
    if (!backend) return;
    const close = () => void backend?.host.closeSession();
    window.addEventListener('pagehide', close);
    return () => window.removeEventListener('pagehide', close);
  }, []);

  // Leaderboard: (re)load on every attract screen, save each finished round of a
  // CAPTAIN account (guests play but are never ranked).
  const onAttract = state.status === 'attract';
  useEffect(() => {
    if (!backend || !onAttract) return;
    void backend.leaderboard
      .top(LEADERBOARD_SIZE)
      .then(setLeaderboard)
      .catch(() => {});
  }, [onAttract]);

  const savedRound = useRef<string | null>(null);
  useEffect(() => {
    const store = backend?.leaderboard;
    if (!store || state.status !== 'results' || state.mode !== 'live') return;
    const nickname = state.nickname;
    const playerId = state.playerId;
    if (!nickname || !playerId) return;
    const roundId = `${state.sessionId}:${state.roundEndsAt}`;
    if (savedRound.current === roundId) return;
    savedRound.current = roundId;
    const { score, baskets, shots } = state.score;
    store.submit({ playerId, nickname, score, baskets, shots, completedAt: Date.now() }).then(
      ({ rank, players }) => {
        dispatch({ type: 'RESULT_SAVED', rank, players });
        // A failed refresh must not erase the rank that was just saved.
        store
          .top(LEADERBOARD_SIZE)
          .then(setLeaderboard)
          .catch(() => {});
      },
      () => dispatch({ type: 'RESULT_SAVED', rank: null }),
    );
  }, [
    state.status,
    state.mode,
    state.nickname,
    state.playerId,
    state.sessionId,
    state.roundEndsAt,
    state.score,
    dispatch,
  ]);

  const sessionMatches = session !== null && session.sessionId === state.sessionId;
  return {
    joinUrl: sessionMatches ? buildJoinUrl(controllerBaseUrl, session) : null,
    online,
    configured: backend !== null,
    leaderboard,
  };
}
