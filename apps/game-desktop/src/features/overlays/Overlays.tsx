import { coachPitch, type GameConfig, type LeaderboardEntry } from '@captain/game-protocol';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useRef } from 'react';
import { levelIndex } from '../../game/scoring/levels';
import { accuracy, nextMultiplier } from '../../game/scoring/scoring';
import type { GameState, ShotFeedback } from '../../game/state/gameState';
import type { HostSessionState } from '../../services/useHostSession';
import { useNow } from '../useNow';

function secondsLeft(deadline: number | null, now: number): number {
  return deadline === null ? 0 : Math.max(0, Math.ceil((deadline - now) / 1000));
}

function Wordmark() {
  return (
    <div className="wordmark">
      <img className="wordmark-logo" src="/brand/captain-wordmark.png" alt="CAPTAIN" />
    </div>
  );
}

function QrSlot({ host }: { host: HostSessionState }) {
  if (!host.configured) {
    return <span className="qr-pending">DEMO ONLY</span>;
  }
  if (!host.joinUrl) {
    return <span className="qr-pending">{host.online ? 'LOADING…' : 'OFFLINE'}</span>;
  }
  return (
    <QRCodeSVG
      value={host.joinUrl}
      size={512}
      level="M"
      marginSize={2}
      bgColor="#F7F9FB"
      fgColor="#0B1220"
      style={{ width: '100%', height: '100%' }}
      title="Scan to play"
    />
  );
}

/** Podium colours for the first three places (gold, silver, bronze). */
function rowClass(index: number, isMe: boolean): string | undefined {
  const classes = [index < 3 ? `podium-${index + 1}` : '', isMe ? 'me' : ''].filter(Boolean);
  return classes.length > 0 ? classes.join(' ') : undefined;
}

function LeaderboardList({
  entries,
  highlight,
  hidden,
}: {
  entries: LeaderboardEntry[];
  /** playerId of the entry to highlight. */
  highlight?: string;
  /** Visual copy only (the looping board's second pass): hidden from screen readers. */
  hidden?: boolean;
}) {
  if (entries.length === 0) return null;
  return (
    <ol className="leaderboard" aria-hidden={hidden || undefined}>
      {entries.map((e, i) => (
        <li
          key={e.playerId || `${i}-${e.nickname}`}
          className={rowClass(i, Boolean(highlight && e.playerId === highlight))}
        >
          <span className="pos">{i + 1}</span>
          <span className="nick">{e.nickname}</span>
          <span className="pts">{e.score}</span>
        </li>
      ))}
    </ol>
  );
}

/** Rows visible at once on the attract board; the rest scroll past. */
const VISIBLE_ROWS = 5;
/** Slow, continuous auto-scroll speed. */
const SCROLL_PX_PER_SECOND = 14;
/** Rest on the top rows when the attract screen appears. */
const DWELL_MS = 2500;
/** After a manual scroll (wheel / touch), auto-scroll waits this long before resuming. */
const MANUAL_PAUSE_MS = 6000;

/**
 * Operator toggle, deliberately invisible: clicking "TOP SCORES" turns auto-scroll
 * off / on. Module-level so it survives every new attract screen until a page reload.
 */
let autoScrollEnabled = true;

/**
 * Attract-screen leaderboard: a window of VISIBLE_ROWS rows that glides slowly through
 * the whole list as an endless loop: the list is drawn twice, and whenever the first
 * copy has scrolled past, the position wraps back by one copy (invisible, so #1 follows
 * the last place). It can also be scrolled by hand (wheel / touch, no visible
 * scrollbar), with the same wrap. With reduced motion, or no more rows than fit, it
 * does not move by itself.
 */
