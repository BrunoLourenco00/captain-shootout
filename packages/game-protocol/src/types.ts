/**
 * Desktop game status. The spec's WAITING_FOR_PLAYER is folded into `attract`
 * (the attract screen is what waits for a player), READY is the transition into
 * `countdown`, and FINISHED is the short buzzer window where in-flight balls resolve.
 */
export type GameStatus = 'attract' | 'connected' | 'countdown' | 'playing' | 'finished' | 'results';

/** Normalized shot input sent by the phone (or produced by the desktop demo input). */
export interface ShotCommand {
  sessionId: string;
  shotId: string;
  /** -1 (full left) .. 1 (full right). */
  directionX: number;
  /** 0 .. 1, upward component of the swipe (positive = up). Informational. */
  directionY: number;
  /** 0 .. 1. 0.5 is the "sweet spot" that reaches the hoop. */
  power: number;
  clientTimestamp: number;
}

export type ShotOutcome = 'perfect' | 'scored' | 'missed';

/** Non-authoritative feedback the desktop may push back to the phone. */
export interface ShotResult {
  shotId: string;
  outcome: ShotOutcome;
  points: number;
  scoreAfterShot: number;
}

export interface Vec2 {
  x: number;
  y: number;
}
