import {
  DNA_LABELS,
  DNA_ORDER,
  geneToUnlock,
  roundVerdict,
  type PlayerDna,
  type ControllerView,
  type GameConfig,
  type NormalizedSwipe,
} from '@captain/game-protocol';
import { useEffect, useState, type FormEvent } from 'react';
import { useSwipe, type SwipeTrail } from '../gestures/useSwipe';

/** Same top bar on every screen: the CAPTAIN logo, plus the player's name once known. */
export function ScreenHeader({ nickname }: { nickname?: string }) {
  return (
    <header className="screen-head">
      <img className="screen-logo" src="/brand/captain-wordmark.png" alt="CAPTAIN" />
      {nickname && <span className="screen-player">{nickname}</span>}
    </header>
  );
}

export function MessageScreen({ title, body }: { title: string; body: string }) {
  return (
    <main className="screen">
      <ScreenHeader />
      <section className="screen-hero">
        <span className="kicker">CAPTAIN SHOOTOUT</span>
        <h1 className="title">{title}</h1>
        <p className="body">{body}</p>
      </section>
      <p className="screen-footer">45 seconds · swipe to shoot</p>
    </main>
  );
}

export function NicknameScreen({
  maxLength,
  busy,
  error,
  onSubmit,
}: {
  maxLength: number;
  busy: boolean;
  error: string | null;
  onSubmit: (nickname: string) => void;
}) {
  const [value, setValue] = useState('');
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!busy) onSubmit(value);
  }
  return (
    <main className="screen">
      <ScreenHeader />
      <section className="screen-hero">
        <span className="kicker">CAPTAIN SHOOTOUT</span>
        <h1 className="title">PICK YOUR NAME</h1>
      </section>
      <form className="card stack" onSubmit={submit}>
        <label className="label" htmlFor="nickname">
          YOUR NICKNAME
        </label>
        <input
          id="nickname"
          className="input"
          value={value}
          onChange={(e) => setValue(e.target.value.toUpperCase())}
          maxLength={maxLength}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck={false}
          enterKeyHint="go"
          placeholder="e.g. MVP23"
          aria-invalid={error !== null}
          aria-describedby={error ? 'nickname-error' : undefined}
        />
        <p id="nickname-error" className="error" role="alert">
          {error ?? ' '}
        </p>
        <button className="button" type="submit" disabled={busy || value.trim().length === 0}>
          {busy ? 'JOINING…' : 'JOIN GAME'}
        </button>
      </form>
      <p className="screen-footer">Your nickname appears on the public leaderboard.</p>
    </main>
  );
}

export function ReadyScreen({ nickname, onReady }: { nickname: string; onReady: () => void }) {
  return (
    <main className="screen">
      <ScreenHeader nickname={nickname} />
      <section className="screen-hero">
        <span className="kicker">WELCOME</span>
        <h1 className="name">{nickname}</h1>
      </section>
      <HowToPlay />
      <button className="button big" onClick={onReady}>
        READY
      </button>
    </main>
  );
}

function HowToPlay() {
  return (
    <section className="card" aria-label="How to play">
      <h2 className="card-title">HOW TO PLAY</h2>
      <ol className="howto">
        <li>
          <span>Look at the big screen.</span>
        </li>
        <li>
          <span>
            <strong>Swipe up</strong> to shoot. Not too short, not too long: find the sweet spot.
          </span>
        </li>
        <li>
          <span>Swipe a little left or right to aim.</span>
        </li>
        <li>
          <span>
            <strong>45 seconds.</strong> 5 in a row: x1.5. 10 in a row: x2.
          </span>
        </li>
      </ol>
    </section>
  );
}

export function CountdownScreen({ seconds }: { seconds: number }) {
  return (
    <main className="screen">
      <ScreenHeader />
      <section className="screen-hero">
        <span className="kicker">LOOK AT THE BIG SCREEN</span>
        <div key={seconds} className="countdown">
          {seconds > 0 ? seconds : 'GO!'}
        </div>
      </section>
      <p className="screen-footer">Get your thumb ready</p>
    </main>
  );
}

const SHOT_TEXT = { perfect: 'PERFECT!', scored: 'SCORE!', missed: 'MISS' } as const;

export function PlayScreen({
  view,
  gesture,
  enabled,
  shotSeq,
  onShot,
}: {
  view: ControllerView;
  gesture: GameConfig['gesture'];
  enabled: boolean;
  /** Increments on every accepted shot (re-triggers the flying-ball animation). */
  shotSeq: number;
  onShot: (shot: NormalizedSwipe) => void;
}) {
  const { trail, handlers } = useSwipe(enabled, gesture, onShot);
  const finished = view.status === 'finished';
  return (
    <main className="screen play">
      <header className="play-hud">
        <div>
          <span>TIME</span>
          <strong className={view.secondsLeft <= 5 ? 'urgent' : undefined}>
            {view.secondsLeft}
          </strong>
        </div>
        <div className="right">
          <span>SCORE</span>
          <strong>{view.score}</strong>
          {view.onFire && <span className="fire">🔥 x{view.multiplier ?? 2}</span>}
        </div>
      </header>

      <div className={`swipe-area ${enabled ? '' : 'disabled'}`} {...handlers}>
        {view.lastShot && (
          <div key={view.lastShot.shotId} className={`shot-result ${view.lastShot.outcome}`}>
            {SHOT_TEXT[view.lastShot.outcome]}
            {view.lastShot.points > 0 && <small>+{view.lastShot.points}</small>}
          </div>
        )}
        {trail ? (
          <TrailArrow trail={trail} />
        ) : (
          <p className="swipe-hint">{finished ? 'TIME!' : 'SWIPE UP TO SHOOT'}</p>
        )}
        {shotSeq > 0 && <div key={shotSeq} className="ball-fly" aria-hidden />}
        <div className="ball-rest" aria-hidden />
      </div>
    </main>
  );
}

