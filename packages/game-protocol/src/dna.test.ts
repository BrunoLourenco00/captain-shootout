import { describe, expect, it } from 'vitest';
import { geneToUnlock, playerDna, type DnaShot } from './dna';

const START = 0;
const END = 45_000;

/** One shot every `every` ms from `from`, with the given outcomes. */
function shots(from: number, every: number, outcomes: DnaShot['outcome'][]): DnaShot[] {
  return outcomes.map((outcome, i) => ({ firedAt: from + i * every, outcome }));
}

describe('playerDna', () => {
  it('is all zeros for a round without shots', () => {
    expect(playerDna([], START, END)).toEqual({
      accuracy: 0,
      volume: 0,
      rhythm: 0,
      clutch: 0,
      stamina: 0,
    });
  });

  it('scores accuracy, volume and a steady rhythm', () => {
    const dna = playerDna(shots(1000, 1500, Array(30).fill('scored')), START, END);
    expect(dna.accuracy).toBe(100);
    expect(dna.volume).toBe(100);
    expect(dna.rhythm).toBe(100);
  });

  it('clutch only looks at the last 10 seconds', () => {
    const early = shots(1000, 1000, ['scored', 'scored', 'scored']);
    const late = shots(36_000, 2000, ['missed', 'missed', 'scored', 'missed']);
    expect(playerDna([...early, ...late], START, END).clutch).toBe(25);
  });

  it('stamina compares the second half with the first', () => {
    const first = shots(1000, 2000, ['scored', 'scored', 'scored', 'scored']);
    const second = shots(25_000, 2000, ['scored', 'missed', 'scored', 'missed']);
    expect(playerDna([...first, ...second], START, END).stamina).toBe(50);
  });

  it('irregular timing lowers rhythm', () => {
    const uneven = [0, 300, 4000, 4200, 9000].map((t) => ({
      firedAt: t,
      outcome: 'scored' as const,
    }));
    expect(playerDna(uneven, START, END).rhythm).toBeLessThan(50);
  });
});

describe('geneToUnlock', () => {
  it('points at the weakest trait', () => {
    const gene = geneToUnlock({ accuracy: 53, volume: 71, rhythm: 64, clutch: 38, stamina: 82 });
    expect(gene.trait).toBe('clutch');
    expect(gene.name).toBe('Clutch');
  });
});
