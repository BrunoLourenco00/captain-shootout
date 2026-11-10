# CLAUDE.md — CAPTAIN SHOOTOUT

## Project context

You are helping build **CAPTAIN SHOOTOUT**, a first-person 3D basketball shooting game for a CAPTAIN event booth.

The experience uses two screens:
- Desktop: public-facing 3D game, court, hoop, timer, score and leaderboard.
- Mobile browser: player's controller. The player scans a QR code and swipes to shoot.

Each round lasts 30 seconds. The desktop is authoritative for game state, physics, timer, basket detection and score. The phone sends input commands only.

Read these documents before making architectural or product decisions:
- `PROJECT_SPEC.md`
- `TECHNICAL_ARCHITECTURE.md`
- `IMPLEMENTATION_PLAN.md`

## Working principles

1. Build incrementally. Do not attempt to implement the whole product in one response or commit.
2. Inspect the existing repository before changing it. Preserve working code and conventions.
3. If the repository is empty, scaffold only the minimum structure needed for the current milestone.
4. Prefer clear, maintainable TypeScript and small, focused modules.
5. Keep UI, game logic, physics, scoring and networking separated.
6. Keep the networking implementation behind an interface so Firebase can be replaced by local WebSocket if necessary.
7. Do not transmit physics state every frame over the network. Send discrete input events.
8. Never trust the mobile client for score, basket outcomes or timer values.
9. Validate all external input. Handle duplicate, stale, malformed and out-of-range commands.
10. Avoid premature abstractions, unnecessary dependencies and speculative features.
11. Do not add accounts or collect personal information for the MVP unless explicitly requested.
12. Explain important trade-offs briefly before making a decision that materially changes the architecture.

## Product and visual constraints

Use CAPTAIN brand colors:
- Blue: `#1668D6`
- Dark: `#0B1220`
- Light: `#F7F9FB`
- Secondary: `#526070`
- Border: `#E1E7EF`

The visual direction is sports performance: polished, high contrast, energetic and readable from a distance. Avoid a generic cartoon aesthetic.

The desktop is a kiosk/public display. The mobile controller is portrait-first, thumb-friendly and minimal.

## Technical direction

Proposed stack:
- pnpm workspaces
- TypeScript
- React + Vite
- Three.js + React Three Fiber
- Rapier physics
- React mobile controller using Pointer Events
- Firebase Realtime Database for initial real-time session transport
- Firestore for completed results and leaderboard
- Firebase Hosting

Treat these as the current proposal, not unquestionable requirements. Validate package compatibility and current project setup before installing dependencies. Keep transport replaceable and test event-network reliability.

## Game rules and invariants

- Round duration is 30 seconds.
- One active controller per session.
- Desktop owns the authoritative clock and game state.
- Accept shots only while the session is PLAYING.
- Each shot has a unique `shotId`.
- Duplicate shots must not be processed twice.
- The mobile client sends normalized direction and power only.
- The desktop calculates the launch, physics, basket outcome and points.
- A basket must be detected once, while the ball is travelling downward through the valid scoring region.
- The game automatically transitions to results and then back to attract mode.

## Development workflow

For each task:
1. Inspect relevant files and current implementation.
2. State the smallest useful implementation plan.
3. Implement only the agreed milestone.
4. Run relevant type checks, linting and tests.
5. Fix regressions caused by the changes.
6. Summarize files changed, behavior implemented, commands run and remaining issues.
7. Suggest the next smallest logical task.

Do not claim a command or test passed unless you actually ran it and observed success.

## Current starting point

Unless the repository already contains implementation, begin with **Phase 0 / Phase 1** from `IMPLEMENTATION_PLAN.md`.

First inspect the repository and report:
- Current files and package setup.
- Whether it is empty or already initialized.
- Any existing decisions that conflict with these documents.

Then propose the first small implementation step. Do not integrate Firebase before the local 3D shooting prototype works.

## Code quality

- Use strict TypeScript where practical.
- Avoid `any`; explain any unavoidable use.
- Keep configuration in environment variables, with safe example values in `.env.example`.
- Never commit secrets, service-account files or private credentials.
- Add tests for scoring, state transitions, input validation and basket detection where feasible.
- Keep accessibility and responsive behavior in mind, especially for the mobile controller.
