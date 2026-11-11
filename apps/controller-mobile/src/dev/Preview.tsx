/**
 * Dev-only gallery of every phone screen with fake data, so the design can be
 * reviewed without playing a round. Open the controller dev server with `?preview`
 * (all screens side by side) or `?preview=<id>` (one screen, full size).
 * Never part of the production bundle: main.tsx only imports it in dev.
 */
import {
  DEFAULT_GAME_CONFIG,
  type ControllerView,
  type RoundSummary,
} from '@captain/game-protocol';
import type { ReactNode } from 'react';
import { ERROR_MESSAGES } from '../app/controllerState';
import {
  CountdownScreen,
  MessageScreen,
  NicknameScreen,
  PlayScreen,
  ReadyScreen,
  ResultsScreen,
} from '../features/Screens';
import './preview.css';

const config = DEFAULT_GAME_CONFIG;
const noop = () => {};

function view(overrides: Partial<ControllerView>): ControllerView {
  return {
    status: 'playing',
    nickname: 'BRUNO',
    secondsLeft: 32,
    score: 14,
    onFire: false,
    multiplier: 1,
    lastShot: null,
    results: null,
    ...overrides,
  };
}

function results(summary: Partial<RoundSummary>, closed = false): ReactNode {
  const r: RoundSummary = { score: 0, baskets: 0, shots: 0, accuracy: 0, rank: 12, ...summary };
  return (
    <ResultsScreen
      view={view({ status: 'results', score: r.score, results: r })}
      sessionClosed={closed}
    />
  );
}

interface Preview {
  id: string;
  group: string;
  label: string;
  render: () => ReactNode;
}

