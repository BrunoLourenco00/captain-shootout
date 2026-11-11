import { DEFAULT_GAME_CONFIG, type ShotCommand } from '@captain/game-protocol';
import { describe, expect, it } from 'vitest';
import { createInitialState, makeGameReducer, type GameAction, type GameState } from './gameState';

const config = DEFAULT_GAME_CONFIG;
/** Countdown 0-3 s, then the round. */
const ROUND_END = 3000 + config.roundDurationMs;
const reduce = makeGameReducer(config);
const SESSION = 'S1';

function run(state: GameState, ...actions: GameAction[]): GameState {
  return actions.reduce(reduce, state);
}

function shot(shotId: string, sessionId = SESSION): ShotCommand {
  return { sessionId, shotId, directionX: 0, directionY: 0.5, power: 0.5, clientTimestamp: 0 };
}

/** A live round that is PLAYING; the round started at t=3000 and ends at ROUND_END. */
function playing(): GameState {
  return run(
    createInitialState(SESSION),
    { type: 'PLAYER_JOINED', sessionId: SESSION, nickname: 'BRUNO', now: 0 },
    { type: 'PLAYER_READY', now: 0 },
    { type: 'TICK', now: 3000 },
  );
}

describe('state machine', () => {
  it('runs attract → connected → countdown → playing → finished → results → attract', () => {
    let s = createInitialState(SESSION);
    s = run(s, { type: 'PLAYER_JOINED', sessionId: SESSION, nickname: 'BRUNO', now: 0 });
    expect(s.status).toBe('connected');
    s = run(s, { type: 'PLAYER_READY', now: 1000 });
    expect(s.status).toBe('countdown');
    s = run(s, { type: 'TICK', now: 3999 });
    expect(s.status).toBe('countdown');
    s = run(s, { type: 'TICK', now: 4000 });
    expect(s.status).toBe('playing');
    s = run(s, { type: 'TICK', now: 4000 + config.roundDurationMs });
    expect(s.status).toBe('finished');
    s = run(s, { type: 'TICK', now: 4000 + config.roundDurationMs + 100 });
    expect(s.status).toBe('results');
    s = run(s, { type: 'TICK', now: 4000 + config.roundDurationMs + 100 + 10_000 });
    // Back to attract without a session: the app opens a new one (new QR).
    expect(s).toEqual(createInitialState());
  });

  it('expires a joined player who never presses READY', () => {
    let s = run(createInitialState(SESSION), {
      type: 'PLAYER_JOINED',
      sessionId: SESSION,
      nickname: 'X',
      now: 0,
    });
    s = run(s, { type: 'TICK', now: config.readyTimeoutMs });
    expect(s.status).toBe('attract');
    expect(s.nickname).toBeNull();
  });

  it('ignores joins for another session or while a game is running', () => {
    const s = createInitialState(SESSION);
    expect(run(s, { type: 'PLAYER_JOINED', sessionId: 'OTHER', nickname: 'X', now: 0 })).toBe(s);
    const p = playing();
    expect(run(p, { type: 'PLAYER_JOINED', sessionId: SESSION, nickname: 'Y', now: 0 })).toBe(p);
  });

  it('demo mode starts a countdown from attract without a phone', () => {
    const s = run(createInitialState(SESSION), { type: 'DEMO_START', now: 0 });
    expect(s).toMatchObject({ status: 'countdown', mode: 'demo', nickname: 'DEMO' });
  });

  it('RESET returns to attract from anywhere and drops the session', () => {
    expect(run(playing(), { type: 'RESET' })).toEqual(createInitialState());
  });

  it('a new session can only be attached while in attract', () => {
    expect(run(createInitialState(), { type: 'SESSION_OPENED', sessionId: 'S9' }).sessionId).toBe(
      'S9',
    );
    expect(run(playing(), { type: 'SESSION_OPENED', sessionId: 'S9' }).sessionId).toBe(SESSION);
  });

  it('nobody can join while no session is open', () => {
    const s = createInitialState();
    expect(run(s, { type: 'PLAYER_JOINED', sessionId: 'S1', nickname: 'X', now: 0 })).toBe(s);
  });

  it('a phone disconnect does not stop the round', () => {
    let s = run(playing(), { type: 'CONTROLLER_PRESENCE', connected: false });
    expect(s).toMatchObject({ status: 'playing', controllerConnected: false });
    s = run(s, { type: 'CONTROLLER_PRESENCE', connected: true });
    expect(s.controllerConnected).toBe(true);
  });

  it('stores the leaderboard rank only on the results screen', () => {
    let s = run(playing(), { type: 'TICK', now: ROUND_END }, { type: 'TICK', now: ROUND_END + 1 });
    expect(s.status).toBe('results');
    s = run(s, { type: 'RESULT_SAVED', rank: 4 });
    expect(s.rank).toBe(4);
    expect(run(playing(), { type: 'RESULT_SAVED', rank: 1 }).rank).toBeNull();
  });
});

