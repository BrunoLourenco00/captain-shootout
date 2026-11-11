import { DEFAULT_GAME_CONFIG, type ControllerView } from '@captain/game-protocol';
import { describe, expect, it } from 'vitest';
import {
  INITIAL_CONTROLLER_STATE,
  canShoot,
  controllerReducer,
  selectScreen,
  type ControllerAction,
  type ControllerState,
} from './controllerState';

const view = (status: ControllerView['status']): ControllerView => ({
  status,
  nickname: 'BRUNO',
  secondsLeft: 10,
  score: 0,
  onFire: false,
  lastShot: null,
  results: null,
});

function run(...actions: ControllerAction[]): ControllerState {
  return actions.reduce(controllerReducer, INITIAL_CONTROLLER_STATE);
}

describe('controller screens', () => {
  it('checks for a previous join first, then asks for a nickname', () => {
    expect(selectScreen(run())).toBe('waiting');
    expect(selectScreen(run({ type: 'RESUME_FAILED' }))).toBe('nickname');
    expect(selectScreen(run({ type: 'RESUME_FAILED' }, { type: 'JOIN_REQUESTED' }))).toBe(
      'nickname',
    );
  });

  it('a resumed device goes straight to the game', () => {
    const s = run({ type: 'JOINED' }, { type: 'VIEW', view: view('playing') });
    expect(selectScreen(s)).toBe('playing');
    // A late RESUME_FAILED cannot kick a joined player back to the form.
    expect(selectScreen(controllerReducer(s, { type: 'RESUME_FAILED' }))).toBe('playing');
  });

  it('returns to the nickname screen with an error when joining fails', () => {
    const s = run({ type: 'JOIN_REQUESTED' }, { type: 'JOIN_FAILED', error: 'nickname_taken' });
    expect(selectScreen(s)).toBe('nickname');
    expect(s.error).toBe('nickname_taken');
  });

  it('follows the desktop view after joining', () => {
    const joined = run({ type: 'JOINED' });
    expect(selectScreen(joined)).toBe('waiting');
    const connected = controllerReducer(joined, { type: 'VIEW', view: view('connected') });
    expect(selectScreen(connected)).toBe('ready');
    expect(selectScreen(controllerReducer(connected, { type: 'READY_SENT' }))).toBe('waiting');
    const at = (status: ControllerView['status']) =>
      selectScreen(controllerReducer(joined, { type: 'VIEW', view: view(status) }));
    expect(at('countdown')).toBe('countdown');
    expect(at('playing')).toBe('playing');
    expect(at('finished')).toBe('playing');
    expect(at('results')).toBe('results');
    expect(at('closed')).toBe('ended');
  });

  it('keeps showing the results after the desktop closes the session', () => {
    const results = {
      ...view('results'),
      results: { score: 12, baskets: 6, shots: 9, accuracy: 0.67, rank: 2 },
    };
    const s = run(
      { type: 'JOINED' },
      { type: 'VIEW', view: results },
      { type: 'VIEW', view: view('closed') },
    );
    expect(selectScreen(s)).toBe('results');
    expect(s.finalView?.results?.score).toBe(12);
  });
});

describe('canShoot', () => {
  const config = DEFAULT_GAME_CONFIG;
  const playing = run({ type: 'JOINED' }, { type: 'VIEW', view: view('playing') });

  it('only while the desktop says PLAYING', () => {
    expect(canShoot(playing, 1000, config)).toBe(true);
    const finished = controllerReducer(playing, { type: 'VIEW', view: view('finished') });
    expect(canShoot(finished, 1000, config)).toBe(false);
  });

  it('respects the minimum interval between shots', () => {
    const shot = controllerReducer(playing, { type: 'SHOT_SENT', now: 1000 });
    expect(canShoot(shot, 1000 + config.minShotIntervalMs - 1, config)).toBe(false);
    expect(canShoot(shot, 1000 + config.minShotIntervalMs, config)).toBe(true);
  });
});
