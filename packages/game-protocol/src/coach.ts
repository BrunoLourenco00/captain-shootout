/**
 * End-of-round pitch for the AI Coach in the CAPTAIN app (chat coach and workouts
 * built from the player's own game). The line depends on how the round went.
 */
export interface CoachPitch {
  headline: string;
  body: string;
}

/** Score thresholds for the pitch tone; on a 45-second round 30+ is a strong round. */
const STRONG_ROUND = 30;
const DECENT_ROUND = 12;

export function coachPitch(score: number): CoachPitch {
  if (score >= STRONG_ROUND) {
    return {
      headline: "You've got the touch.",
      body: 'Now make it a habit: the AI Coach builds your next workout around your game.',
    };
  }
  if (score >= DECENT_ROUND) {
    return {
      headline: 'Good shot. Want a better one?',
      body: 'The AI Coach in the CAPTAIN app turns your game into a plan made for you.',
    };
  }
  return {
    headline: "Rough round? That's what coaches are for.",
    body: 'The AI Coach in the CAPTAIN app builds the workouts to fix it.',
  };
}
