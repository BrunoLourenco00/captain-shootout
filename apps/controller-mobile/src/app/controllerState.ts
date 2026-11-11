import type {
  ConnectionState,
  ControllerView,
  GameConfig,
  JoinError,
  NicknameError,
} from '@captain/game-protocol';

export type ControllerError = JoinError | NicknameError;

export interface ControllerState {
  /** 'resuming' = checking whether this device already joined (page reload). */
  step: 'resuming' | 'nickname' | 'joining' | 'joined';
  error: ControllerError | null;
  view: ControllerView | null;
  connection: ConnectionState;
  readySent: boolean;
  lastShotAt: number | null;
  /**
   * The last view that carried round results. Kept after the desktop closes the
   * session so the player can still read their result and open the Coach Cap link.
   */
  finalView: ControllerView | null;
}

export type ControllerAction =
  | { type: 'RESUME_FAILED' }
  | { type: 'JOIN_REQUESTED' }
  | { type: 'JOIN_FAILED'; error: ControllerError }
  | { type: 'JOINED' }
  | { type: 'VIEW'; view: ControllerView }
  | { type: 'CONNECTION'; state: ConnectionState }
  | { type: 'READY_SENT' }
  | { type: 'SHOT_SENT'; now: number };

export const INITIAL_CONTROLLER_STATE: ControllerState = {
  step: 'resuming',
  error: null,
  view: null,
  connection: 'online',
  readySent: false,
  lastShotAt: null,
  finalView: null,
};

export function controllerReducer(
  state: ControllerState,
  action: ControllerAction,
): ControllerState {
  switch (action.type) {
    case 'RESUME_FAILED':
      return state.step === 'resuming' ? { ...state, step: 'nickname' } : state;
    case 'JOIN_REQUESTED':
      return { ...state, step: 'joining', error: null };
    case 'JOIN_FAILED':
      return { ...state, step: 'nickname', error: action.error };
    case 'JOINED':
      return { ...state, step: 'joined', error: null };
    case 'VIEW':
      return {
        ...state,
        view: action.view,
        finalView:
          action.view.status === 'results' && action.view.results ? action.view : state.finalView,
      };
    case 'CONNECTION':
      return { ...state, connection: action.state };
    case 'READY_SENT':
      return { ...state, readySent: true };
    case 'SHOT_SENT':
      return { ...state, lastShotAt: action.now };
  }
}

export type ControllerScreen =
  'nickname' | 'waiting' | 'ready' | 'countdown' | 'playing' | 'results' | 'ended';

export function selectScreen(state: ControllerState): ControllerScreen {
  if (state.step === 'resuming') return 'waiting';
  if (state.step !== 'joined') return 'nickname';
  const view = state.view;
  if (!view) return 'waiting';
  switch (view.status) {
    case 'connected':
      return state.readySent ? 'waiting' : 'ready';
    case 'countdown':
      return 'countdown';
    case 'playing':
    case 'finished':
      return 'playing';
    case 'results':
      return 'results';
    case 'closed':
      return state.finalView ? 'results' : 'ended';
  }
}

/**
 * Local pre-check so the phone doesn't send shots the desktop would reject anyway.
 * The desktop still validates everything.
 */
export function canShoot(state: ControllerState, now: number, config: GameConfig): boolean {
  if (state.view?.status !== 'playing') return false;
  return state.lastShotAt === null || now - state.lastShotAt >= config.minShotIntervalMs;
}

export const ERROR_MESSAGES: Record<ControllerError, string> = {
  too_short: 'Nickname is too short.',
  too_long: 'Nickname is too long.',
  invalid_characters: 'Use letters, numbers, spaces, . _ or -',
  blocked: 'Please choose another nickname.',
  nickname_taken: 'That nickname is taken. Try another one.',
  invalid_session: 'This QR code is not valid. Scan the code on the screen again.',
  session_busy: 'Someone is already playing. Wait for the next round.',
  session_expired: 'This QR code has expired. Scan the new code on the screen.',
  network: 'Connection problem. Check your Wi-Fi and try again.',
};
