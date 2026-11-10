import { DEFAULT_GAME_CONFIG } from '@captain/game-protocol';

/** Placeholder until Phase 2 (connect → ready → swipe controller). */
export function App() {
  const { minLength, maxLength } = DEFAULT_GAME_CONFIG.nickname;
  return (
    <main className="screen">
      <div className="wordmark">
        CAPTAIN <span>SHOOTOUT</span>
      </div>
      <p className="muted">Controller coming in Phase 2</p>
      <p className="muted">
        Nickname: {minLength}–{maxLength} characters
      </p>
    </main>
  );
}
