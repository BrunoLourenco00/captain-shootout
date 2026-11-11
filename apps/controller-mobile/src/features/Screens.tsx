import type { ControllerView, GameConfig, NormalizedSwipe } from '@captain/game-protocol';
import { useState, type FormEvent } from 'react';
import { useSwipe, type SwipeTrail } from '../gestures/useSwipe';

export function Wordmark() {
  return (
    <div className="wordmark">
      CAPTAIN <span>SHOOTOUT</span>
    </div>
  );
}

export function MessageScreen({ title, body }: { title: string; body: string }) {
  return (
    <main className="screen center">
      <Wordmark />
      <h1 className="title">{title}</h1>
      <p className="body">{body}</p>
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
      <Wordmark />
      <form className="stack" onSubmit={submit}>
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
          {error ?? ' '}
        </p>
        <button className="button" type="submit" disabled={busy || value.trim().length === 0}>
          {busy ? 'JOINING…' : 'JOIN GAME'}
        </button>
      </form>
      <p className="fineprint">Your nickname appears on the public leaderboard.</p>
    </main>
  );
}

export function ReadyScreen({ nickname, onReady }: { nickname: string; onReady: () => void }) {
  return (
    <main className="screen">
      <Wordmark />
      <div className="stack center">
        <p className="label">WELCOME</p>
        <h1 className="name">{nickname}</h1>
        <HowToPlay />
      </div>
      <button className="button big" onClick={onReady}>
        READY
      </button>
    </main>
  );
}

function HowToPlay() {
  return (
    <ol className="howto">
      <li>Look at the big screen.</li>
      <li>
        <strong>Swipe up</strong> to shoot. Not too short, not too long: find the sweet spot.
      </li>
      <li>Swipe a little left or right to aim.</li>
      <li>30 seconds. Score as much as you can!</li>
    </ol>
  );
}

export function CountdownScreen({ seconds }: { seconds: number }) {
  return (
    <main className="screen center">
      <p className="label">LOOK AT THE SCREEN</p>
      <div key={seconds} className="countdown">
        {seconds > 0 ? seconds : 'GO!'}
      </div>
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
          <span className="label">TIME</span>
          <strong className={view.secondsLeft <= 5 ? 'urgent' : undefined}>
            {view.secondsLeft}
          </strong>
        </div>
        <div className="right">
          <span className="label">SCORE</span>
          <strong>{view.score}</strong>
          {view.onFire && <span className="fire">🔥 x2</span>}
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

export function ResultsScreen({ view }: { view: ControllerView }) {
  const r = view.results;
  return (
    <main className="screen center">
      <Wordmark />
      <p className="label">{view.nickname}</p>
      <div className="final">{r?.score ?? view.score}</div>
      <p className="label">POINTS</p>
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
      {r?.rank != null && <p className="rank">#{r.rank} ON THE LEADERBOARD</p>}
      <p className="fineprint">📸 Take a screenshot to keep your score!</p>
    </main>
  );
}
