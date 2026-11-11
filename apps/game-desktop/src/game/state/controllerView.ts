import type { ControllerStatus, ControllerView, GameConfig } from '@captain/game-protocol';
import { accuracy, isOnFire, nextMultiplier } from '../scoring/scoring';
import type { GameState } from './gameState';

function secondsUntil(deadline: number | null, now: number): number {
  return deadline === null ? 0 : Math.max(0, Math.ceil((deadline - now) / 1000));
}

/**
 * Display-only view the desktop publishes to the phone. Null when there is no live
 * player to show anything to (attract screen, demo rounds).
 */
export function toControllerView(
  state: GameState,
  now: number,
  config: GameConfig,
): ControllerView | null {
  if (state.mode !== 'live' || state.status === 'attract' || !state.nickname) return null;

  const status: ControllerStatus = state.status;
  const deadline = state.status === 'countdown' ? state.statusEndsAt : state.roundEndsAt;
  const feedback = state.feedback;

  return {
    status,
    nickname: state.nickname,
    secondsLeft:
      state.status === 'countdown' || state.status === 'playing' ? secondsUntil(deadline, now) : 0,
    score: state.score.score,
    onFire: isOnFire(state.score, config.scoring),
    multiplier: nextMultiplier(state.score, config.scoring),
    lastShot: feedback
      ? {
          shotId: feedback.shotId,
          outcome: feedback.outcome,
          points: feedback.points,
          scoreAfterShot: state.score.score,
        }
      : null,
    results:
      state.status === 'results'
        ? {
            score: state.score.score,
            baskets: state.score.baskets,
            shots: state.score.shots,
            accuracy: accuracy(state.score),
            rank: state.rank,
          }
        : null,
  };
}
