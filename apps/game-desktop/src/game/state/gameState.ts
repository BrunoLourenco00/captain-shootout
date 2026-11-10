import type { GameConfig, GameStatus, ShotCommand, ShotOutcome } from '@captain/game-protocol';
import { EMPTY_SCORE, applyOutcome, recordAttempt, type ScoreState } from '../scoring/scoring';

/** A ball the scene should simulate. Created only for accepted shots. */
export interface ActiveBall {
  shotId: string;
  directionX: number;
  power: number;
  firedAt: number;
  resolved: boolean;
}

export interface ShotFeedback {
  /** Increments on every feedback so the UI can re-trigger animations. */
  seq: number;
  outcome: ShotOutcome;
  points: number;
  multiplied: boolean;
}

export type GameMode = 'live' | 'demo';

export interface GameState {
  status: GameStatus;
  mode: GameMode;
  sessionId: string;
  nickname: string | null;
  /** Deadline for the current status (ready timeout, countdown, round, buzzer grace, results). */
  statusEndsAt: number | null;
  roundEndsAt: number | null;
  score: ScoreState;
  balls: ActiveBall[];
  seenShotIds: ReadonlySet<string>;
  lastShotAt: number | null;
  feedback: ShotFeedback | null;
}

export type GameAction =
  | { type: 'PLAYER_JOINED'; sessionId: string; nickname: string; now: number }
  | { type: 'PLAYER_READY'; now: number }
  | { type: 'DEMO_START'; now: number }
  | { type: 'TICK'; now: number }
  | { type: 'SHOT'; command: ShotCommand; now: number }
  | { type: 'SHOT_RESOLVED'; shotId: string; outcome: ShotOutcome }
  | { type: 'BALL_REMOVED'; shotId: string }
  | { type: 'RESET'; sessionId: string };

export function createInitialState(sessionId: string): GameState {
  return {
    status: 'attract',
    mode: 'live',
    sessionId,
    nickname: null,
    statusEndsAt: null,
    roundEndsAt: null,
    score: EMPTY_SCORE,
    balls: [],
    seenShotIds: new Set(),
    lastShotAt: null,
    feedback: null,
  };
}

export type ShotRejection =
  'not_playing' | 'wrong_session' | 'duplicate' | 'late' | 'too_fast' | 'too_many_balls';

export function checkShot(
  state: GameState,
  command: ShotCommand,
  now: number,
  config: GameConfig,
): ShotRejection | null {
  if (state.status !== 'playing') return 'not_playing';
  if (command.sessionId !== state.sessionId) return 'wrong_session';
  if (state.seenShotIds.has(command.shotId)) return 'duplicate';
  if (state.roundEndsAt !== null && now >= state.roundEndsAt) return 'late';
  if (state.lastShotAt !== null && now - state.lastShotAt < config.minShotIntervalMs) {
    return 'too_fast';
  }
  const inFlight = state.balls.filter((b) => !b.resolved).length;
  if (inFlight >= config.maxBallsInFlight) return 'too_many_balls';
  return null;
}

function startCountdown(state: GameState, now: number, config: GameConfig): GameState {
  const countdownEndsAt = now + config.countdownMs;
  return {
    ...state,
    status: 'countdown',
    statusEndsAt: countdownEndsAt,
    roundEndsAt: countdownEndsAt + config.roundDurationMs,
    score: EMPTY_SCORE,
    balls: [],
    seenShotIds: new Set(),
    lastShotAt: null,
    feedback: null,
  };
}

function resolveBall(
  state: GameState,
  shotId: string,
  outcome: ShotOutcome,
  config: GameConfig,
): GameState {
  const ball = state.balls.find((b) => b.shotId === shotId);
  // Per-shot guard: a shot resolves exactly once.
  if (!ball || ball.resolved) return state;
  const { state: score, points } = applyOutcome(state.score, outcome, config.scoring);
  return {
    ...state,
    score,
    balls: state.balls.map((b) => (b.shotId === shotId ? { ...b, resolved: true } : b)),
    feedback: {
      seq: (state.feedback?.seq ?? 0) + 1,
      outcome,
      points,
      multiplied: outcome !== 'missed' && score.streak >= config.scoring.streakThreshold,
    },
  };
}

function toResults(state: GameState, now: number, config: GameConfig): GameState {
  // Anything still unresolved at the end counts as a miss.
  let next = state;
  for (const ball of state.balls) {
    if (!ball.resolved) next = resolveBall(next, ball.shotId, 'missed', config);
  }
  return { ...next, status: 'results', statusEndsAt: now + config.resultsDurationMs, balls: [] };
}

function tick(state: GameState, now: number, config: GameConfig): GameState {
  if (state.statusEndsAt === null || now < state.statusEndsAt) {
    if (state.status === 'finished' && state.balls.every((b) => b.resolved)) {
      return toResults(state, now, config);
    }
    return state;
  }
  switch (state.status) {
    case 'connected':
      return createInitialState(state.sessionId);
    case 'countdown':
      return { ...state, status: 'playing', statusEndsAt: state.roundEndsAt };
    case 'playing':
      return { ...state, status: 'finished', statusEndsAt: now + config.buzzerGraceMs };
    case 'finished':
      return toResults(state, now, config);
    case 'results':
      return createInitialState(state.sessionId);
    case 'attract':
      return state;
  }
}

export function makeGameReducer(config: GameConfig) {
  return function gameReducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
      case 'PLAYER_JOINED':
        if (state.status !== 'attract' || action.sessionId !== state.sessionId) return state;
        return {
          ...state,
          status: 'connected',
          mode: 'live',
          nickname: action.nickname,
          statusEndsAt: action.now + config.readyTimeoutMs,
        };

      case 'PLAYER_READY':
        if (state.status !== 'connected') return state;
        return startCountdown(state, action.now, config);

      case 'DEMO_START':
        if (state.status !== 'attract') return state;
        return startCountdown(
          // Demo shots are produced locally against the current session id.
          { ...state, mode: 'demo', nickname: 'DEMO' },
          action.now,
          config,
        );

      case 'TICK':
        return tick(state, action.now, config);

      case 'SHOT': {
        const { command, now } = action;
        if (checkShot(state, command, now, config) !== null) return state;
        const seenShotIds = new Set(state.seenShotIds);
        seenShotIds.add(command.shotId);
        return {
          ...state,
          score: recordAttempt(state.score),
          seenShotIds,
          lastShotAt: now,
          balls: [
            ...state.balls,
            {
              shotId: command.shotId,
              directionX: command.directionX,
              power: command.power,
              firedAt: now,
              resolved: false,
            },
          ],
        };
      }

      case 'SHOT_RESOLVED':
        if (state.status !== 'playing' && state.status !== 'finished') return state;
        return resolveBall(state, action.shotId, action.outcome, config);

      case 'BALL_REMOVED': {
        const resolved = resolveBall(state, action.shotId, 'missed', config);
        return { ...resolved, balls: resolved.balls.filter((b) => b.shotId !== action.shotId) };
      }

      case 'RESET':
        return createInitialState(action.sessionId);
    }
  };
}
