import type { RoundSummary } from './controller';

/**
 * Personal end-of-round verdict for the phone: a tier title from the score plus a
 * line about how the round went. Lines are picked deterministically from the round
 * so the same result always reads the same (and tests stay stable).
 */
export type VerdictTier = 'airball' | 'rookie' | 'starter' | 'allstar' | 'mvp';

export interface RoundVerdict {
  tier: VerdictTier;
  /** Short badge text, e.g. "ALL-STAR". */
  title: string;
  /** One personal sentence about the round. */
  line: string;
}

/** Score where each tier starts; they follow the hoop levels (8, 20, 35). */
const TIERS: { tier: VerdictTier; minScore: number; title: string; lines: string[] }[] = [
  {
    tier: 'mvp',
    minScore: 35,
    title: 'MVP',
    lines: [
      'The hoop ran away from you and it still did not matter.',
      'That was not a round, that was a highlight reel.',
      'Somebody call the scouts.',
    ],
  },
  {
    tier: 'allstar',
    minScore: 20,
    title: 'ALL-STAR',
    lines: [
      'You made the moving hoop look easy.',
      'Big-game energy. The booth noticed.',
      'A few more of those and you are top of the board.',
    ],
  },
  {
    tier: 'starter',
    minScore: 8,
    title: 'STARTER',
    lines: [
      'You got the hoop moving. Now keep up with it.',
      'Solid round. The rhythm is there.',
      'Starting five material. Next stop: All-Star.',
    ],
  },
  {
    tier: 'rookie',
    minScore: 1,
    title: 'ROOKIE',
    lines: [
      'You are on the board. That is how every career starts.',
      'Warm-up done. The next round is the real one.',
      'Find the sweet spot on the swipe and the points follow.',
    ],
  },
  {
    tier: 'airball',
    minScore: 0,
    title: 'AIR BALL CLUB',
    lines: [
      'Even the greats missed their first one.',
      'The rim was not ready for you. Yet.',
      'Shorter swipe, softer touch. Try again.',
    ],
  },
];

/** Extra lines that beat the tier line when the round had something special. */
function specialLine(summary: RoundSummary): string | null {
  if (summary.rank === 1) return 'Number one on the leaderboard. Come back and defend it.';
  if (summary.shots >= 5 && summary.accuracy >= 0.8) return 'Sniper. Barely a miss all round.';
  if (summary.shots >= 20 && summary.accuracy < 0.25)
    return 'All gas, no brakes. Slow down and aim.';
  return null;
}

export function roundVerdict(summary: RoundSummary): RoundVerdict {
  const score = Math.max(0, summary.score);
  const entry = TIERS.find((t) => score >= t.minScore) ?? TIERS[TIERS.length - 1]!;
  const pick = (summary.score + summary.shots) % entry.lines.length;
  return {
    tier: entry.tier,
    title: entry.title,
    line: specialLine(summary) ?? entry.lines[pick] ?? entry.lines[0]!,
  };
}
