import {
  DEFAULT_GAME_CONFIG,
  basketPoints,
  streakMultiplier,
  type ConnectionState,
  type ControllerTransport,
  type ControllerView,
  type ShotCommand,
} from '@captain/game-protocol';

/**
 * Local stand-in for the desktop so the phone UI can be developed and tested without a
 * network. It loosely simulates the desktop timeline and invents shot outcomes.
 * NOT authoritative and never used in production.
 */
export function createMockTransport(config = DEFAULT_GAME_CONFIG): ControllerTransport {
  let onView: ((v: ControllerView) => void) | null = null;
  let onConnection: ((c: ConnectionState) => void) | null = null;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let view: ControllerView = {
    status: 'connected',
    nickname: '',
    secondsLeft: 0,
    score: 0,
    onFire: false,
    lastShot: null,
    results: null,
  };
  let streak = 0;
  let shots = 0;
  let baskets = 0;

  function publish(patch: Partial<ControllerView>) {
    view = { ...view, ...patch };
    onView?.(view);
  }

  function later(ms: number, fn: () => void) {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
  }

  function countDown(seconds: number, status: ControllerView['status'], done: () => void) {
    publish({ status, secondsLeft: seconds });
    for (let s = seconds - 1; s >= 0; s--) {
      later((seconds - s) * 1000, () => publish({ secondsLeft: s }));
    }
    later(seconds * 1000, done);
  }

  return {
    async join(_params, nickname) {
      await new Promise((r) => setTimeout(r, 400));
      later(0, () => publish({ status: 'connected', nickname }));
      return { ok: true };
    },

    async setReady() {
      countDown(config.countdownMs / 1000, 'countdown', () =>
        countDown(config.roundDurationMs / 1000, 'playing', () => {
          publish({ status: 'finished' });
          later(1500, () => {
            publish({
              status: 'results',
              results: {
                score: view.score,
                baskets,
                shots,
                accuracy: shots ? baskets / shots : 0,
                rank: 3,
                players: 120,
                dna: {
                  accuracy: shots ? Math.round((baskets / shots) * 100) : 0,
                  volume: 55,
                  rhythm: 64,
                  clutch: 38,
                  stamina: 72,
                },
              },
            });
            later(config.resultsDurationMs, () => publish({ status: 'closed' }));
          });
        }),
      );
    },

    async sendShot(command: ShotCommand) {
      shots += 1;
      // Pretend the sweet spot scores; the real outcome comes from the desktop physics.
      const goodPower = Math.abs(command.power - 0.5) <= 0.12;
      const goodAim = Math.abs(command.directionX) <= 0.15;
      const outcome =
        goodPower && goodAim ? (Math.random() < 0.5 ? 'perfect' : 'scored') : 'missed';
      later(1100, () => {
        streak = outcome === 'missed' ? 0 : streak + 1;
        const points = basketPoints(outcome, streak, config.scoring);
        const next = streakMultiplier(streak + 1, config.scoring.streakTiers);
        if (outcome !== 'missed') baskets += 1;
        publish({
          score: view.score + points,
          onFire: next > 1,
          multiplier: next,
          lastShot: {
            shotId: command.shotId,
            outcome,
            points,
            scoreAfterShot: view.score + points,
          },
        });
      });
    },

    subscribe(handlers) {
      onView = handlers.onView;
      onConnection = handlers.onConnection;
      onConnection('online');
      return () => {
        onView = null;
        onConnection = null;
      };
    },

    async resume() {
      return null;
    },

    async leave() {
      for (const id of timers) clearTimeout(id);
      timers.clear();
    },
  };
}
