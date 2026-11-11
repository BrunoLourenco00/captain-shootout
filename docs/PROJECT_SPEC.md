# CAPTAIN SHOOTOUT — Product & Gameplay Specification

**Document status:** Initial MVP specification  
**Product:** CAPTAIN SHOOTOUT  
**Experience:** First-person, 3D basketball shooting game with dual-screen interaction  
**Target environment:** CAPTAIN booth / event kiosk  
**Primary objective:** Create a fast, competitive, memorable experience that encourages visitors to engage with CAPTAIN.

## 1. Product concept

CAPTAIN SHOOTOUT is a short basketball challenge. The main computer displays a first-person 3D basketball court and hoop. The player uses their own smartphone as a wireless controller: they scan a QR code, connect to the game session, enter a nickname, and swipe on the phone to shoot.

A round lasts **45 seconds**. The desktop renders the game and owns the authoritative game state and score. The phone sends shot inputs only.

The experience should be:

- Instantly understandable to someone walking past the booth.
- Fast to join, ideally in under 15 seconds.
- Competitive, with a visible leaderboard.
- Visually polished, energetic and aligned with CAPTAIN branding.
- Resilient to unreliable event Wi-Fi and accidental disconnections.

## 2. Core experience

### Player journey

1. **Attract mode:** The desktop shows the CAPTAIN identity, the 3D court, a QR code, a call to action such as “SCAN TO PLAY”, the current high score and a short instruction.
2. **Connect:** The player scans the QR code. A mobile web page opens; no native app installation is required.
3. **Identify:** The player enters a nickname and connects to the session.
4. **Ready:** The desktop confirms the player. The phone shows a short instruction and a READY action.
5. **Countdown:** Both screens show a synchronized 3-2-1 countdown. The desktop clock is authoritative.
6. **Gameplay:** The player swipes on the phone. Each accepted swipe triggers a ball launch in the desktop 3D scene.
7. **Results:** The desktop shows score, shots, baskets, accuracy and leaderboard position.
8. **Reset:** After a short results interval, the desktop returns to attract mode and creates a new session/QR code.

### State machine

`ATTRACT -> WAITING_FOR_PLAYER -> CONNECTED -> READY -> COUNTDOWN -> PLAYING -> FINISHED -> RESULTS -> ATTRACT`

Include safe transitions for:

- Controller disconnected during play.
- Session timeout before the game starts.
- Invalid, duplicated or late shot commands.
- Desktop reset/restart.
- A player leaving the page.

## 3. Game rules

- Round duration: **45 seconds**.
- One active player/controller per game session.
- A swipe sends one shot command.
- The desktop determines whether a shot is valid and whether it scores.
- The phone must never be trusted to calculate or submit points.
- The game ends automatically when the desktop's authoritative timer reaches zero.
- Score, attempts, baskets and accuracy are shown on the results screen.
- Leaderboard ordering should be deterministic. Recommended MVP tie-break: highest score, then highest number of baskets, then earliest completion time.

Scoring values and any bonus/streak rules should be configurable rather than hard-coded throughout the codebase. Start with a simple scoring model and tune it through playtesting.

## 4. Shot interaction

### Mobile gesture

Use a fixed-origin swipe area:

- Swipe upward to shoot.
- Horizontal displacement controls left/right aim.
- Vertical displacement and/or gesture velocity controls shot power.
- Clamp all values to a safe, predictable range.
- Provide a clear visual response when a shot is accepted.
- Use haptic feedback when supported, but never depend on it.

Use Pointer Events rather than separate mouse/touch implementations. Apply `touch-action: none` only to the gameplay control area so the rest of the page remains usable.

Suggested normalized command:

- `directionX`: -1 to 1
- `directionY`: normalized vertical gesture component, with documented sign convention
- `power`: 0 to 1
- `shotId`: unique identifier
- `sessionId`: active session identifier

The exact gesture mapping must be calibrated with real users. Avoid making the controls overly sensitive.

### Desktop feedback

On each accepted shot:

- Spawn or activate a ball.
- Apply the calculated initial velocity.
- Show immediate feedback such as “SHOT!”, “SCORE!” or “MISS”.
- Update score only after the desktop validates the basket event.
- Prevent the same shot from scoring more than once.

## 5. Desktop experience

The desktop is the public-facing display and should work in full-screen kiosk mode.

### Attract mode

- CAPTAIN logo/wordmark.
- First-person 3D court and visible hoop.
- Large QR code and “SCAN TO PLAY” call to action.
- Short instructions: “Scan. Swipe. Score.”
- Current high score or leaderboard teaser.

### Connected / ready

- Show the player's nickname.
- Confirm that the phone is connected.
- Show countdown and a simple instruction.

### Gameplay HUD

Keep the 3D court visually dominant. HUD may include:

- Nickname.
- Countdown timer.
- Current score.
- Shots/baskets or streak.
- Brief shot feedback.

### Results

Show:

- Final score.
- Attempts and baskets.
- Accuracy.
- Leaderboard position, if available.
- Clear “NEXT PLAYER” / return-to-attract transition.

## 6. Mobile controller experience

Design mobile-first, portrait orientation.

### Connect screen

- CAPTAIN branding.
- Nickname input.
- Connection status.
- Clear join/continue action.

### Ready screen

- Player nickname.
- Short gesture instructions.
- READY action.
- Connection indicator.

### Controller screen

- Large, thumb-friendly swipe surface.
- Minimal interface; avoid small controls.
- Clear indication of remaining time and/or score if useful.
- Visual confirmation after a shot.
- Reconnection state if connectivity is interrupted.

Do not require account creation for the booth MVP. Avoid collecting unnecessary personal information.

## 7. Visual direction

Use CAPTAIN's existing visual identity:

- Primary blue: `#1668D6`
- Dark background/text: `#0B1220`
- Light background: `#F7F9FB`
- Secondary text: `#526070`
- Border: `#E1E7EF`

The 3D environment should feel like a polished sports-performance experience, not a generic cartoon arcade. Use strong contrast, clear lighting, restrained effects and readable typography. The desktop should be optimized for a large display; the controller should be optimized for one-handed phone use.

## 8. MVP scope

### Must have

- Desktop attract mode and first-person 3D court.
- Dynamic session and QR code.
- Mobile browser controller.
- Nickname entry.
- Real-time connection between phone and desktop.
- Swipe-to-shoot interaction.
- Ball physics and basket detection.
- 45-second authoritative timer.
- Score/results screen.
- Automatic reset for the next player.
- Basic leaderboard persistence.
- Disconnect and timeout handling.

### Should have

- Sound effects and subtle visual effects.
- Streak/bonus scoring.
- Personal best.
- Kiosk auto-recovery.
- Basic event analytics.

### Defer until core gameplay is stable

- Complex aim preview or trajectory assistance.
- Multiple game modes.
- User accounts and profiles.
- Social sharing.
- Advanced anti-cheat systems.
- Elaborate custom 3D assets and cinematic sequences.

## 9. Acceptance criteria

The MVP is ready for a booth test when:

1. Desktop launches in full-screen attract mode.
2. Desktop displays a valid, scannable QR code.
3. A phone can open the controller page and join the correct session.
4. Nickname appears on the desktop.
5. The player can start a round.
6. A swipe sends one command and launches a ball in the 3D scene.
7. Basket detection updates the score exactly once per shot.
8. The round ends automatically after 45 seconds.
9. Results and leaderboard are displayed.
10. The game returns to attract mode without a page reload.
11. An abandoned or disconnected session does not block the next player.
12. Invalid or duplicated commands cannot manipulate the score.

## 10. Event constraints

Assume the booth environment may have:

- Unreliable or congested Wi-Fi.
- Many nearby devices and networks.
- Visitors who abandon the game mid-round.
- Browser refreshes or phone screen locking.
- A desktop that must run for long periods.

Test on the actual target computer, display, browser and event network before deployment. Provide a demo mode and a recovery path.
