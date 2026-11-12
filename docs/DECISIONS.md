# CAPTAIN SHOOTOUT — Decisions

Decisions taken on 2026-11-10 that refine or override `PROJECT_SPEC.md`, `TECHNICAL_ARCHITECTURE.md` and `IMPLEMENTATION_PLAN.md`. When a document conflicts with this file, **this file wins**.

## Deadline and scope

- **Event: Thursday 2026-11-12.** About two working days. Structure is kept; features are cut.
- **Kept:** monorepo, shared `game-protocol` package, transport behind an interface, game logic separated from UI, unit tests for scoring and state machine, keyboard/mouse demo mode, operator reset.
- **Cut for the event:** Cloud Functions (desktop writes the leaderboard directly, guarded by basic Firebase rules), App Check, analytics, local WebSocket implementation (interface only), sound effects if time runs out, "booth mode" controller auto-join.

## Tooling

- Monorepo at the repository root, **pnpm workspaces** (pnpm installed with `npm i -g pnpm`).
- Docs live in `docs/`, `CLAUDE.md` at the root.

## Network and backend

- Booth has **our own hotspot**. The desktop uses it; visitors use either the booth phone (on the hotspot) or their own phone (on the hotspot or mobile data).
- Transport: **Firebase Realtime Database** only (works whether the phone is on the hotspot or mobile data). Leaderboard in **Firestore**. **Firebase Hosting**, free Spark plan is enough.
- Domain: **subdomain** of trycaptain.app (e.g. `challenge.trycaptain.app`) pointing to Firebase Hosting; `*.web.app` as fallback. Base URL is an environment variable.

## Booth phone

- ~~The booth phone uses the same flow as visitors~~. Dropped on 2026-11-12: visitors play on their own phone only (it keeps their CAPTAIN sign-in).

## Desktop hardware and language

- Recommended: **Mac with Apple Silicon + Chrome in full-screen/kiosk**. A Windows PC is acceptable only with a reasonable GPU; otherwise lower the 3D quality preset.
- UI language: **English** ("SCAN TO PLAY").

## Scoring

- Basket: **2 points**.
- Swish (no rim contact): **3 points** ("PERFECT!").
- **Streak:** from the 5th consecutive basket each basket is worth **×1.5**, from the 10th **×2**, until a miss. A miss resets the streak. Points are rounded to whole numbers (a perfect at ×1.5 is worth 5). Changed on 2026-11-11; it replaces the ×2-from-the-5th rule and clutch time.
- All values live in config.

## Gameplay

- Up to **3 balls in flight** at once, minimum **350 ms** between shots (also acts as rate limit).
- Desktop HUD shows **time and score** (plus nickname and streak).
- Phone shows the swipe area plus **small time and score** at the top (non-authoritative, pushed by the desktop). At the end the phone shows the result and leaderboard position.
- If the phone disconnects mid-round, **the timer continues** and the round finishes normally; the score counts. A phone reconnecting to the same session resumes.

## Timings (config, editable)

| Setting                      | Value                                                    |
| ---------------------------- | -------------------------------------------------------- |
| Round duration               | 35 s (30 s until 2026-11-11, then 45 s until 2026-11-12) |
| Countdown                    | 3 s                                                      |
| Waiting for READY after join | 60 s, then back to attract                               |
| Results screen               | 10 s, then attract with a new QR                         |

## Nicknames and leaderboard

- 2–16 characters, auto-uppercase, small PT/EN profanity blocklist.
- **CAPTAIN account = leaderboard identity** (2026-11-12, replaces "unique nickname"). The phone offers sign-in / sign-up with the **CAPTAIN app account** (Google, Apple, email; the same Firebase Auth as the app and the trycaptain.app promo page, project `captain-app23`) or **Play as a guest**.
  - One leaderboard entry per **account** (`leaderboard/{captainUid}`), keeping the **best** score. The nickname is only a display name: it is no longer unique.
  - **Guests play but are never ranked** (not written to the leaderboard; phone and desktop say "GUEST").
  - The desktop does not trust the phone: the phone sends the account's Firebase **ID token**, the desktop verifies it itself (Google's public keys, issuer/audience `captain-app23`, expiry, not anonymous) and then deletes it from the session. No Cloud Function, no change to the CAPTAIN project's rules; it only needs the game domains in its Authorized domains.
  - The phone stays signed in (Firebase persistence), so a returning player goes straight to the nickname. The shared booth phone is no longer used.
- Leaderboard is **global forever** (single event for now).
- Ordering: score desc, then baskets desc, then earliest completion.

## Operator

- `Ctrl+Shift+X`: force reset to attract.
- `Ctrl+Shift+D`: toggle demo mode (play with mouse/keyboard on the desktop, no phone).

## Difficulty and sponsors (2026-11-11)

- **Levels by score** (`config.levels`): still hoop until 8 points; from 8 it sways left/right, faster and wider at 20, and also bobs at 35 (scaled from 10/25/45 for 35-second rounds). The phone tiers follow the same steps: Rookie 1+, Starter 8+, All-Star 20+, MVP 35+. Shots still aim at the regulation spot, so players must lead the moving hoop.
- ~~Clutch time~~ (last 10 s worth x2) was tried and dropped the same day in favour of the two-step streak multiplier (see Scoring).
- Arena branding: CAPTAIN wordmark in the key and on the LED boards; **DHIKA** as official sponsor (LED boards, banners, attract screen).
- End of round: AI Coach pitch (the coach in the CAPTAIN app), tone by score; the phone shows a "Player DNA" from the round's shots (accuracy, volume, rhythm, clutch, stamina, computed by the desktop). No link or sign-up button on the phone for now: sign-up before playing is planned instead.
