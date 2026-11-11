import {
  DEFAULT_GAME_CONFIG,
  type NormalizedSwipe,
  type ShotOutcome,
} from '@captain/game-protocol';
import { useCallback, useEffect, useReducer } from 'react';
import {
  AttractOverlay,
  ConnectedOverlay,
  CountdownOverlay,
  FeedbackPop,
  Hud,
  ResultsOverlay,
} from '../features/overlays/Overlays';
import { GameScene } from '../game/scene/GameScene';
import { levelFor } from '../game/scoring/levels';
import { isOnFire } from '../game/scoring/scoring';
import { DEMO_SESSION_ID, createInitialState, makeGameReducer } from '../game/state/gameState';
import { useDemoInput } from '../input/useDemoInput';
import { useOperatorKeys } from '../input/useOperatorKeys';
import { useHostSession } from '../services/useHostSession';

const config = DEFAULT_GAME_CONFIG;
const gameReducer = makeGameReducer(config);
const TICK_MS = 100;

export function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, () => createInitialState());
  const host = useHostSession(state, dispatch, config);

  // The desktop owns the clock: every timed transition happens on TICK.
  useEffect(() => {
    const id = setInterval(() => dispatch({ type: 'TICK', now: Date.now() }), TICK_MS);
    return () => clearInterval(id);
  }, []);

  useOperatorKeys({
    onReset: useCallback(() => dispatch({ type: 'RESET' }), []),
    onDemo: useCallback(() => dispatch({ type: 'DEMO_START', now: Date.now() }), []),
  });

  const fireDemoShot = useCallback(
    (shot: NormalizedSwipe) =>
      dispatch({
        type: 'SHOT',
        now: Date.now(),
        command: {
          ...shot,
          sessionId: DEMO_SESSION_ID,
          shotId: crypto.randomUUID(),
          clientTimestamp: Date.now(),
        },
      }),
    [],
  );
  useDemoInput(state.mode === 'demo' && state.status === 'playing', config.gesture, fireDemoShot);

  const onResolve = useCallback(
    (shotId: string, outcome: ShotOutcome) => dispatch({ type: 'SHOT_RESOLVED', shotId, outcome }),
    [],
  );
  const onRemove = useCallback((shotId: string) => dispatch({ type: 'BALL_REMOVED', shotId }), []);

  const inRound = state.status === 'playing' || state.status === 'finished';
  const roundActive = state.status === 'countdown' || inRound;
  const basketSeq = state.feedback && state.feedback.outcome !== 'missed' ? state.feedback.seq : 0;

  return (
    <div className="stage">
      <GameScene
        balls={state.balls}
        onResolve={onResolve}
        onRemove={onRemove}
        roundActive={roundActive}
        hoopMotion={levelFor(state.score.score, config.levels)}
        onFire={inRound && isOnFire(state.score, config.scoring)}
        basketSeq={basketSeq}
      />
      {state.status === 'attract' && <AttractOverlay host={host} />}
      {state.status === 'connected' && <ConnectedOverlay nickname={state.nickname ?? ''} />}
      {state.status === 'countdown' && <CountdownOverlay endsAt={state.statusEndsAt} />}
      {inRound && <Hud state={state} config={config} />}
      {!host.online && host.configured && <div className="net-badge">OFFLINE · RECONNECTING</div>}
      {inRound && <FeedbackPop feedback={state.feedback} />}
      {state.status === 'results' && (
        <ResultsOverlay state={state} leaderboard={host.leaderboard} />
      )}
    </div>
  );
}
