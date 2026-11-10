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
import { createInitialState, makeGameReducer } from '../game/state/gameState';
import { useDemoInput } from '../input/useDemoInput';
import { useOperatorKeys } from '../input/useOperatorKeys';
import { createSessionId } from './session';

const config = DEFAULT_GAME_CONFIG;
const gameReducer = makeGameReducer(config);
const TICK_MS = 100;

export function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, () =>
    createInitialState(createSessionId()),
  );

  // The desktop owns the clock: every timed transition happens on TICK.
  useEffect(() => {
    const id = setInterval(() => dispatch({ type: 'TICK', now: Date.now() }), TICK_MS);
    return () => clearInterval(id);
  }, []);

  useOperatorKeys({
    onReset: useCallback(() => dispatch({ type: 'RESET', sessionId: createSessionId() }), []),
    onDemo: useCallback(() => dispatch({ type: 'DEMO_START', now: Date.now() }), []),
  });

  const sessionId = state.sessionId;
  const fireDemoShot = useCallback(
    (shot: NormalizedSwipe) =>
      dispatch({
        type: 'SHOT',
        now: Date.now(),
        command: { ...shot, sessionId, shotId: crypto.randomUUID(), clientTimestamp: Date.now() },
      }),
    [sessionId],
  );
  useDemoInput(state.mode === 'demo' && state.status === 'playing', config.gesture, fireDemoShot);

  const onResolve = useCallback(
    (shotId: string, outcome: ShotOutcome) => dispatch({ type: 'SHOT_RESOLVED', shotId, outcome }),
    [],
  );
  const onRemove = useCallback((shotId: string) => dispatch({ type: 'BALL_REMOVED', shotId }), []);

  const inRound = state.status === 'playing' || state.status === 'finished';

  return (
    <div className="stage">
      <GameScene balls={state.balls} onResolve={onResolve} onRemove={onRemove} />
      {state.status === 'attract' && <AttractOverlay joinUrl={null} />}
      {state.status === 'connected' && <ConnectedOverlay nickname={state.nickname ?? ''} />}
      {state.status === 'countdown' && <CountdownOverlay endsAt={state.statusEndsAt} />}
      {inRound && <Hud state={state} config={config} />}
      {inRound && <FeedbackPop feedback={state.feedback} />}
      {state.status === 'results' && <ResultsOverlay state={state} />}
    </div>
  );
}