function TrailArrow({ trail }: { trail: SwipeTrail }) {
  const { start, current, preview } = trail;
  const power = preview?.power ?? 0;
  // Blue for normal power, orange when the swipe is very long (likely too strong).
  const color = !preview ? 'var(--secondary)' : power > 0.7 ? 'var(--hot)' : 'var(--blue)';
  return (
    <svg className="trail" aria-hidden>
      <defs>
        <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 z" fill={color} />
        </marker>
      </defs>
      <circle cx={start.x} cy={start.y} r="14" fill="none" stroke={color} strokeWidth="3" />
      <line
        x1={start.x}
        y1={start.y}
        x2={current.x}
        y2={current.y}
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        markerEnd="url(#arrow)"
      />
    </svg>
  );
}

export function ResultsScreen({
  view,
  sessionClosed,
}: {
  view: ControllerView;
  /** The desktop already moved on: the result stays here, the round is over. */
  sessionClosed: boolean;
}) {
  const r = view.results;
  const score = r?.score ?? view.score;
  const verdict = roundVerdict(r ?? { score, baskets: 0, shots: 0, accuracy: 0, rank: null });
  const shown = useCountUp(score);
  return (
    <main className={`screen results tier-${verdict.tier}`}>
      <ScreenHeader nickname={view.nickname} />

      <section className="results-hero" aria-label={`${score} points`}>
        <span className="kicker tier">{verdict.title}</span>
        <div className="final" aria-hidden>
          {shown}
        </div>
        <span className="results-points">POINTS</span>
        {r?.rank != null && <RankPill rank={r.rank} players={r.players ?? null} />}
      </section>

      {r && (
        <div className="stats">
          <div>
            <strong>{r.baskets}</strong>
            <span>BASKETS</span>
          </div>
          <div>
            <strong>{r.shots}</strong>
            <span>SHOTS</span>
          </div>
          <div>
            <strong>{Math.round(r.accuracy * 100)}%</strong>
            <span>ACCURACY</span>
          </div>
        </div>
      )}

      {r?.dna && <DnaCard dna={r.dna} />}

      <p className="screen-footer">
        {sessionClosed
          ? 'Want a rematch? Scan the new QR code on the big screen.'
          : '📸 Screenshot this to keep your score!'}
      </p>
    </main>
  );
}

/** Below this many players a percentage says nothing ("top 50%" of 4 people). */
const MIN_PLAYERS_FOR_PERCENT = 10;

function RankPill({ rank, players }: { rank: number; players: number | null }) {
  const percent =
    players !== null && players >= MIN_PLAYERS_FOR_PERCENT
      ? Math.max(1, Math.ceil((rank / players) * 100))
      : null;
  return (
    <p className="rank">
      #{rank} ON THE BOARD{percent !== null && ` · TOP ${percent}%`}
    </p>
  );
}

/** Five traits from this round's shots, with the weakest one called out. */
function DnaCard({ dna }: { dna: PlayerDna }) {
  const gene = geneToUnlock(dna);
  return (
    <section className="dna-card" aria-label="Your player DNA">
      <header className="dna-head">
        <h2>YOUR PLAYER DNA</h2>
        <span>SAMPLE: 1 ROUND</span>
      </header>
      <Helix />
      <ul className="dna-bars">
        {DNA_ORDER.map((trait) => (
          <li key={trait} className={trait === gene.trait ? 'weak' : undefined}>
            <abbr title={DNA_LABELS[trait].name}>{DNA_LABELS[trait].short}</abbr>
            <span className="dna-track" aria-hidden>
              <span className="dna-fill" style={{ width: `${dna[trait]}%` }} />
            </span>
            <strong>{dna[trait]}</strong>
          </li>
        ))}
      </ul>
      <p className="dna-gene">
        <b>Gene to unlock: {gene.name}.</b> {gene.text} The AI Coach builds drills around exactly
        that.
      </p>
    </section>
  );
}

/** Decorative double helix: two dashed strands that drift, with rungs and dots. */
function Helix() {
  const points = Array.from({ length: 22 }, (_, i) => {
    const x = (i / 21) * 300;
    const offset = 30 * Math.sin((x / 200) * 2 * Math.PI);
    return { x, top: 45 + offset, bottom: 45 - offset };
  });
  const strand = (key: 'top' | 'bottom') =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p[key].toFixed(1)}`).join(' ');
  return (
    <svg className="dna-helix" viewBox="0 0 300 90" aria-hidden>
      {points.map((p) => (
        <line key={p.x} x1={p.x} x2={p.x} y1={p.top} y2={p.bottom} className="rung" />
      ))}
      <path d={strand('top')} className="strand glow" />
      <path d={strand('bottom')} className="strand" />
      {points.map((p) => (
        <circle key={p.x} cx={p.x} cy={p.top} r="2.5" />
      ))}
    </svg>
  );
}

/** Counts from 0 up to `target` once, for the score reveal. */
function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      const id = requestAnimationFrame(() => setValue(target));
      return () => cancelAnimationFrame(id);
    }
    const start = performance.now();
    let id = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setValue(Math.round(target * (1 - (1 - t) ** 3)));
      if (t < 1) id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [target, durationMs]);
  return value;
}
