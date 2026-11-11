import { DEFAULT_GAME_CONFIG, type ShotCommand } from '@captain/game-protocol';
import { describe, expect, it } from 'vitest';
import {
  createInitialState,
  makeGameReducer,
  type GameAction,
  type GameState,
} from '../state/gameState';
import { isClutchTime, levelIndex } from './levels';

const config = DEFAULT_GAME_CONFIG;
const levels = config.levels;

describe('levelIndex', () => {
  it('starts still and climbs with the score thresholds', () => {
    expect(levelIndex(0, levels)).toBe(0);
    expect(levelIndex(9, levels)).toBe(0);
    expect(levelIndex(10, levels)).toBe(1);
    expect(levelIndex(25, levels)).toBe(2);
    expect(levelIndex(1000, levels)).toBe(levels.length - 1);
  });

  it('the first level never moves the hoop', () => {
    expect(levels[0]?.minScore).toBe(0);
    expect(levels[0]?.hoopSwayM).toBe(0);
  });
});

describe('isClutchTime', () => {
  it('covers only the last stretch of the round', () => {
    const end = 33_000;
    expect(isClutchTime(end - config.clutch.lastMs - 1, end, config.clutch)).toBe(false);
    expect(isClutchTime(end - config.clutch.lastMs, end, config.clutch)).toBe(true);
    expect(isClutchTime(end - 1, end, config.clutch)).toBe(true);
    expect(isClutchTime(end, end, config.clutch)).toBe(false);
    expect(isClutchTime(1000, null, config.clutch)).toBe(false);
  });
});

describe('clutch time and level-up in the round', () => {
  const reduce = makeGameReducer(config);
  const run = (state: GameState, ...actions: GameAction[]) => actions.reduce(reduce, state);
  const shot = (shotId: string): ShotCommand => ({
    sessionId: 'S1',
    shotId,
    directionX: 0,
    directionY: 0.4,
    power: 0.5,
    clientTimestamp: 0,
  });
  // Countdown 0-3 s, round 3-33 s, clutch from 23 s.
  const playing = () =>
    run(
      createInitialState('S1'),
      { type: 'PLAYER_JOINED', sessionId: 'S1', nickname: 'ANA', now: 0 },
      { type: 'PLAYER_READY', now: 0 },
      { type: 'TICK', now: 3000 },
    );

  it('doubles a basket shot in clutch time, not one shot before it', () => {
    const early = run(
      playing(),
      { type: 'SHOT', command: shot('a'), now: 22_000 },
      { type: 'SHOT_RESOLVED', shotId: 'a', outcome: 'scored' },
    );
    expect(early.feedback).toMatchObject({ points: 2, clutch: false });

    const late = run(
      playing(),
      { type: 'SHOT', command: shot('b'), now: 24_000 },
      { type: 'SHOT_RESOLVED', shotId: 'b', outcome: 'perfect' },
    );
    expect(late.feedback).toMatchObject({ points: 6, clutch: true });
    expect(late.score.score).toBe(6);
  });

  it('a clutch miss is not flagged as clutch', () => {
    const s = run(
      playing(),
      { type: 'SHOT', command: shot('a'), now: 24_000 },
      { type: 'SHOT_RESOLVED', shotId: 'a', outcome: 'missed' },
    );
    expect(s.feedback).toMatchObject({ points: 0, clutch: false });
  });

  it('reports the new level once, on the basket that reaches it', () => {
    // 3 + 3 + 3 = 9 (level 1), the 4th perfect makes 12 (level 2).
    let s = playing();
    for (const [i, id] of ['a', 'b', 'c', 'd'].entries()) {
      s = run(
        s,
        { type: 'SHOT', command: shot(id), now: 4000 + i * 1000 },
        { type: 'SHOT_RESOLVED', shotId: id, outcome: 'perfect' },
      );
      expect(s.feedback?.levelUp).toBe(id === 'd' ? 2 : null);
    }
    expect(s.score.score).toBe(12);
  });
});