export const PREVIEWS: Preview[] = [
  {
    id: 'no-link',
    group: 'Join',
    label: 'Opened without a QR link',
    render: () => (
      <MessageScreen
        title="SCAN TO PLAY"
        body="Scan the QR code on the big screen to join the game."
      />
    ),
  },
  {
    id: 'connecting',
    group: 'Join',
    label: 'Connecting',
    render: () => <MessageScreen title="CONNECTING…" body="Hang on a second." />,
  },
  {
    id: 'nickname',
    group: 'Join',
    label: 'Nickname',
    render: () => (
      <NicknameScreen
        maxLength={config.nickname.maxLength}
        busy={false}
        error={null}
        onSubmit={noop}
      />
    ),
  },
  {
    id: 'nickname-error',
    group: 'Join',
    label: 'Nickname taken',
    render: () => (
      <NicknameScreen
        maxLength={config.nickname.maxLength}
        busy={false}
        error={ERROR_MESSAGES.nickname_taken}
        onSubmit={noop}
      />
    ),
  },
  {
    id: 'ready',
    group: 'Before the round',
    label: 'Welcome / how to play',
    render: () => <ReadyScreen nickname="BRUNO" onReady={noop} />,
  },
  {
    id: 'waiting',
    group: 'Before the round',
    label: 'Waiting for the game',
    render: () => <MessageScreen title="GET READY" body="Waiting for the game to start…" />,
  },
  {
    id: 'countdown',
    group: 'Before the round',
    label: 'Countdown',
    render: () => <CountdownScreen seconds={2} />,
  },
  {
    id: 'play',
    group: 'Round',
    label: 'Playing',
    render: () => (
      <PlayScreen view={view({})} gesture={config.gesture} enabled shotSeq={0} onShot={noop} />
    ),
  },
  {
    id: 'play-score',
    group: 'Round',
    label: 'Basket (+3)',
    render: () => (
      <PlayScreen
        view={view({
          lastShot: { shotId: 'p1', outcome: 'perfect', points: 3, scoreAfterShot: 17 },
        })}
        gesture={config.gesture}
        enabled
        shotSeq={0}
        onShot={noop}
      />
    ),
  },
  {
    id: 'play-fire',
    group: 'Round',
    label: 'On fire x1.5',
    render: () => (
      <PlayScreen
        view={view({ score: 22, onFire: true, multiplier: 1.5 })}
        gesture={config.gesture}
        enabled
        shotSeq={0}
        onShot={noop}
      />
    ),
  },
  {
    id: 'play-fire2',
    group: 'Round',
    label: 'On fire x2, last seconds',
    render: () => (
      <PlayScreen
        view={view({ score: 48, secondsLeft: 4, onFire: true, multiplier: 2 })}
        gesture={config.gesture}
        enabled
        shotSeq={0}
        onShot={noop}
      />
    ),
  },
  {
    id: 'play-time',
    group: 'Round',
    label: 'Buzzer (TIME!)',
    render: () => (
      <PlayScreen
        view={view({ status: 'finished', secondsLeft: 0, score: 26 })}
        gesture={config.gesture}
        enabled={false}
        shotSeq={0}
        onShot={noop}
      />
    ),
  },
  {
    id: 'results-airball',
    group: 'Results',
    label: 'Air Ball Club (0)',
    render: () => results({ score: 0, baskets: 0, shots: 9, accuracy: 0, rank: 41 }),
  },
  {
    id: 'results-rookie',
    group: 'Results',
    label: 'Rookie (6)',
    render: () => results({ score: 6, baskets: 3, shots: 11, accuracy: 0.27, rank: 28 }),
  },
  {
    id: 'results-starter',
    group: 'Results',
    label: 'Starter (18)',
    render: () => results({ score: 18, baskets: 8, shots: 15, accuracy: 0.53, rank: 9 }),
  },
  {
    id: 'results-allstar',
    group: 'Results',
    label: 'All-Star (33)',
    render: () => results({ score: 33, baskets: 12, shots: 18, accuracy: 0.67, rank: 4 }),
  },
  {
    id: 'results-mvp',
    group: 'Results',
    label: 'MVP (58)',
    render: () => results({ score: 58, baskets: 19, shots: 24, accuracy: 0.79, rank: 2 }),
  },
  {
    id: 'results-first',
    group: 'Results',
    label: '#1 on the board',
    render: () => results({ score: 64, baskets: 20, shots: 23, accuracy: 0.87, rank: 1 }),
  },
  {
    id: 'results-sniper',
    group: 'Results',
    label: 'Sniper (80%+)',
    render: () => results({ score: 21, baskets: 9, shots: 10, accuracy: 0.9, rank: 7 }),
  },
  {
    id: 'results-spam',
    group: 'Results',
    label: 'Spammer (25+ shots, <25%)',
    render: () => results({ score: 10, baskets: 5, shots: 31, accuracy: 0.16, rank: 22 }),
  },
  {
    id: 'results-norank',
    group: 'Results',
    label: 'Rank not saved',
    render: () => results({ score: 14, baskets: 6, shots: 12, accuracy: 0.5, rank: null }),
  },
  {
    id: 'results-closed',
    group: 'Results',
    label: 'After the session closed',
    render: () => results({ score: 18, baskets: 8, shots: 15, accuracy: 0.53, rank: 9 }, true),
  },
  {
    id: 'ended',
    group: 'Results',
    label: 'Ended without results',
    render: () => (
      <MessageScreen
        title="THANKS FOR PLAYING"
        body="Want another go? Scan the new QR code on the big screen."
      />
    ),
  },
];

export function Preview({ id }: { id: string }) {
  const one = PREVIEWS.find((p) => p.id === id);
  if (one) return <>{one.render()}</>;
  return <Gallery />;
}

function Gallery() {
  const groups = [...new Set(PREVIEWS.map((p) => p.group))];
  return (
    <div className="preview-gallery">
      <h1>Phone screens</h1>
      <p>Every controller screen with fake data. Click a screen to open it full size.</p>
      {groups.map((group) => (
        <section key={group}>
          <h2>{group}</h2>
          <div className="preview-row">
            {PREVIEWS.filter((p) => p.group === group).map((p) => (
              <a key={p.id} className="preview-card" href={`?preview=${p.id}`}>
                <iframe title={p.label} src={`?preview=${p.id}`} tabIndex={-1} loading="lazy" />
                <span>{p.label}</span>
              </a>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
