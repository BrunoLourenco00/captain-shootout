import {
  streakMultiplier,
  type GameConfig,
  type GameStatus,
  type ShotCommand,
  type DnaShot,
  type ShotOutcome,
} from '@captain/game-protocol';
import { levelIndex } from '../scoring/levels';
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
  shotId: string;
  outcome: ShotOutcome;
  points: number;
  /** Streak multiplier applied to this basket (1 = none). */
  multiplier: number;
  /** The streak multiplier went up with this basket (e.g. 1.5 → 2), or null. */
  multiplierUp: number | null;
  /** Level (1-based) reached with this basket, or null if the level did not change. */
  levelUp: number | null;
}

export type GameMode = 'live' | 'demo';

export interface GameState {
  status: GameStatus;
  mode: GameMode;
  /** Open transport session the QR code points to (null while (re)opening one). */
  sessionId: string | null;
  nickname: string | null;
  /** Verified CAPTAIN account of the live player; null = guest (not ranked) or demo. */
  playerId: string | null;
  controllerConnected: boolean;
  /** Leaderboard rank of the last finished round, once saved. */
  rank: number | null;
  /** Players on the leaderboard when the rank was saved. */
  players: number | null;
  /** Every resolved shot of the round (for the player DNA). */
  shotLog: DnaShot[];
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
  | { type: 'SESSION_OPENED'; sessionId: string }
  | {
      type: 'PLAYER_JOINED';
      sessionId: string;
      nickname: string;
      playerId: string | null;
      now: number;
    }
  | { type: 'CONTROLLER_PRESENCE'; connected: boolean }
  | { type: 'RESULT_SAVED'; rank: number | null; players?: number | null }
  | { type: 'PLAYER_READY'; now: number }
  | { type: 'DEMO_START'; now: number }
  | { type: 'TICK'; now: number }
  | { type: 'SHOT'; command: ShotCommand; now: number }
  | { type: 'SHOT_RESOLVED'; shotId: string; outcome: ShotOutcome }
  | { type: 'BALL_REMOVED'; shotId: string }
  | { type: 'RESET' };

/** Session id used for locally generated demo shots. */
export const DEMO_SESSION_ID = 'demo';

export function createInitialState(sessionId: string | null = null): GameState {
  return {
    status: 'attract',
    mode: 'live',
    sessionId,
    nickname: null,
    playerId: null,
    controllerConnected: false,
    rank: null,
    players: null,
    shotLog: [],
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
    shotLog: [],
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
  const tiers = config.scoring.streakTiers;
  const multiplier = outcome === 'missed' ? 1 : streakMultiplier(score.streak, tiers);
  const previous = streakMultiplier(state.score.streak, tiers);
  const levelBefore = levelIndex(state.score.score, config.levels);
  const levelAfter = levelIndex(score.score, config.levels);
  return {
    ...state,
    score,
    balls: state.balls.map((b) => (b.shotId === shotId ? { ...b, resolved: true } : b)),
    shotLog: [...state.shotLog, { firedAt: ball.firedAt, outcome }],
    feedback: {
      seq: (state.feedback?.seq ?? 0) + 1,
      shotId,
      outcome,
      points,
      multiplier,
      multiplierUp: multiplier > previous ? multiplier : null,
      levelUp: levelAfter > levelBefore ? levelAfter + 1 : null,
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
      // Ready timeout: drop the player; a new session (and QR) will be opened.
      return createInitialState();
    case 'countdown':
      return { ...state, status: 'playing', statusEndsAt: state.roundEndsAt };
    case 'playing':
      return { ...state, status: 'finished', statusEndsAt: now + config.buzzerGraceMs };
    case 'finished':
      return toResults(state, now, config);
    case 'results':
      return createInitialState();
    case 'attract':
      return state;
  }
}

export function makeGameReducer(config: GameConfig) {
  return function gameReducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
      case 'SESSION_OPENED':
        if (state.status !== 'attract') return state;
        return { ...state, sessionId: action.sessionId };

      case 'PLAYER_JOINED':
        if (state.status !== 'attract' || state.sessionId === null) return state;
        if (action.sessionId !== state.sessionId) return state;
        return {
          ...state,
          status: 'connected',
          mode: 'live',
          nickname: action.nickname,
          playerId: action.playerId,
          controllerConnected: true,
          statusEndsAt: action.now + config.readyTimeoutMs,
        };

      case 'PLAYER_READY':
        if (state.status !== 'connected') return state;
        return startCountdown(state, action.now, config);

      case 'CONTROLLER_PRESENCE':
        // Informational only: a round keeps running if the phone drops (see DECISIONS.md).
        if (state.mode !== 'live' || state.status === 'attract') return state;
        return { ...state, controllerConnected: action.connected };

      case 'RESULT_SAVED':
        if (state.status !== 'results') return state;
        return { ...state, rank: action.rank, players: action.players ?? null };

      case 'DEMO_START':
        if (state.status !== 'attract') return state;
        return startCountdown(
          { ...state, mode: 'demo', sessionId: DEMO_SESSION_ID, nickname: 'DEMO', playerId: null },
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
        return createInitialState();
    }
  };
}
