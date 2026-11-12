import type { ControllerView } from './controller';

export interface HostSessionInfo {
  sessionId: string;
  token: string;
}

export interface HostHandlers {
  /**
   * A phone claimed the session. The nickname is untrusted: the desktop re-validates it.
   * `playerId` is the CAPTAIN account uid, already verified by the transport from the
   * account's signed ID token; null = guest (plays, but never reaches the leaderboard).
   */
  onJoin: (player: { nickname: string; playerId: string | null }) => void;
  onReady: () => void;
  /** Untrusted payload; parse with parseShotCommand. */
  onShot: (raw: unknown) => void;
  onControllerPresence: (connected: boolean) => void;
}

/**
 * Desktop side of the transport. One open session at a time.
 * Game logic never imports a backend SDK; it only talks to this interface.
 */
export interface HostTransport {
  /** Closes any previous session and opens a new one that a phone can join. */
  openSession(handlers: HostHandlers): Promise<HostSessionInfo>;
  /** Display-only state for the phone (the desktop stays authoritative). */
  publishView(view: ControllerView): Promise<void>;
  /** Tells the phone the session is over and stops listening. */
  closeSession(): Promise<void>;
  /** Desktop connectivity to the backend. Returns an unsubscribe function. */
  onConnection(listener: (online: boolean) => void): () => void;
}

export interface LeaderboardEntry {
  /** Verified CAPTAIN account uid: one leaderboard entry per account. */
  playerId: string;
  /** Display name only; two accounts may share it. */
  nickname: string;
  score: number;
  baskets: number;
  shots: number;
  completedAt: number;
}

export interface LeaderboardStore {
  /**
   * Stores the result if it is the account's best and returns the leaderboard rank
   * (1-based) and how many players are on the board.
   */
  submit(entry: LeaderboardEntry): Promise<{ rank: number | null; players?: number | null }>;
  top(limit: number): Promise<LeaderboardEntry[]>;
}

/** Deterministic ordering: score desc, baskets desc, earliest completion first. */
export function compareEntries(a: LeaderboardEntry, b: LeaderboardEntry): number {
  return b.score - a.score || b.baskets - a.baskets || a.completedAt - b.completedAt;
}

/** True when `candidate` should replace `current` as an account's best result. */
export function isBetterResult(candidate: LeaderboardEntry, current: LeaderboardEntry): boolean {
  // A tie keeps the older entry, which already wins on earliest completion.
  return (
    candidate.score > current.score ||
    (candidate.score === current.score && candidate.baskets > current.baskets)
  );
}
