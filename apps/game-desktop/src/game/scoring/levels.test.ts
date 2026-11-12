import { DEFAULT_GAME_CONFIG, type ShotCommand } from '@captain/game-protocol';
import { describe, expect, it } from 'vitest';
import {
  createInitialState,
  makeGameReducer,
  type GameAction,
  type GameState,
} from '../state/gameState';
import { levelIndex } from './levels';

const config = DEFAULT_GAME_CONFIG;
const levels = config.levels;

describe('levelIndex', () => {
  it('starts still and climbs with the score thresholds', () => {
    expect(levelIndex(0, levels)).toBe(0);
    expect(levelIndex(7, levels)).toBe(0);
    expect(levelIndex(8, levels)).toBe(1);
    expect(levelIndex(20, levels)).toBe(2);
    expect(levelIndex(35, levels)).toBe(3);
    expect(levelIndex(1000, levels)).toBe(levels.length - 1);
  });

  it('the first level never moves the hoop', () => {
    expect(levels[0]?.minScore).toBe(0);
    expect(levels[0]?.hoopSwayM).toBe(0);
  });
});

describe('level-up in the round', () => {
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
  // Countdown 0-3 s, round 3-38 s.
  const playing = () =>
    run(
      createInitialState('S1'),
      { type: 'PLAYER_JOINED', sessionId: 'S1', nickname: 'ANA', playerId: 'uid-1', now: 0 },
      { type: 'PLAYER_READY', now: 0 },
      { type: 'TICK', now: 3000 },
    );

  it('announces the streak multiplier on the 5th and 10th basket in a row', () => {
    let s = playing();
    const ups: (number | null)[] = [];
    for (let i = 0; i < 11; i++) {
      s = run(
        s,
        { type: 'SHOT', command: shot(`s${i}`), now: 4000 + i * 1000 },
        { type: 'SHOT_RESOLVED', shotId: `s${i}`, outcome: 'scored' },
      );
      ups.push(s.feedback?.multiplierUp ?? null);
    }
    expect(ups).toEqual([null, null, null, null, 1.5, null, null, null, null, 2, null]);
    expect(s.feedback?.multiplier).toBe(2);
  });

  it('reports the new level once, on the basket that reaches it', () => {
    // 2 + 2 + 2 = 6 (level 1), the 4th basket makes 8 (level 2).
    let s = playing();
    for (const [i, id] of ['a', 'b', 'c', 'd'].entries()) {
      s = run(
        s,
        { type: 'SHOT', command: shot(id), now: 4000 + i * 1000 },
        { type: 'SHOT_RESOLVED', shotId: id, outcome: 'scored' },
      );
      expect(s.feedback?.levelUp).toBe(id === 'd' ? 2 : null);
    }
    expect(s.score.score).toBe(8);
  });
});
