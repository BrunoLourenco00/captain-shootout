import type { ShotOutcome } from './types';

/**
 * "Player DNA": five 0-100 traits computed by the desktop from the round's real shots.
 * One round is a small sample, and the phone says so.
 */
export interface PlayerDna {
  /** Share of shots that went in. */
  accuracy: number;
  /** How many shots were taken, against one shot every 1.5 s. */
  volume: number;
  /** How steady the time between shots was. */
  rhythm: number;
  /** Accuracy in the last 10 seconds. */
  clutch: number;
  /** Second-half accuracy compared with the first half. */
  stamina: number;
}

export type DnaTrait = keyof PlayerDna;

export interface DnaShot {
  firedAt: number;
  outcome: ShotOutcome;
}

const VOLUME_SHOT_EVERY_MS = 1500;
const CLUTCH_WINDOW_MS = 10_000;

const pct = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 100);

function hitRate(shots: DnaShot[]): number | null {
  if (shots.length === 0) return null;
  return shots.filter((s) => s.outcome !== 'missed').length / shots.length;
}

export function playerDna(shots: DnaShot[], roundStartsAt: number, roundEndsAt: number): PlayerDna {
  const duration = Math.max(1, roundEndsAt - roundStartsAt);
  const sorted = [...shots].sort((a, b) => a.firedAt - b.firedAt);

  // Rhythm: 1 - coefficient of variation of the gaps between shots (needs 3+ shots).
  let rhythm = 0;
  if (sorted.length >= 3) {
    const gaps = sorted.slice(1).map((s, i) => s.firedAt - (sorted[i]?.firedAt ?? s.firedAt));
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const sd = Math.sqrt(gaps.reduce((a, g) => a + (g - mean) ** 2, 0) / gaps.length);
    rhythm = mean > 0 ? pct(1 - sd / mean) : 0;
  }

  const half = roundStartsAt + duration / 2;
  const first = hitRate(sorted.filter((s) => s.firedAt < half));
  const second = hitRate(sorted.filter((s) => s.firedAt >= half));
  let stamina = 0;
  if (second !== null) {
    stamina = first === null || first === 0 ? (second > 0 ? 100 : 0) : pct(second / first);
  }

  return {
    accuracy: pct(hitRate(sorted) ?? 0),
    volume: pct(sorted.length / (duration / VOLUME_SHOT_EVERY_MS)),
    rhythm,
    clutch: pct(hitRate(sorted.filter((s) => s.firedAt >= roundEndsAt - CLUTCH_WINDOW_MS)) ?? 0),
    stamina,
  };
}

export const DNA_LABELS: Record<DnaTrait, { short: string; name: string }> = {
  accuracy: { short: 'ACC', name: 'Accuracy' },
  volume: { short: 'VOL', name: 'Volume' },
  rhythm: { short: 'RHY', name: 'Rhythm' },
  clutch: { short: 'CLU', name: 'Clutch' },
  stamina: { short: 'STA', name: 'Stamina' },
};

export const DNA_ORDER: DnaTrait[] = ['accuracy', 'volume', 'rhythm', 'clutch', 'stamina'];

const GENE_TEXT: Record<DnaTrait, string> = {
  accuracy: 'Too many shots are not finding the bottom of the net.',
  volume: 'You took your time between shots. More reps, more points.',
  rhythm: 'Your shot timing jumps around. Find a release you can repeat.',
  clutch: 'Your shot drops off when the clock gets tight.',
  stamina: 'Your second half was weaker than your first.',
};

/** The weakest trait to point the player at; ties go to the earlier trait in DNA_ORDER. */
export function geneToUnlock(dna: PlayerDna): { trait: DnaTrait; name: string; text: string } {
  let trait: DnaTrait = 'accuracy';
  for (const t of DNA_ORDER) if (dna[t] < dna[trait]) trait = t;
  return { trait, name: DNA_LABELS[trait].name, text: GENE_TEXT[trait] };
}
