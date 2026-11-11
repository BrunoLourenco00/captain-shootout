# Firebase setup (real project)

Project id: `captain-shootout` (alias `prod` in `.firebaserc`). Local development and
tests use the offline `demo-captain-shootout` emulator project and need none of this.

## 1. Console (one time)

1. **Authentication → Sign-in method**: enable **Anonymous** (phones) and
   **Email/Password** (kiosk).
2. **Authentication → Users → Add user**: `main@trycaptain.app` with a strong
   password. Do this before the event: `firebase/firestore.rules` only lets this email
   write the leaderboard, so nobody else must be able to claim it.
3. **Realtime Database**: created (europe-west1). **Firestore**: create it in
   production mode, same region family (e.g. `eur3`).
4. **Project settings → Your apps → Web app**: copy the config into the `.env.local`
   files below.

## 2. Local env files (never committed)

`apps/controller-mobile/.env.local`

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=captain-shootout.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://captain-shootout-default-rtdb.europe-west1.firebasedatabase.app
VITE_FIREBASE_PROJECT_ID=captain-shootout
VITE_FIREBASE_APP_ID=...
```

`apps/game-desktop/.env.local`: the same five values, plus

```bash
# URL encoded in the QR code: the deployed controller.
VITE_CONTROLLER_BASE_URL=https://challenge.trycaptain.app   # or https://captain-shootout.web.app
VITE_KIOSK_EMAIL=main@trycaptain.app
VITE_KIOSK_PASSWORD='<kiosk password>'   # keep the quotes: an unquoted # starts a comment
```

A freshly deployed Firestore index takes a few minutes to build; until then TOP SCORES
stays empty (it reloads on every attract screen).

Without kiosk credentials the desktop signs in anonymously: rounds work, but results
are not saved (Firestore rules reject the write) and no rank is shown.

> The emulator modes (`pnpm dev:*:emulators`) ignore these values and always use the
> demo project, so keeping `.env.local` filled in is safe.

## 3. Deploy

```bash
npm i -g firebase-tools   # if needed
firebase login            # or: firebase login --reauth
pnpm deploy:rules         # RTDB + Firestore rules and indexes
pnpm deploy:controller    # builds the phone app and deploys it to Hosting
```

Only the **controller** is deployed. The desktop runs locally on the kiosk
(`pnpm kiosk`), so the kiosk password is never on a public site.

## 4. Custom domain (optional)

Hosting → **Add custom domain** → `challenge.trycaptain.app`, then add the DNS records
Firebase shows at the trycaptain.app DNS provider. Certificates can take up to a few
hours: if it is not ready in time, use `https://captain-shootout.web.app` as
`VITE_CONTROLLER_BASE_URL`.

## 5. Smoke test

1. `pnpm kiosk` on the kiosk, open http://localhost:5173 in Chrome.
2. Scan the QR with a phone on the hotspot, join, press READY, shoot a few times.
3. After the results, the nickname appears under TOP SCORES with its rank.
4. Firebase console → Firestore → `leaderboard` has the entry.

## Resetting the leaderboard

Delete the documents in Firestore `leaderboard` from the console (e.g. after test
rounds, before doors open). Old `sessions` in RTDB are removed automatically 20 s after
each round; leftovers from crashes are harmless and can be deleted from the console.
