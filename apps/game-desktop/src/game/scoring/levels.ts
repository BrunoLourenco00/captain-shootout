import type { GameConfig, LevelConfig } from '@captain/game-protocol';

/** 0-based index of the level reached with this score (shown to players as index + 1). */
export function levelIndex(score: number, levels: readonly LevelConfig[]): number {
  let index = 0;
  levels.forEach((level, i) => {
    if (score >= level.minScore) index = i;
  });
  return index;
}

export function levelFor(score: number, levels: readonly LevelConfig[]): LevelConfig {
  return levels[levelIndex(score, levels)] ?? STILL_LEVEL;
}

const STILL_LEVEL: LevelConfig = { minScore: 0, hoopSwayM: 0, hoopBobM: 0, hoopPeriodMs: 4_000 };

/** True when `at` falls in the clutch stretch at the end of a round ending at `roundEndsAt`. */
export function isClutchTime(
  at: number,
  roundEndsAt: number | null,
  clutch: GameConfig['clutch'],
): boolean {
  if (roundEndsAt === null || clutch.lastMs <= 0) return false;
  return at >= roundEndsAt - clutch.lastMs && at < roundEndsAt;
}
