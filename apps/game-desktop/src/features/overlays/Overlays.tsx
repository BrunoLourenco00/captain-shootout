import type { GameConfig } from '@captain/game-protocol';
import { accuracy, isOnFire } from '../../game/scoring/scoring';
import type { GameState, ShotFeedback } from '../../game/state/gameState';
import { useNow } from '../useNow';

function secondsLeft(deadline: number | null, now: number): number {
  return deadline === null ? 0 : Math.max(0, Math.ceil((deadline - now) / 1000));
}

function Wordmark() {
  return (
    <div className="wordmark">
      CAPTAIN <span>SHOOTOUT</span>
    </div>
  );
}

export function AttractOverlay({ joinUrl }: { joinUrl: string | null }) {
  return (
    <div className="overlay attract">
      <Wordmark />
      <div className="attract-card">
        <div className="qr-slot" aria-label="QR code">
          {/* Real QR code arrives with the session transport (Phase 3). */}
          {joinUrl ? <span className="qr-pending">QR</span> : <span className="qr-pending">…</span>}
        </div>
        <div>
          <h1 className="cta">SCAN TO PLAY</h1>
          <p className="tagline">Scan. Swipe. Score.</p>
          <p className="muted">30 seconds. Swipe up on your phone to shoot.</p>
        </div>
      </div>
      {import.meta.env.DEV && (
        <p className="dev-hint">Dev: Ctrl+Shift+D demo · Ctrl+Shift+X reset</p>
      )}
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
  const fire = isOnFire(state.score, config.scoring);
  return (
    <div className="hud">
      <div className="hud-block">
        <span className="hud-label">PLAYER</span>
        <span className="hud-value">{state.nickname}</span>
      </div>
      <div className={`hud-block hud-time ${left <= 5 ? 'urgent' : ''}`}>
        <span className="hud-label">TIME</span>
        <span className="hud-value">{left}</span>
      </div>
      <div className="hud-block hud-right">
        <span className="hud-label">SCORE</span>
        <span className="hud-value">{state.score.score}</span>
        {fire && <span className="streak">🔥 x{config.scoring.streakMultiplier}</span>}
      </div>
      {state.status === 'finished' && <div className="buzzer">TIME!</div>}
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
          {feedback.multiplied && ' 🔥'}
        </span>
      )}
    </div>
  );
}

export function ResultsOverlay({ state }: { state: GameState }) {
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
      <p className="tagline">NEXT PLAYER IN {secondsLeft(state.statusEndsAt, now)}s</p>
    </div>
  );
}
