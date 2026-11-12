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

export type SignInMethod =
  | { kind: 'google' }
  | { kind: 'apple' }
  | { kind: 'email'; mode: 'signin' | 'signup'; email: string; password: string };

const TERMS_URL = 'https://trycaptain.app/terms';
const PRIVACY_URL = 'https://trycaptain.app/privacy';
/** The CAPTAIN site, tagged so visits from the game show up in the site's analytics. */
const SITE_URL =
  'https://trycaptain.app/?utm_source=shootout&utm_medium=booth&utm_campaign=results';

/** Google "G", as on trycaptain.app and in the CAPTAIN app's sign-in screens. */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="provider-icon" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.5 10.5 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

/** Apple mark (Font Awesome brand icon, CC BY 4.0), in the text colour. */
function AppleIcon() {
  return (
    <svg viewBox="0 0 384 512" className="provider-icon" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"
      />
    </svg>
  );
}

/**
 * Sign in or create a CAPTAIN account (the same account as the CAPTAIN app) to make the
 * leaderboard, or play as a guest. Same order as the trycaptain.app sign-up page: email
 * first, then Google and Apple. `onSignIn` resolves with an error message, or null on
 * success / when the player just closed the popup.
 */
export function AccountScreen({
  onSignIn,
  onGuest,
}: {
  onSignIn: (method: SignInMethod) => Promise<string | null>;
  onGuest: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function run(method: SignInMethod) {
    if (busy) return;
    if (!agreed) {
      setError('Accept the Terms and Privacy Policy to continue.');
      return;
    }
    setBusy(true);
    setError(null);
    const message = await onSignIn(method);
    setBusy(false);
    setError(message);
  }

  function submitEmail(e: FormEvent) {
    e.preventDefault();
    if (email.trim() === '' || password === '') {
      setError('Enter your email and password.');
      return;
    }
    void run({ kind: 'email', mode, email: email.trim(), password });
  }

  return (
    <main className="screen">
      <ScreenHeader />
      <div className="screen-center">
        <section className="screen-hero">
          <span className="kicker">CAPTAIN SHOOTOUT</span>
          <h1 className="title">MAKE THE BOARD</h1>
          <p className="body">Use your CAPTAIN app account, or create one in seconds.</p>
        </section>

        <section className="card stack" aria-label="CAPTAIN account">
          <form className="stack" onSubmit={submitEmail} noValidate>
            <label className="sr-only" htmlFor="account-email">
              Email address
            </label>
            <input
              id="account-email"
              className="input plain"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@email.com"
              disabled={busy}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <label className="sr-only" htmlFor="account-password">
              Password
            </label>
            <input
              id="account-password"
              className="input plain"
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              placeholder={mode === 'signup' ? 'Password (8+ characters)' : 'Password'}
              disabled={busy}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button className="button" type="submit" disabled={busy}>
              {busy ? 'ONE SECOND…' : mode === 'signup' ? 'CREATE ACCOUNT' : 'SIGN IN'}
            </button>
          </form>

          <div className="divider" aria-hidden="true">
            <span>or continue with</span>
          </div>

          <button
            type="button"
            className="provider-button"
            disabled={busy}
            onClick={() => void run({ kind: 'google' })}
          >
            <GoogleIcon />
            Continue with Google
          </button>
          <button
            type="button"
            className="provider-button"
            disabled={busy}
            onClick={() => void run({ kind: 'apple' })}
          >
            <AppleIcon />
            Continue with Apple
          </button>

          <label className="terms">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => {
                setAgreed(e.target.checked);
                if (e.target.checked) setError(null);
              }}
            />
            <span>
              I agree to the CAPTAIN{' '}
              <a href={TERMS_URL} target="_blank" rel="noreferrer">
                Terms
              </a>{' '}
              and{' '}
              <a href={PRIVACY_URL} target="_blank" rel="noreferrer">
                Privacy Policy
              </a>
              .
            </span>
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <p className="account-switch">
            {mode === 'signup' ? 'Already have a CAPTAIN account?' : 'New to CAPTAIN?'}{' '}
            <button
              type="button"
              className="link inline"
              disabled={busy}
              onClick={() => {
                setMode(mode === 'signup' ? 'signin' : 'signup');
                setError(null);
              }}
            >
              {mode === 'signup' ? 'Sign in' : 'Create account'}
            </button>
          </p>
        </section>

        <button type="button" className="link guest" disabled={busy} onClick={onGuest}>
          Play as a guest
        </button>
      </div>
      <p className="screen-footer">Guests can play, but don't appear on the leaderboard.</p>
    </main>
  );
}

export function NicknameScreen({
  maxLength,
  busy,
  error,
  initialValue = '',
  account,
  onSubmit,
}: {
  maxLength: number;
  busy: boolean;
  error: string | null;
  initialValue?: string;
  /**
   * Who is playing: `label` is the CAPTAIN account (email), null for a guest.
   * `onSwitch` signs out / goes back to sign-in.
   */
  account?: { label: string | null; onSwitch?: () => void };
  onSubmit: (nickname: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const guest = account?.label === null;
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!busy) onSubmit(value);
  }
  return (
    <main className="screen">
      <ScreenHeader />
      <div className="screen-center">
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
        {account && (
          <p className="account-line">
            {guest ? 'Playing as a guest.' : `Signed in as ${account.label}.`}{' '}
            {account.onSwitch && (
              <button
                type="button"
                className="link inline"
                disabled={busy}
                onClick={account.onSwitch}
              >
                {guest ? 'Sign in to make the leaderboard' : 'Not you?'}
              </button>
            )}
          </p>
        )}
      </div>
      <p className="screen-footer">
        {guest
          ? "Guests play, but don't appear on the leaderboard."
          : 'Your nickname appears on the public leaderboard.'}
      </p>
    </main>
  );
}

export function ReadyScreen({ nickname, onReady }: { nickname: string; onReady: () => void }) {
  return (
    <main className="screen">
      <ScreenHeader nickname={nickname} />
      <div className="screen-center">
        <section className="screen-hero">
          <span className="kicker">WELCOME</span>
          <h1 className="name">{nickname}</h1>
        </section>
        <HowToPlay />
        <button className="button big" onClick={onReady}>
          READY
        </button>
      </div>
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
        {view.ranked === false && <p className="rank guest">GUEST · NOT ON THE BOARD</p>}
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

      <footer className="screen-footer results-footer">
        <span>
          {sessionClosed
            ? 'Want a rematch? Scan the new QR code on the big screen.'
            : '📸 Screenshot this to keep your score!'}
        </span>
        <a className="site-link" href={SITE_URL} target="_blank" rel="noreferrer">
          trycaptain.app ↗
        </a>
      </footer>
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
