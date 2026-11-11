# CAPTAIN SHOOTOUT

First-person 3D basketball shooting game for the CAPTAIN booth. The desktop shows the court; the player scans a QR code and uses their phone as a controller, swiping up to shoot. 30-second rounds.

Product and technical docs live in [`docs/`](docs/). **[`docs/DECISIONS.md`](docs/DECISIONS.md) wins over the other docs.**

## Structure

```text
apps/
  game-desktop/        Kiosk display: 3D scene, physics, authoritative state, HUD
    src/game/state/    Pure game reducer (state machine, shot validation, timer)
    src/game/scoring/  Pure scoring rules (2 / 3 perfect / x1.5 at 5 in a row, x2 at 10)
    src/game/physics/  Court geometry, shot velocity, basket detection (pure)
    src/game/scene/    React Three Fiber + Rapier scene
    src/features/      Overlays and HUD
    src/input/         Demo (mouse/keyboard) input and operator shortcuts
  controller-mobile/   Phone controller
    src/app/           Pure controller state (screens, local shot throttle)
    src/gestures/      Pointer Events swipe capture
    src/services/      Transport selection (Firebase when configured, mock otherwise)
    src/features/      Screens
packages/
  game-protocol/       Shared contracts, config, input validation, swipe mapping, nicknames
  firebase-transport/  Firebase implementation of the transport + leaderboard interfaces
firebase/              RTDB + Firestore security rules and indexes
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

### With the Firebase emulators (full phone ↔ desktop loop, offline)

```bash
npm i -g firebase-tools        # once; needs Java 21+
pnpm emulators                 # auth 9099, database 9000, firestore 8080
pnpm dev:desktop:emulators     # http://localhost:5173 shows the QR
pnpm dev:mobile:emulators      # the QR points here
```

The emulator modes always use the offline `demo-captain-shootout` project, even if
`.env.local` holds the real config. To test with a **real phone**, open the desktop via
the Mac's LAN IP (e.g. `http://172.20.10.2:5173`), not `localhost`: the QR and the
emulator host follow the page's hostname, and both apps must reach the same host.

Security rules tests (start their own emulators, so stop `pnpm emulators` first, as they
also wipe the emulator data):

```bash
pnpm --filter @captain/firebase-transport test:rules
```

Checks:

```bash
pnpm check          # typecheck + lint + tests
pnpm build
```

## Event

- Real project setup and deploy: [`docs/FIREBASE_SETUP.md`](docs/FIREBASE_SETUP.md)
- Kiosk run: `pnpm kiosk` (production build served at http://localhost:5173)
- Staff checklist and recovery: [`docs/KIOSK_CHECKLIST.md`](docs/KIOSK_CHECKLIST.md)

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
- [x] Phase 3 — Firebase sessions, QR, real-time shots (verified on the emulators)
- [x] Phase 4 — full loop, disconnect/resume, heartbeat, stale sessions
- [x] Phase 5 — global leaderboard, rank, kiosk docs
- [x] Real project: rules + controller deployed (captain-shootout.web.app), kiosk account, remote smoke test
- [ ] On-site check at the booth (hotspot, kiosk Mac, booth phone) — see `docs/KIOSK_CHECKLIST.md`
