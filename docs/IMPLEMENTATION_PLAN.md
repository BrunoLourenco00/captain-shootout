# CAPTAIN SHOOTOUT — Implementation Plan

**Goal:** Build a booth-ready MVP in incremental, testable steps.

## Delivery strategy

Do not implement the entire product in one pass. First make a playable local prototype, then connect the phone, then add persistence and event hardening.

A rough initial estimate is **12–18 focused working days** for one developer if suitable 3D assets are available and scope stays controlled. This is a planning estimate, not a guarantee; custom 3D asset creation, networking issues and event testing can extend it.

## Phase 0 — Project foundation

### Tasks

- [ ] Create independent `captain-shootout` repository.
- [ ] Initialize pnpm workspace and TypeScript configuration.
- [ ] Create desktop and mobile Vite applications.
- [ ] Add shared-types / protocol package only when needed.
- [ ] Add ESLint and Prettier.
- [ ] Add environment-variable conventions and `.env.example`.
- [ ] Add a README with local development instructions.

### Definition of done

Both applications run locally, type-check and build.

## Phase 1 — First-person 3D prototype

### Tasks

- [ ] Set up React Three Fiber scene.
- [ ] Add first-person camera at the shooting position.
- [ ] Create court floor, hoop, backboard and basic lighting.
- [ ] Add basketball mesh and Rapier physics body.
- [ ] Implement a temporary keyboard/mouse test launcher.
- [ ] Tune gravity, ball mass, bounce and launch velocity.
- [ ] Implement basket detection and a per-shot scoring guard.
- [ ] Add basic score display.

### Definition of done

A developer can repeatedly launch a ball, see realistic-enough motion and reliably register makes/misses without duplicate scoring.

## Phase 2 — Mobile controller

### Tasks

- [ ] Build responsive mobile connect screen.
- [ ] Add nickname input and validation.
- [ ] Build READY screen.
- [ ] Implement pointer-based swipe capture.
- [ ] Normalize horizontal direction and power.
- [ ] Add visual gesture feedback.
- [ ] Add connection and error states.
- [ ] Test on current iOS Safari and Android Chrome.

### Definition of done

A phone can produce a normalized shot command locally and the gesture is comfortable and repeatable.

## Phase 3 — Sessions and real-time transport

### Tasks

- [ ] Define transport interface.
- [ ] Create session lifecycle service.
- [ ] Generate session ID and temporary join token.
- [ ] Generate QR code and join URL.
- [ ] Connect mobile to the selected session.
- [ ] Enforce one controller per session.
- [ ] Implement READY and session state events.
- [ ] Implement shot command relay.
- [ ] Add heartbeat, timeout and reconnect handling.
- [ ] Test Firebase RTDB proof of concept.
- [ ] Test local WebSocket fallback if event network conditions justify it.

### Definition of done

A phone scans the desktop QR, joins the correct session and sends a shot command that triggers a desktop ball launch.

## Phase 4 — Complete game loop

### Tasks

- [ ] Implement state machine.
- [ ] Add countdown.
- [ ] Implement desktop-authoritative 30-second timer.
- [ ] Lock command acceptance outside PLAYING.
- [ ] Add score, attempts, baskets and accuracy.
- [ ] Add gameplay HUD.
- [ ] Add results screen.
- [ ] Add automatic reset to attract mode.
- [ ] Handle player disconnect and abandoned sessions.

### Definition of done

A complete 30-second round can be played from scan to results and the next player can start without reloading the desktop page.

## Phase 5 — Leaderboard and event polish

### Tasks

- [ ] Persist completed results.
- [ ] Implement deterministic leaderboard ordering.
- [ ] Add nickname moderation/length limits.
- [ ] Add sounds and subtle visual effects.
- [ ] Improve attract mode and instructions.
- [ ] Add kiosk/full-screen startup instructions.
- [ ] Add operator reset and demo mode.
- [ ] Add error logging and basic analytics.
- [ ] Run multi-hour soak test.
- [ ] Test with multiple phone models and real event Wi-Fi.
- [ ] Prepare a staff recovery checklist.

### Definition of done

The experience is stable enough for repeated public use, and staff can recover it without developer intervention.

## Suggested task order for the first two days

### Day 1

1. Create repository and workspace.
2. Scaffold desktop app.
3. Render a basic court and first-person camera.
4. Add hoop and basketball.
5. Make the ball launch with a temporary keyboard input.

### Day 2

1. Add Rapier physics.
2. Tune the ball trajectory.
3. Implement basket detection.
4. Add score feedback.
5. Record a short demo and evaluate whether the gameplay feels satisfying.

Do not start Firebase integration before the local shooting mechanic is fun and reliable.

## Test checklist

### Gameplay

- [ ] Ball launches consistently.
- [ ] Gesture direction maps correctly.
- [ ] Low/high power behaves predictably.
- [ ] Rim and backboard collisions work.
- [ ] A single shot can only score once.
- [ ] Timer ends the game at 30 seconds.

### Connectivity

- [ ] Correct QR/session pairing.
- [ ] Invalid/expired token rejected.
- [ ] Second controller rejected or handled explicitly.
- [ ] Duplicate command ignored.
- [ ] Late command rejected.
- [ ] Disconnect/reconnect behavior is understandable.
- [ ] Abandoned session expires.

### Event readiness

- [ ] Full-screen desktop mode.
- [ ] No accidental browser navigation.
- [ ] Attract mode returns automatically.
- [ ] Operator can reset safely.
- [ ] Demo mode works without a phone.
- [ ] Long-running stability tested.
- [ ] Network fallback documented.

## Scope control

If time becomes limited, prioritize in this order:

1. Reliable scan-to-play flow.
2. Fun and responsive shooting mechanic.
3. Accurate timer and score.
4. Automatic reset.
5. Leaderboard.
6. Visual polish and secondary effects.

A simple game that never breaks is better than a visually elaborate game that fails during the event.