function ScrollingBoard({ entries }: { entries: LeaderboardEntry[] }) {
  const windowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = windowRef.current;
    if (!box) return;
    const lists = box.querySelectorAll<HTMLElement>('ol');
    const first = lists.item(0);
    const copy = lists.item(1) as HTMLElement | null;
    if (!first || !copy) {
      box.style.height = '';
      return;
    }
    const rows = first.querySelectorAll<HTMLElement>('li');
    // Distance from one copy to the next: scrolling by exactly this looks identical.
    let period = 0;
    const fit = () => {
      const last = rows.item(VISIBLE_ROWS - 1);
      box.style.height = `${last.offsetTop + last.offsetHeight}px`;
      period = copy.offsetTop - first.offsetTop;
    };
    fit();
    window.addEventListener('resize', fit);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Float position: scrollTop rounds, so sub-pixel steps would otherwise be lost.
    let position = 0;
    let restUntil = performance.now() + DWELL_MS;
    let lastFrame = performance.now();
    let frame = 0;

    const pauseForManual = () => {
      restUntil = performance.now() + MANUAL_PAUSE_MS;
    };
    const onWheel = (e: WheelEvent) => {
      pauseForManual();
      // Scrolling up past #1 continues from the end of the list.
      if (e.deltaY < 0 && box.scrollTop + e.deltaY < 0) box.scrollTop += period;
    };
    box.addEventListener('wheel', onWheel, { passive: true });
    box.addEventListener('touchstart', pauseForManual, { passive: true });

    const step = (now: number) => {
      const dt = now - lastFrame;
      lastFrame = now;
      frame = requestAnimationFrame(step);
      // Follow any manual scroll so auto-scroll continues from where the operator left it.
      if (Math.abs(box.scrollTop - position) > 1) position = box.scrollTop;
      if (autoScrollEnabled && !reduced && now >= restUntil) {
        position += (SCROLL_PX_PER_SECOND * dt) / 1000;
      }
      // Past the first copy: wrap back by one copy (same picture, endless loop).
      if (period > 0 && position >= period) position -= period;
      if (Math.abs(box.scrollTop - position) >= 0.5) box.scrollTop = position;
    };
    // With reduced motion the loop still runs (for the manual-scroll wrap) but never moves.
    frame = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', fit);
      box.removeEventListener('wheel', onWheel);
      box.removeEventListener('touchstart', pauseForManual);
      box.scrollTop = 0;
    };
  }, [entries]);

  return (
    <>
      {/* Clicking the title toggles auto-scroll (hidden operator feature, no visual cue). */}
      <p className="muted" onClick={() => (autoScrollEnabled = !autoScrollEnabled)}>
        TOP SCORES
      </p>
      <div className="board-window" ref={windowRef}>
        <LeaderboardList entries={entries} />
        {entries.length > VISIBLE_ROWS && <LeaderboardList entries={entries} hidden />}
      </div>
    </>
  );
}

export function AttractOverlay({ host }: { host: HostSessionState }) {
  return (
    <div className="overlay attract">
      <Wordmark />
      <div className="attract-card">
        <div className="qr-slot" aria-label="QR code" data-join-url={host.joinUrl ?? undefined}>
          <QrSlot host={host} />
        </div>
        <div>
          <h1 className="cta">SCAN TO PLAY</h1>
          <p className="tagline">Scan. Swipe. Score.</p>
          <p className="muted">45 seconds. Swipe up on your phone to shoot.</p>
        </div>
        {host.leaderboard.length > 0 && (
          <div className="attract-board">
            <ScrollingBoard entries={host.leaderboard} />
          </div>
        )}
      </div>
      <SponsorBadge />
      {import.meta.env.DEV && (
        <p className="dev-hint">Dev: Ctrl+Shift+D demo · Ctrl+Shift+X reset</p>
      )}
    </div>
  );
}

function SponsorBadge() {
  return (
    <div className="sponsor-badge">
      <span>OFFICIAL SPONSOR</span>
      <img src="/brand/dhika.webp" alt="DHIKA" />
    </div>
  );
}

export function ConnectedOverlay({ nickname }: { nickname: string }) {
  return (
    <div className="overlay center">
      <p className="muted">PLAYER CONNECTED</p>
      <h1 className="big-name">{nickname}</h1>
      <p className="tagline">Press READY on your phone</p>
    </div>
  );
}

export function CountdownOverlay({ endsAt }: { endsAt: number | null }) {
  const now = useNow();
  const n = secondsLeft(endsAt, now);
  return (
    <div className="overlay center">
      <div key={n} className="countdown">
        {n > 0 ? n : 'GO!'}
      </div>
    </div>
  );
}

