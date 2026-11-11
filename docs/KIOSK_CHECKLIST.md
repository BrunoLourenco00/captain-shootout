# Kiosk checklist (booth staff)

## Before doors open

- [ ] Mac on power, sleep disabled (System Settings → Battery/Energy → prevent sleep;
      or run `caffeinate -d` in a terminal).
- [ ] Hotspot on; kiosk and booth phone connected to it. Notifications muted (Focus).
- [ ] `pnpm kiosk` running; Chrome at http://localhost:5173.
- [ ] Chrome full screen: `Ctrl+Cmd+F` (or launch with `--kiosk`). Zoom 100%.
- [ ] Badge "OFFLINE · RECONNECTING" is **not** shown on screen.
- [ ] Test round with the booth phone: scan, join, READY, shoot, results show a rank.
- [ ] Delete test entries from the leaderboard (see `FIREBASE_SETUP.md`).
- [ ] Booth phone: brightness up, auto-lock off or long, volume on (haptics).

## Operator keys (desktop keyboard)

| Keys           | Action                                     |
| -------------- | ------------------------------------------ |
| `Ctrl+Shift+X` | Force reset to the attract screen (new QR) |
| `Ctrl+Shift+D` | Demo round, no phone (draws people in)     |

## When something goes wrong

| Symptom                                 | Fix                                                                                       |
| --------------------------------------- | ----------------------------------------------------------------------------------------- |
| Phone says "This QR code is not valid"  | Scan the code currently on screen (each round gets a new one).                            |
| Phone says "Someone is already playing" | Wait for the round to end, scan the new QR.                                               |
| Phone says "This QR code has expired"   | The desktop was restarted: scan the code currently on screen.                             |
| "PHONE DISCONNECTED" during a round     | The round keeps running. Reopen the same page on the phone to continue, or let it finish. |
| Player walks away before pressing READY | Nothing: it returns to the QR after 60 s. Or `Ctrl+Shift+X`.                              |
| "OFFLINE" badge / QR never appears      | Check the hotspot; the desktop retries by itself. If stuck, reload Chrome (`Cmd+R`).      |
| Screen frozen or looks wrong            | Reload Chrome (`Cmd+R`). Scores already saved are kept.                                   |
| Booth phone used for the next player    | Scan the new QR again on the booth phone; enter the new player's nickname.                |

## Reminders

- The desktop is the referee: time, baskets and score are decided there, not on the phone.
- Nicknames are 2–16 characters and public on the leaderboard. Replays keep the best score.
