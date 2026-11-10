# CAPTAIN SHOOTOUT — Technical Architecture

**Status:** Proposed architecture for the MVP. Validate infrastructure choices with a small technical spike before committing to the full implementation.

## 1. Architecture principles

1. **Desktop authoritative:** The desktop game owns the timer, physics, basket detection, score and game-state transitions.
2. **Phone as input device:** The mobile browser sends normalized shot commands; it cannot set score or game outcomes.
3. **Low-bandwidth real-time messaging:** Send discrete shot events, not per-frame physics state.
4. **Replaceable transport:** Keep game logic independent of Firebase or a local WebSocket transport.
5. **Event resilience:** Design for reconnects, expired sessions and temporary network failure.
6. **Simple MVP:** Avoid unnecessary microservices and premature complexity.

## 2. Proposed technology stack

### Monorepo

- `pnpm` workspaces
- TypeScript
- Shared linting, formatting and type-checking configuration

### Desktop game

- React
- Vite
- TypeScript
- Three.js
- React Three Fiber
- Rapier physics (`@react-three/rapier` or the appropriate Rapier integration)

### Mobile controller

- React
- Vite
- TypeScript
- Responsive CSS
- Pointer Events for swipe input

### Initial backend / persistence proposal

- Firebase Realtime Database for session state and short-lived commands.
- Cloud Firestore for completed game results and leaderboard data.
- Firebase Hosting for the web applications.
- Cloud Functions or a trusted backend for validation and leaderboard writes where appropriate.

**Important:** The initial proposal uses Firebase for convenience, but event Wi-Fi performance must be tested. Keep the transport behind an interface so a local WebSocket server can be substituted.

## 3. Suggested repository structure

```text
captain-shootout/
├── apps/
│   ├── game-desktop/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── game/
│   │   │   │   ├── scene/
│   │   │   │   ├── physics/
│   │   │   │   ├── scoring/
│   │   │   │   └── state/
│   │   │   ├── features/
│   │   │   └── services/
│   │   └── ...
│   └── controller-mobile/
│       ├── src/
│       │   ├── app/
│       │   ├── features/
│       │   ├── gestures/
│       │   └── services/
│       └── ...
├── packages/
│   ├── shared-types/
│   ├── game-protocol/
│   └── shared-config/
├── docs/
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
└── CLAUDE.md
```

This is a proposed structure, not a requirement to create every package immediately. Start with the smallest structure that preserves separation between game logic, UI and transport.

## 4. Runtime responsibilities

### Desktop

- Creates a game session.
- Displays the session QR code.
- Accepts one controller for that session.
- Owns the game state machine.
- Starts and stops the authoritative timer.
- Receives and validates shot commands.
- Simulates ball physics locally.
- Detects basket events and calculates score.
- Persists completed results.
- Resets to attract mode.

### Mobile

- Reads session identifier/token from the join URL.
- Collects nickname.
- Connects to the active session.
- Sends READY.
- Captures swipe gesture.
- Normalizes gesture into a `ShotCommand`.
- Shows connection and shot feedback.
- Reconnects safely when possible.

### Backend / transport

- Relays session and controller events.
- Stores or relays short-lived commands.
- Persists final results and leaderboard records through trusted writes.
- Applies session expiry and access rules.

## 5. Communication design

Define a transport abstraction, for example:

```ts
interface GameTransport {
  createSession(): Promise<GameSession>;
  joinSession(sessionId: string, token: string, nickname: string): Promise<void>;
  setReady(sessionId: string): Promise<void>;
  sendShot(command: ShotCommand): Promise<void>;
  subscribeToSession(sessionId: string, handlers: SessionEventHandlers): () => void;
  close(): Promise<void>;
}
```

Adapt the interface to the actual chosen transport. Do not let React components call Firebase APIs directly throughout the application.

### Event flow

1. Desktop creates a session with a random identifier and short-lived join token.
2. Desktop renders a QR URL such as `https://trycaptain.app/play/ABC123?token=...`.
3. Mobile joins the session and submits a nickname.
4. Desktop receives the join event and moves to CONNECTED.
5. Mobile sends READY.
6. Desktop starts countdown and then PLAYING.
7. Mobile sends a discrete shot command.
8. Desktop validates it, applies physics and calculates the outcome.
9. Desktop updates its own HUD and sends non-authoritative display feedback to mobile if needed.
10. Desktop writes the final result through a trusted persistence path.

Do not transmit ball position/rotation at 60 FPS through Firebase. Physics runs locally on the desktop.

## 6. Data contracts

Keep shared contracts in `packages/shared-types` or `packages/game-protocol`.

Illustrative TypeScript types:

