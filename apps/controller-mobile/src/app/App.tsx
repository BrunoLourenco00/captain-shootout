import {
  DEFAULT_GAME_CONFIG,
  parseJoinParams,
  validateNickname,
  type JoinParams,
  type NormalizedSwipe,
} from '@captain/game-protocol';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  CountdownScreen,
  MessageScreen,
  NicknameScreen,
  PlayScreen,
  ReadyScreen,
  ResultsScreen,
} from '../features/Screens';
import { useWakeLock } from '../features/useWakeLock';
import { createTransport } from '../services/createTransport';
import {
  ERROR_MESSAGES,
  INITIAL_CONTROLLER_STATE,
  canShoot,
  controllerReducer,
  selectScreen,
} from './controllerState';

const config = DEFAULT_GAME_CONFIG;

export function App() {
  const params = useMemo(() => parseJoinParams(window.location.search), []);
  if (!params) {
    return (
      <MessageScreen
        title="SCAN TO PLAY"
        body="Scan the QR code on the big screen to join the game."
      />
    );
  }
  return <Controller params={params} />;
}

function Controller({ params }: { params: JoinParams }) {
  const transport = useMemo(createTransport, []);
  const [state, dispatch] = useReducer(controllerReducer, INITIAL_CONTROLLER_STATE);
  const [shotSeq, setShotSeq] = useState(0);
  // Latest state for event handlers (avoids re-creating the swipe handlers on every view update).
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const unsubscribe = transport.subscribe({
      onView: (view) => dispatch({ type: 'VIEW', view }),
      onConnection: (connection) => dispatch({ type: 'CONNECTION', state: connection }),
    });
    return () => {
      unsubscribe();
      void transport.leave();
    };
  }, [transport]);

  const join = useCallback(
    async (raw: string) => {
      const checked = validateNickname(raw, config.nickname);
      if (!checked.ok) {
        dispatch({ type: 'JOIN_FAILED', error: checked.error });
        return;
      }
      dispatch({ type: 'JOIN_REQUESTED' });
      try {
        const result = await transport.join(params, checked.nickname);
        dispatch(result.ok ? { type: 'JOINED' } : { type: 'JOIN_FAILED', error: result.error });
      } catch {
        dispatch({ type: 'JOIN_FAILED', error: 'network' });
      }
    },
    [params, transport],
  );

  const ready = useCallback(() => {
    dispatch({ type: 'READY_SENT' });
    void transport.setReady();
  }, [transport]);

  const shoot = useCallback(
    (shot: NormalizedSwipe) => {
      const now = Date.now();
      if (!canShoot(stateRef.current, now, config)) return;
      dispatch({ type: 'SHOT_SENT', now });
      setShotSeq((n) => n + 1);
      navigator.vibrate?.(15);
      void transport.sendShot({
        ...shot,
        sessionId: params.sessionId,
        shotId: crypto.randomUUID(),
        clientTimestamp: now,
      });
    },
    [params.sessionId, transport],
  );

  const screen = selectScreen(state);
  const view = state.view;
  useWakeLock(state.step === 'joined' && screen !== 'ended');

  return (
    <>
      {state.connection === 'reconnecting' && (
        <div className="banner" role="status">
          Reconnecting…
        </div>
      )}
      {renderScreen()}
    </>
  );

  function renderScreen() {
    switch (screen) {
      case 'nickname':
        return (
          <NicknameScreen
            maxLength={config.nickname.maxLength}
            busy={state.step === 'joining'}
            error={state.error ? ERROR_MESSAGES[state.error] : null}
            onSubmit={join}
          />
        );
      case 'waiting':
        return <MessageScreen title="GET READY" body="Waiting for the game to start…" />;
      case 'ready':
        return <ReadyScreen nickname={view?.nickname ?? ''} onReady={ready} />;
      case 'countdown':
        return <CountdownScreen seconds={view?.secondsLeft ?? 0} />;
      case 'playing':
        return (
          view && (
            <PlayScreen
              view={view}
              gesture={config.gesture}
              enabled={view.status === 'playing'}
              shotSeq={shotSeq}
              onShot={shoot}
            />
          )
        );
      case 'results':
        return view && <ResultsScreen view={view} />;
      case 'ended':
        return (
          <MessageScreen
            title="THANKS FOR PLAYING"
            body="Want another go? Scan the new QR code on the big screen."
          />
        );
    }
  }
}
