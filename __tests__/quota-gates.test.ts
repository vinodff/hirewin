import { describe, it, expect } from 'vitest';
import { PLAN_LIMITS, Plan } from '../types';

// Tests the gate logic used in interview-prep and followup/draft routes:
// PLAN_LIMITS[plan].deepEvals === 0 → 403
// PLAN_LIMITS[plan].deepEvals > 0  → allowed
describe('interview-prep / followup-draft plan gate', () => {
  it('blocks free plan', () => {
    expect(PLAN_LIMITS['free'].deepEvals).toBe(0);
  });

  it('blocks starter plan', () => {
    expect(PLAN_LIMITS['starter'].deepEvals).toBe(0);
  });

  it('allows pro plan', () => {
    expect(PLAN_LIMITS['pro'].deepEvals).toBeGreaterThan(0);
  });

  it('allows power plan', () => {
    expect(PLAN_LIMITS['power'].deepEvals).toBeGreaterThan(0);
  });

  it('allows team plan', () => {
    expect(PLAN_LIMITS['team'].deepEvals).toBe(Infinity);
  });
});

// Tests the p_limit translation used before calling try_increment_* RPCs:
// Infinity limits become -1 (sentinel for "no limit" in the SQL function).
describe('atomic RPC p_limit translation', () => {
  function toRpcLimit(raw: number): number {
    return raw === Infinity ? -1 : raw;
  }

  const cases: Array<[Plan, 'improvements' | 'deepEvals' | 'scansPerMonth', number]> = [
    ['free',    'improvements',   2],
    ['starter', 'improvements',   2],
    ['pro',     'improvements',   20],
    ['power',   'improvements',   80],
    ['team',    'improvements',   -1],
    ['free',    'deepEvals',      0],
    ['pro',     'deepEvals',      10],
    ['power',   'deepEvals',      40],
    ['team',    'deepEvals',      -1],
    ['free',    'scansPerMonth',  0],
    ['pro',     'scansPerMonth',  30],
    ['power',   'scansPerMonth',  100],
    ['team',    'scansPerMonth',  -1],
  ];

  for (const [plan, counter, expected] of cases) {
    it(`${plan} ${counter} → p_limit ${expected}`, () => {
      const raw = PLAN_LIMITS[plan][counter];
      expect(toRpcLimit(raw)).toBe(expected);
    });
  }
});