describe('shots', () => {
  it('accepts a valid shot and counts an attempt', () => {
    const s = run(playing(), { type: 'SHOT', command: shot('a'), now: 5000 });
    expect(s.balls).toHaveLength(1);
    expect(s.score.shots).toBe(1);
  });

  it('rejects shots outside PLAYING', () => {
    const s = createInitialState(SESSION);
    expect(run(s, { type: 'SHOT', command: shot('a'), now: 0 })).toBe(s);
  });

  it('rejects shots for another session', () => {
    const s = playing();
    expect(run(s, { type: 'SHOT', command: shot('a', 'OTHER'), now: 5000 })).toBe(s);
  });

  it('ignores duplicated shot ids', () => {
    const s = run(
      playing(),
      { type: 'SHOT', command: shot('a'), now: 5000 },
      { type: 'SHOT', command: shot('a'), now: 6000 },
    );
    expect(s.score.shots).toBe(1);
  });

  it('rate-limits shots', () => {
    const s = run(
      playing(),
      { type: 'SHOT', command: shot('a'), now: 5000 },
      { type: 'SHOT', command: shot('b'), now: 5000 + config.minShotIntervalMs - 1 },
    );
    expect(s.score.shots).toBe(1);
  });

  it('limits balls in flight', () => {
    let s = playing();
    for (let i = 0; i < config.maxBallsInFlight + 1; i++) {
      s = run(s, { type: 'SHOT', command: shot(`s${i}`), now: 5000 + i * 1000 });
    }
    expect(s.balls).toHaveLength(config.maxBallsInFlight);
  });

  it('rejects a late shot that arrives before the buzzer tick', () => {
    const s = playing();
    expect(run(s, { type: 'SHOT', command: shot('a'), now: ROUND_END })).toBe(s);
  });
});

describe('resolution', () => {
  it('scores a shot exactly once', () => {
    const s = run(
      playing(),
      { type: 'SHOT', command: shot('a'), now: 5000 },
      { type: 'SHOT_RESOLVED', shotId: 'a', outcome: 'scored' },
      { type: 'SHOT_RESOLVED', shotId: 'a', outcome: 'perfect' },
      { type: 'BALL_REMOVED', shotId: 'a' },
    );
    expect(s.score).toMatchObject({ score: 2, baskets: 1, shots: 1 });
    expect(s.balls).toHaveLength(0);
  });

  it('a ball removed without scoring is a miss', () => {
    const s = run(
      playing(),
      { type: 'SHOT', command: shot('a'), now: 5000 },
      { type: 'BALL_REMOVED', shotId: 'a' },
    );
    expect(s.feedback?.outcome).toBe('missed');
    expect(s.score.score).toBe(0);
  });

  it('ignores resolutions for unknown shots', () => {
    const s = playing();
    expect(run(s, { type: 'SHOT_RESOLVED', shotId: 'ghost', outcome: 'perfect' })).toBe(s);
  });

  it('a ball in the air at the buzzer can still score during the grace window', () => {
    let s = run(
      playing(),
      { type: 'SHOT', command: shot('a'), now: ROUND_END - 100 },
      { type: 'TICK', now: ROUND_END },
    );
    expect(s.status).toBe('finished');
    s = run(s, { type: 'SHOT_RESOLVED', shotId: 'a', outcome: 'perfect' });
    expect(s.score.score).toBe(3);
    s = run(s, { type: 'TICK', now: ROUND_END + 100 });
    expect(s.status).toBe('results');
  });

  it('unresolved balls at the end of the grace window count as misses', () => {
    const s = run(
      playing(),
      { type: 'SHOT', command: shot('a'), now: ROUND_END - 100 },
      { type: 'TICK', now: ROUND_END },
      { type: 'TICK', now: ROUND_END + config.buzzerGraceMs },
    );
    expect(s.status).toBe('results');
    expect(s.score).toMatchObject({ shots: 1, baskets: 0 });
  });
});