```ts
type GameStatus = 'waiting' | 'connected' | 'ready' | 'countdown' | 'playing' | 'finished';

interface GameSession {
  sessionId: string;
  status: GameStatus;
  createdAt: number;
  expiresAt: number;
  player?: {
    playerId: string;
    nickname: string;
  };
  controller?: {
    connected: boolean;
    lastHeartbeatAt?: number;
  };
  game?: {
    startedAt?: number;
    endsAt?: number;
    score: number;
    shots: number;
    baskets: number;
  };
}

interface ShotCommand {
  sessionId: string;
  shotId: string;
  directionX: number; // -1..1
  directionY: number; // documented normalized convention
  power: number; // 0..1
  clientTimestamp: number;
}

interface ShotResult {
  shotId: string;
  outcome: 'perfect' | 'scored' | 'missed';
  points: number;
  scoreAfterShot: number;
}
```

Treat these as starting contracts. Refine validation, optional fields and event versioning before implementation.

## 7. Session security and validation

- Generate unpredictable session IDs and join tokens.
- Tokens should be short-lived and scoped to one session.
- Permit one active controller per session.
- Invalidate the token after the session ends.
- Expire abandoned sessions.
- Accept shot commands only while the session is PLAYING.
- Validate numeric values and clamp/reject out-of-range input.
- Rate-limit shots to a plausible human cadence.
- Deduplicate using `shotId`.
- Reject late commands and commands for another session.
- Never accept score, points, basket outcome or timer values from the phone.
- Use Firebase security rules and App Check where appropriate.
- Do not expose privileged credentials in either web client.

A client-side desktop is authoritative for the booth experience, but it is not a secure anti-cheat boundary if the desktop itself is untrusted. If leaderboard integrity matters beyond a casual event, use a trusted backend to validate and accept final results.

## 8. Physics and basket detection

### Scene

- Fixed first-person PerspectiveCamera near the free-throw line.
- Camera looks toward the hoop.
- Static court, backboard and rim colliders.
- Dynamic basketball rigid body.
- Visual net animation.
- Lighting and restrained effects.

### Launch

Convert normalized direction and power into an initial velocity. The following is only an illustrative starting point; values must be calibrated against the chosen scene scale and camera:

```ts
function calculateShotVelocity(directionX: number, directionY: number, power: number) {
  return {
    x: directionX * 2.5,
    y: 4 + power * 5,
    z: -(5 + power * 3),
  };
}
```

### Basket detection

A basket should count only when:

- The ball crosses the hoop scoring plane.
- The ball is travelling downward.
- The ball is within the valid scoring region.
- The current shot has not already been counted.

Use collision/sensor events and a per-shot scoring guard. Test edge cases such as rim bounces, backboard hits and balls passing upward through the hoop.

## 9. Reliability and offline strategy

Build a transport interface so two options can be tested:

### Option A — Firebase

Advantages:

- Fast initial development.
- Hosted infrastructure.
- Straightforward phone-to-desktop connection over the internet.

Risks:

- Event Wi-Fi and internet may be congested or restricted.
- Latency and reconnect behavior need real-world testing.

### Option B — Local WebSocket

Advantages:

- Can work on a dedicated local network without internet.
- Potentially lower latency and more predictable control.

Risks:

- Phone and desktop must be on the same network.
- Captive portals, device isolation and network configuration can cause problems.

Run a small proof of concept on the actual event network. Do not assume either option will work reliably without testing. Consider a fallback demo mode if a controller cannot connect.

## 10. Persistence model

Suggested conceptual collections/paths:

```text
activeSessions/{sessionId}
gameSessions/{sessionId}
leaderboard/{playerId}
```

Use Realtime Database for ephemeral active session state and command relay if that remains the chosen transport. Use Firestore for completed game records and leaderboard data.

Avoid storing unnecessary personal data. A nickname is sufficient for the public leaderboard. Define retention and deletion behavior before collecting optional contact details.

## 11. Performance and kiosk operation

- Target smooth rendering on the actual booth computer.
- Keep 3D assets lightweight and optimize textures/materials.
- Avoid excessive post-processing.
- Preload assets before the game is available.
- Handle WebGL context loss or provide a recoverable error screen.
- Run the desktop browser in kiosk/full-screen mode.
- Add a watchdog/restart procedure for event staff.
- Keep a keyboard-accessible operator reset action, protected from accidental visitor use.
- Test a continuous multi-hour run.

## 12. Technical decisions to validate

Before building the full game, prove:

1. Three.js/R3F + Rapier can deliver the desired ball feel and basket detection.
2. A mobile browser can connect and send commands reliably on the intended network.
3. QR/session creation and expiry work correctly.
4. The desktop can run for long periods without memory/performance degradation.
5. Firebase vs local WebSocket behavior is acceptable at the venue.
