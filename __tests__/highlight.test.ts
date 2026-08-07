import { describe, it, expect } from 'vitest';
import { splitHighlight } from '@/lib/opportunities';

describe('splitHighlight', () => {
  it('lifts the figure out of a prose benefit string', () => {
    expect(splitHighlight('~$60.58/hr + housing, 1:1 lead + mentor pairing')).toEqual({
      value: '~$60.58/hr',
      rest: 'housing, 1:1 lead + mentor pairing',
    });
  });

  it('handles rupee ranges and LPA', () => {
    expect(splitHighlight('Rs.4.5-6.5 LPA; Advanced ASE, 5-stage selection').value).toBe('Rs.4.5-6.5 LPA');
    expect(splitHighlight('Rs.6.33 LPA; via Superset portal')).toEqual({
      value: 'Rs.6.33 LPA',
      rest: 'via Superset portal',
    });
  });

  it('falls back to a duration when no money is published', () => {
    expect(splitHighlight('12 weeks, Aug/Sept 2026 start').value).toBe('12 weeks');
    expect(splitHighlight('12-week paid placement').value).toBe('12-week');
  });

  it('does not mistake a calendar year for a figure', () => {
    // "Grad Dec 2026-June 2027" is eligibility, not compensation. Highlighting it
    // would put a fake price tag on the card.
    expect(splitHighlight('Grad Dec 2026-June 2027 eligibility, hybrid').value).toBeNull();
  });

  it('leaves a benefit with no figure entirely as prose', () => {
    expect(splitHighlight('AWS team placement')).toEqual({ value: null, rest: 'AWS team placement' });
    expect(splitHighlight('Certificates/cash prizes (standard Unstop format)').value).toBeNull();
  });

  it('never drops content: value plus rest covers the whole string', () => {
    for (const s of [
      '$147k-$211k base + 15% bonus + equity',
      '$20,500 total prizes; Grand Prize $6,000 + LinkedIn badge',
      '$27.48/hr, project work, training, networking events',
      'Min. 12 weeks, BS/MS/PhD/MBA eligible',
    ]) {
      const { value, rest } = splitHighlight(s);
      const words = (t: string) => t.replace(/[^a-z0-9]/gi, '').toLowerCase();
      expect(words(`${value ?? ''}${rest}`).length).toBe(words(s).length);
    }
  });
});
