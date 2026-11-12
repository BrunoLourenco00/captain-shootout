import type { PlayerDna } from './dna';
import type { ShotCommand, ShotResult } from './types';

/**
 * What the phone shows. Published by the desktop (authoritative) and rendered by the
 * controller as-is: the phone never computes time or score itself.
 */
export type ControllerStatus =
  | 'connected'
  | 'countdown'
  | 'playing'
  | 'finished'
  | 'results'
  /** Session ended or was reset; the player must scan the new QR code. */
  | 'closed';

export interface RoundSummary {
  score: number;
  baskets: number;
  shots: number;
  /** 0..1 */
  accuracy: number;
  /** 1-based leaderboard position, null while unknown. */
  rank: number | null;
  /** Players on the leaderboard when the rank was taken (for "TOP x%"); older desktops omit it. */
  players?: number | null;
  /** Traits from this round's shots; older desktops omit it. */
  dna?: PlayerDna | null;
}

export interface ControllerView {
  status: ControllerStatus;
  nickname: string;
  /** Countdown or round seconds left. Display only. */
  secondsLeft: number;
  score: number;
  onFire: boolean;
  /** Multiplier the next basket gets from the streak (1 = none). Missing from older desktops. */
  multiplier?: number;
  /**
   * False when the desktop treats this player as a guest (no verified CAPTAIN account):
   * the round is played but not saved to the leaderboard. Missing from older desktops.
   */
  ranked?: boolean;
  lastShot: ShotResult | null;
  results: RoundSummary | null;
}

export type JoinError =
  'invalid_session' | 'session_busy' | 'session_expired' | 'nickname_taken' | 'network';

export type JoinResult = { ok: true } | { ok: false; error: JoinError };

export type ConnectionState = 'online' | 'reconnecting';

export interface JoinParams {
  sessionId: string;
  token: string;
}

/**
 * Phone side of the transport. Implemented by Firebase in Phase 3; a mock implementation
 * simulates the desktop for local development. UI code only talks to this interface.
 */
export interface ControllerTransport {
  /**
   * Claims the session. `accountToken` is the CAPTAIN account's ID token (the desktop
   * verifies it and keys the leaderboard on that account); null joins as a guest.
   */
  join(params: JoinParams, nickname: string, accountToken: string | null): Promise<JoinResult>;
  setReady(): Promise<void>;
  sendShot(command: ShotCommand): Promise<void>;
  /** Returns an unsubscribe function. */
  subscribe(handlers: {
    onView: (view: ControllerView) => void;
    onConnection: (state: ConnectionState) => void;
  }): () => void;
  /**
   * After a page reload, reattaches this device to a session it already joined.
   * Resolves with the nickname, or null when the device is not this session's player.
   */
  resume(params: JoinParams): Promise<string | null>;
  leave(): Promise<void>;
}

/** The CAPTAIN account signed in on the phone (the same accounts as the CAPTAIN app). */
export interface AccountUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

/**
 * Phone side of the CAPTAIN account. Signing in is optional: guests play but are not
 * ranked. UI code only talks to this interface.
 */
export interface AccountService {
  /** Calls back with the current user (null = signed out) now and on every change. */
  onUser(listener: (user: AccountUser | null) => void): () => void;
  signInWithGoogle(): Promise<void>;
  signInWithApple(): Promise<void>;
  signInWithEmail(email: string, password: string): Promise<void>;
  signUpWithEmail(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  /** Fresh ID token of the signed-in user, or null when signed out. */
  idToken(): Promise<string | null>;
}

const SESSION_PARAM = 's';
const TOKEN_PARAM = 't';
const PARAM_PATTERN = /^[A-Za-z0-9_-]{4,64}$/;

/** URL encoded in the desktop QR code. */
export function buildJoinUrl(baseUrl: string, { sessionId, token }: JoinParams): string {
  const url = new URL(baseUrl);
  url.searchParams.set(SESSION_PARAM, sessionId);
  url.searchParams.set(TOKEN_PARAM, token);
  return url.toString();
}

/** Reads the join parameters from the controller page URL; null if missing or malformed. */
export function parseJoinParams(search: string): JoinParams | null {
  const params = new URLSearchParams(search);
  const sessionId = params.get(SESSION_PARAM);
  const token = params.get(TOKEN_PARAM);
  if (!sessionId || !token) return null;
  if (!PARAM_PATTERN.test(sessionId) || !PARAM_PATTERN.test(token)) return null;
  return { sessionId, token };
}
