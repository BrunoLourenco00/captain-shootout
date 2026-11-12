import { accountErrorMessage } from '@captain/firebase-transport/account';
import {
  DEFAULT_GAME_CONFIG,
  parseJoinParams,
  validateNickname,
  type AccountService,
  type AccountUser,
  type JoinParams,
  type NormalizedSwipe,
} from '@captain/game-protocol';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  AccountScreen,
  CountdownScreen,
  MessageScreen,
  NicknameScreen,
  PlayScreen,
  ReadyScreen,
  ResultsScreen,
  type SignInMethod,
} from '../features/Screens';
import { useWakeLock } from '../features/useWakeLock';
import { createAccount } from '../services/createAccount';
import { createTransport } from '../services/createTransport';
import {
  ERROR_MESSAGES,
  INITIAL_CONTROLLER_STATE,
  canShoot,
  controllerReducer,
  selectScreen,
} from './controllerState';

const config = DEFAULT_GAME_CONFIG;

const NICKNAME_STORAGE_KEY = 'captain-shootout:nickname';

function storedNickname(): string {
  try {
    return localStorage.getItem(NICKNAME_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

function rememberNickname(nickname: string) {
  try {
    localStorage.setItem(NICKNAME_STORAGE_KEY, nickname);
  } catch {
    // Private mode: the player just types it again next time.
  }
}

/** Last nickname used on this phone, else the account's first name if it is valid. */
function suggestedNickname(user: AccountUser | null): string {
  const stored = storedNickname();
  if (stored) return stored;
  const first = user?.displayName?.trim().split(/\s+/)[0] ?? '';
  const checked = validateNickname(first.slice(0, config.nickname.maxLength), config.nickname);
  return checked.ok ? checked.nickname : '';
}

function signIn(account: AccountService, method: SignInMethod): Promise<void> {
  switch (method.kind) {
    case 'google':
      return account.signInWithGoogle();
    case 'apple':
      return account.signInWithApple();
    case 'email':
      return method.mode === 'signup'
        ? account.signUpWithEmail(method.email, method.password)
        : account.signInWithEmail(method.email, method.password);
  }
}

/** Current CAPTAIN user: undefined while Firebase restores the session. */
function useAccountUser(account: AccountService | null): AccountUser | null | undefined {
  const [user, setUser] = useState<AccountUser | null | undefined>(account ? undefined : null);
  useEffect(() => account?.onUser(setUser), [account]);
  return user;
}

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
  const account = useMemo(createAccount, []);
  const user = useAccountUser(account);
  const [guest, setGuest] = useState(false);
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
    // After a reload (or screen lock), rejoin the session this device already owns.
    void transport
      .resume(params)
      .then((nickname) => dispatch(nickname ? { type: 'JOINED' } : { type: 'RESUME_FAILED' }))
      .catch(() => dispatch({ type: 'RESUME_FAILED' }));
    return () => {
      unsubscribe();
      void transport.leave();
    };
  }, [transport, params]);

  const join = useCallback(
    async (raw: string) => {
      const checked = validateNickname(raw, config.nickname);
      if (!checked.ok) {
        dispatch({ type: 'JOIN_FAILED', error: checked.error });
        return;
      }
      dispatch({ type: 'JOIN_REQUESTED' });
      try {
        // Guests send no token: the desktop lets them play but never ranks them.
        const token = !guest && account ? await account.idToken() : null;
        rememberNickname(checked.nickname);
        const result = await transport.join(params, checked.nickname, token);
        dispatch(result.ok ? { type: 'JOINED' } : { type: 'JOIN_FAILED', error: result.error });
      } catch {
        dispatch({ type: 'JOIN_FAILED', error: 'network' });
      }
    },
    [params, transport, account, guest],
  );

  const onSignIn = useCallback(
    async (method: SignInMethod): Promise<string | null> => {
      if (!account) return 'Sign-in is not available right now. Play as a guest.';
      try {
        await signIn(account, method);
        setGuest(false);
        return null;
      } catch (error) {
        return accountErrorMessage(error);
      }
    },
    [account],
  );

  const switchAccount = useCallback(() => {
    if (guest) setGuest(false);
    else void account?.signOut();
  }, [account, guest]);

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

  function renderNickname(player: AccountUser | null, onSwitch: (() => void) | null) {
    return (
      <NicknameScreen
        // Remount per account so the suggested nickname follows a sign-in.
        key={player?.uid ?? 'guest'}
        maxLength={config.nickname.maxLength}
        busy={state.step === 'joining'}
        error={state.error ? ERROR_MESSAGES[state.error] : null}
        initialValue={suggestedNickname(player)}
        account={{
          label: player ? (player.email ?? player.displayName ?? 'CAPTAIN') : null,
          onSwitch: onSwitch ?? undefined,
        }}
        onSubmit={join}
      />
    );
  }

  function renderScreen() {
    switch (screen) {
      case 'nickname':
        if (user === undefined)
          return <MessageScreen title="CONNECTING…" body="Hang on a second." />;
        if (!user && !guest) {
          return account ? (
            <AccountScreen onSignIn={onSignIn} onGuest={() => setGuest(true)} />
          ) : (
            // Accounts not configured: everyone is a guest.
            renderNickname(null, null)
          );
        }
        return renderNickname(user, account ? switchAccount : null);
      case 'waiting':
        return state.step === 'resuming' ? (
          <MessageScreen title="CONNECTING…" body="Hang on a second." />
        ) : (
          <MessageScreen title="GET READY" body="Waiting for the game to start…" />
        );
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
      case 'results': {
        const shown = state.finalView ?? view;
        return shown && <ResultsScreen view={shown} sessionClosed={view?.status === 'closed'} />;
      }
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
