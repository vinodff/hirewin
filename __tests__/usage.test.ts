import { describe, it, expect } from 'vitest';
import { canImprove, canDownload, canDeepEvaluate, canScan } from '../lib/usage';
import { PLAN_LIMITS } from '../types';

describe('canImprove', () => {
  // Rewriting is now unmetered on every plan. The product's pitch is "free
  // unlimited optimizations — pay only to download", and the cap contradicted
  // it: free allowed 2 a month while an anonymous visitor got roughly 150, so
  // creating an account made the product worse. Metering moved entirely to
  // downloads, which is what canDownload below still asserts.
  it('free: never blocked, however many rewrites', () => {
    expect(canImprove('free', 0)).toBe(true);
    expect(canImprove('free', 2)).toBe(true);
    expect(canImprove('free', 10_000)).toBe(true);
  });

  it('paid plans are not metered on rewrites either', () => {
    // A paid tier capped below free would recreate the same inversion.
    expect(canImprove('pro', 10_000)).toBe(true);
    expect(canImprove('team', 10_000)).toBe(true);
  });

  it('every plan declares rewrites unlimited', () => {
    // Guards the invariant at the table rather than one plan at a time: a new
    // tier with a finite cap fails here instead of in production.
    for (const plan of Object.keys(PLAN_LIMITS) as (keyof typeof PLAN_LIMITS)[]) {
      expect(PLAN_LIMITS[plan].improvements).toBe(Infinity);
    }
  });
});

describe('canDeepEvaluate', () => {
  it('free: disallowed', () => {
    expect(canDeepEvaluate('free', 0)).toBe(false);
  });

  it('pro: allows up to 10', () => {
    expect(canDeepEvaluate('pro', 0)).toBe(true);
    expect(canDeepEvaluate('pro', 9)).toBe(true);
    expect(canDeepEvaluate('pro', 10)).toBe(false);
  });

  it('team: metered, not unlimited', () => {
    expect(canDeepEvaluate('team', PLAN_LIMITS.team.deepEvals - 1)).toBe(true);
    expect(canDeepEvaluate('team', PLAN_LIMITS.team.deepEvals)).toBe(false);
  });
});

describe('canScan', () => {
  it('free: disallowed', () => {
    expect(canScan('free', 0)).toBe(false);
  });

  it('starter: disallowed', () => {
    expect(canScan('starter', 0)).toBe(false);
  });

  // Scans are our costliest call — every plan is capped.
  it('pro: allows up to 10/month', () => {
    expect(canScan('pro', 0)).toBe(true);
    expect(canScan('pro', 9)).toBe(true);
    expect(canScan('pro', 10)).toBe(false);
  });

  it('power: allows up to 25/month', () => {
    expect(canScan('power', 24)).toBe(true);
    expect(canScan('power', 25)).toBe(false);
  });

  it('team: metered, not unlimited', () => {
    expect(canScan('team', PLAN_LIMITS.team.scansPerMonth)).toBe(false);
  });
});

describe('canDownload', () => {
  it('free: no downloads', () => {
    expect(canDownload('free', 0)).toBe(false);
  });

  it('starter: 1 download', () => {
    expect(canDownload('starter', 0)).toBe(true);
    expect(canDownload('starter', 1)).toBe(false);
  });

  it('pack3: 3 downloads', () => {
    expect(canDownload('pack3', 2)).toBe(true);
    expect(canDownload('pack3', 3)).toBe(false);
  });

  it('pro: unlimited', () => {
    expect(canDownload('pro', 9999)).toBe(true);
  });
});

describe('PLAN_LIMITS', () => {
  it('all plans are defined', () => {
    const plans = ['free', 'starter', 'pack3', 'pro', 'power', 'team'] as const;
    for (const plan of plans) {
      expect(PLAN_LIMITS[plan]).toBeDefined();
    }
  });
});
