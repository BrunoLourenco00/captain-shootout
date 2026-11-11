import { DEFAULT_GAME_CONFIG, type ShotCommand } from '@captain/game-protocol';
import { describe, expect, it } from 'vitest';
import { toControllerView } from './controllerView';
import { createInitialState, makeGameReducer, type GameAction, type GameState } from './gameState';

const config = DEFAULT_GAME_CONFIG;
/** Countdown 0-3 s, then the round. */
const ROUND_END = 3000 + config.roundDurationMs;
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

const joined = () =>
  run(createInitialState('S1'), {
    type: 'PLAYER_JOINED',
    sessionId: 'S1',
    nickname: 'ANA',
    now: 0,
  });

describe('toControllerView', () => {
  it('publishes nothing on the attract screen or in demo mode', () => {
    expect(toControllerView(createInitialState('S1'), 0, config)).toBeNull();
    const demo = run(createInitialState('S1'), { type: 'DEMO_START', now: 0 });
    expect(toControllerView(demo, 0, config)).toBeNull();
  });

  it('shows the countdown and the round time', () => {
    const countdown = run(joined(), { type: 'PLAYER_READY', now: 0 });
    expect(toControllerView(countdown, 500, config)).toMatchObject({
      status: 'countdown',
      secondsLeft: 3,
      nickname: 'ANA',
    });
    const playing = run(countdown, { type: 'TICK', now: 3000 });
    expect(toControllerView(playing, 3000, config)?.secondsLeft).toBe(
      config.roundDurationMs / 1000,
    );
    expect(toControllerView(playing, ROUND_END - 900, config)?.secondsLeft).toBe(1);
  });

  it('reports the last resolved shot and the score', () => {
    const s = run(
      joined(),
      { type: 'PLAYER_READY', now: 0 },
      { type: 'TICK', now: 3000 },
      { type: 'SHOT', command: shot('a'), now: 4000 },
      { type: 'SHOT_RESOLVED', shotId: 'a', outcome: 'perfect' },
    );
    expect(toControllerView(s, 5000, config)).toMatchObject({
      score: 3,
      lastShot: { shotId: 'a', outcome: 'perfect', points: 3, scoreAfterShot: 3 },
    });
  });

  it('includes the summary and rank on the results screen', () => {
    const s = run(
      joined(),
      { type: 'PLAYER_READY', now: 0 },
      { type: 'TICK', now: 3000 },
      { type: 'TICK', now: ROUND_END },
      { type: 'TICK', now: ROUND_END + 1 },
      { type: 'RESULT_SAVED', rank: 2 },
    );
    expect(toControllerView(s, 34_000, config)).toMatchObject({
      status: 'results',
      results: { score: 0, shots: 0, accuracy: 0, rank: 2 },
    });
  });
});