export function Hud({ state, config }: { state: GameState; config: GameConfig }) {
  const now = useNow();
  const left = secondsLeft(state.roundEndsAt, now);
  const multiplier = nextMultiplier(state.score, config.scoring);
  const level = levelIndex(state.score.score, config.levels) + 1;

  return (
    <div className="hud">
      <div className="hud-block">
        <span className="hud-label">PLAYER</span>
        <span className="hud-value hud-name">{state.nickname}</span>
        <span className={`level-badge level-${level}`}>LEVEL {level}</span>
        {state.mode === 'live' && !state.controllerConnected && (
          <span className="phone-lost">📱 PHONE DISCONNECTED</span>
        )}
      </div>
      <div className="hud-scorebug">
        <div className={`hud-block hud-time ${left <= 5 ? 'urgent' : ''}`}>
          <span className="hud-label">TIME</span>
          <span className="hud-value">{left}</span>
        </div>
        <div className="hud-block hud-right">
          <span className="hud-label">SCORE</span>
          <span className="hud-value">{state.score.score}</span>
          {multiplier > 1 && <span className="streak">🔥 x{multiplier}</span>}
        </div>
      </div>
      {state.status === 'finished' && <div className="buzzer">TIME!</div>}
    </div>
  );
}

/** Big banner when a streak reaches a new multiplier (x1.5 at 5 in a row, x2 at 10). */
export function StreakBanner({ feedback }: { feedback: ShotFeedback | null }) {
  if (!feedback?.multiplierUp) return null;
  return (
    <div key={feedback.seq} className="streak-banner">
      ON FIRE x{feedback.multiplierUp}
      <span>{feedback.multiplierUp >= 2 ? '10 IN A ROW' : '5 IN A ROW'}</span>
    </div>
  );
}

/** Camera flash + big level number when a basket takes the player to a new level. */
export function LevelUpFlash({ feedback }: { feedback: ShotFeedback | null }) {
  if (!feedback?.levelUp) return null;
  return (
    <div key={feedback.seq} className="level-up">
      <div className="level-up-flash" />
      <div className="level-up-text">
        LEVEL {feedback.levelUp}
        <span>
          {feedback.multiplierUp
            ? `THE HOOP IS MOVING · ON FIRE x${feedback.multiplierUp}`
            : 'THE HOOP IS MOVING'}
        </span>
      </div>
    </div>
  );
}

const FEEDBACK_TEXT = { perfect: 'PERFECT!', scored: 'SCORE!', missed: 'MISS' } as const;

export function FeedbackPop({ feedback }: { feedback: ShotFeedback | null }) {
  if (!feedback) return null;
  return (
    <div key={feedback.seq} className={`feedback feedback-${feedback.outcome}`}>
      {FEEDBACK_TEXT[feedback.outcome]}
      {feedback.points > 0 && (
        <span className="feedback-points">
          +{feedback.points}
          {feedback.multiplier > 1 && (
            <em className="feedback-multiplier"> 🔥 x{feedback.multiplier}</em>
          )}
        </span>
      )}
    </div>
  );
}

export function ResultsOverlay({
  state,
  leaderboard,
}: {
  state: GameState;
  leaderboard: LeaderboardEntry[];
}) {
  const now = useNow();
  const { score, shots, baskets } = state.score;
  return (
    <div className="overlay center results">
      <p className="muted">{state.nickname}</p>
      <h1 className="final-score">{score}</h1>
      <p className="muted">POINTS</p>
      <div className="stats">
        <div>
          <strong>{baskets}</strong>
          <span>BASKETS</span>
        </div>
        <div>
          <strong>{shots}</strong>
          <span>SHOTS</span>
        </div>
        <div>
          <strong>{Math.round(accuracy(state.score) * 100)}%</strong>
          <span>ACCURACY</span>
        </div>
        <div>
          <strong>{state.score.bestStreak}</strong>
          <span>BEST STREAK</span>
        </div>
      </div>
      {state.rank !== null && <p className="rank">#{state.rank} ON THE LEADERBOARD</p>}
      {state.mode === 'live' && state.playerId === null && (
        <p className="rank guest">GUEST · SIGN IN TO MAKE THE LEADERBOARD</p>
      )}
      {state.mode === 'live' && (
        <LeaderboardList
          entries={leaderboard.slice(0, VISIBLE_ROWS)}
          highlight={state.playerId ?? undefined}
        />
      )}
      {state.mode === 'live' && <CoachLine score={score} />}
      <p className="tagline">NEXT PLAYER IN {secondsLeft(state.statusEndsAt, now)}s</p>
    </div>
  );
}

/** AI Coach pitch for the crowd; the player's DNA is on their phone. */
function CoachLine({ score }: { score: number }) {
  const pitch = coachPitch(score);
  return (
    <div className="coach-line">
      <strong>{pitch.headline}</strong>
      <span>Your Player DNA is on your phone. The AI Coach in the CAPTAIN app trains it.</span>
    </div>
  );
}
