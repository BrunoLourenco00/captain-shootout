import type { LevelConfig } from '@captain/game-protocol';

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
