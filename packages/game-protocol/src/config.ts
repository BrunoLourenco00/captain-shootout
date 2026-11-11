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
  /** Last stretch of the round where every basket is multiplied (stacks with streaks). */
  clutch: {
    lastMs: number;
    multiplier: number;
  };
  /**
   * Difficulty by score: the hoop sways left/right (and later bobs) faster the better
   * the player is doing. Sorted by minScore; the first level must start at 0.
   */
  levels: LevelConfig[];
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

export interface LevelConfig {
  minScore: number;
  /** Left/right travel from the centre, in metres (0 = still). */
  hoopSwayM: number;
  /** Up/down travel from the regulation height, in metres. */
  hoopBobM: number;
  /** Time for one full left-right-left cycle. */
  hoopPeriodMs: number;
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
  clutch: {
    lastMs: 10_000,
    multiplier: 2,
  },
  levels: [
    { minScore: 0, hoopSwayM: 0, hoopBobM: 0, hoopPeriodMs: 4_000 },
    { minScore: 10, hoopSwayM: 0.35, hoopBobM: 0, hoopPeriodMs: 4_200 },
    { minScore: 25, hoopSwayM: 0.6, hoopBobM: 0, hoopPeriodMs: 3_200 },
    { minScore: 45, hoopSwayM: 0.75, hoopBobM: 0.12, hoopPeriodMs: 2_600 },
  ],
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
