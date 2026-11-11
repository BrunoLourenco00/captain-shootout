import { coachPitch, type GameConfig, type LeaderboardEntry } from '@captain/game-protocol';
import { QRCodeSVG } from 'qrcode.react';
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

function LeaderboardList({
  entries,
  highlight,
}: {
  entries: LeaderboardEntry[];
  highlight?: string;
}) {
  if (entries.length === 0) return null;
  return (
    <ol className="leaderboard">
      {entries.map((e, i) => (
        <li key={e.nickname} className={e.nickname === highlight ? 'me' : undefined}>
          <span className="pos">{i + 1}</span>
          <span className="nick">{e.nickname}</span>
          <span className="pts">{e.score}</span>
        </li>
      ))}
    </ol>
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
            <p className="muted">TOP SCORES</p>
            <LeaderboardList entries={host.leaderboard} />
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
      {state.mode === 'live' && (
        <LeaderboardList entries={leaderboard} highlight={state.nickname ?? undefined} />
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
