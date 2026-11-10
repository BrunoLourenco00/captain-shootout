# CAPTAIN SHOOTOUT

First-person 3D basketball shooting game for the CAPTAIN booth. The desktop shows the court; the player scans a QR code and uses their phone as a controller, swiping up to shoot. 30-second rounds.

Product and technical docs live in [`docs/`](docs/). **[`docs/DECISIONS.md`](docs/DECISIONS.md) wins over the other docs.**

## Structure

```text
apps/
  game-desktop/        Kiosk display: 3D scene, physics, authoritative state, HUD
    src/game/state/    Pure game reducer (state machine, shot validation, timer)
    src/game/scoring/  Pure scoring rules (2 / 3 perfect / x2 streak)
    src/game/physics/  Court geometry, shot velocity, basket detection (pure)
    src/game/scene/    React Three Fiber + Rapier scene
    src/features/      Overlays and HUD
    src/input/         Demo (mouse/keyboard) input and operator shortcuts
  controller-mobile/   Phone controller
    src/app/           Pure controller state (screens, local shot throttle)
    src/gestures/      Pointer Events swipe capture
    src/services/      Transport selection (mock until Phase 3)
    src/features/      Screens
packages/
  game-protocol/       Shared contracts, config, input validation, swipe mapping, nicknames
```

## Requirements

- Node 22+
- pnpm (`npm i -g pnpm`)

## Development

```bash
pnpm install
pnpm dev:desktop    # http://localhost:5173
pnpm dev:mobile     # http://localhost:5174/?s=TEST1&t=test1 (also on the LAN, for a real phone)
```

Checks:

```bash
pnpm check          # typecheck + lint + tests
pnpm build
```

## Desktop shortcuts (operator)

| Keys           | Action                                        |
| -------------- | --------------------------------------------- |
| `Ctrl+Shift+D` | Start a demo round (no phone needed)          |
| `Ctrl+Shift+X` | Force reset to attract                        |
| `Space`        | (demo) Sweet-spot shot                        |
| Mouse drag up  | (demo) Swipe shot — same mapping as the phone |

## Tuning

- Game rules and timings: `packages/game-protocol/src/config.ts`
- Shot feel (arc, assist zone, aim): `apps/game-desktop/src/game/physics/shotVelocity.ts`

## Status

- [x] Phase 0 — monorepo foundation
- [x] Phase 1 — 3D prototype, physics, basket detection, scoring, demo round loop
- [x] Phase 2 — mobile controller (nickname, ready, swipe, results) against a mock transport
- [ ] Phase 3 — Firebase sessions, QR, real-time shots
- [ ] Phase 4/5 — leaderboard, kiosk hardening
