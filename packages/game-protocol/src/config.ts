/**
 * Tunable game settings. Everything the team may want to change on event day lives here.
 * See docs/DECISIONS.md for the agreed values.
 */
export interface GameConfig {
  roundDurationMs: number;
  countdownMs: number;
  /** Time a joined player has to press READY before the session expires. */
  readyTimeoutMs: number;
  resultsDurationMs: number;
  /** After the buzzer, how long in-flight balls may still score before results. */
  buzzerGraceMs: number;
  maxBallsInFlight: number;
  minShotIntervalMs: number;
  scoring: {
    basketPoints: number;
    /** Basket without touching the rim. */
    perfectPoints: number;
    /** The Nth consecutive basket (and every one after) is multiplied. */
    streakThreshold: number;
    streakMultiplier: number;
  };
  nickname: {
    minLength: number;
    maxLength: number;
  };
  gesture: {
    /** Upward swipe shorter than this fraction of the surface height is ignored. */
    minSwipeFraction: number;
    /** Upward swipe of this fraction of the surface height is full power. */
    fullPowerSwipeFraction: number;
    /** Horizontal swipe of this fraction of the surface width is full left/right aim. */
    fullAimSwipeFraction: number;
  };
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  roundDurationMs: 30_000,
  countdownMs: 3_000,
  readyTimeoutMs: 60_000,
  resultsDurationMs: 10_000,
  buzzerGraceMs: 2_500,
  maxBallsInFlight: 3,
  minShotIntervalMs: 350,
  scoring: {
    basketPoints: 2,
    perfectPoints: 3,
    streakThreshold: 5,
    streakMultiplier: 2,
  },
  nickname: {
    minLength: 2,
    maxLength: 16,
  },
  gesture: {
    minSwipeFraction: 0.06,
    fullPowerSwipeFraction: 0.6,
    fullAimSwipeFraction: 0.5,
  },
};
