import { describe, it, expect } from 'vitest';
import { canImprove, canDownload, canDeepEvaluate, canScan } from '../lib/usage';
import { PLAN_LIMITS } from '../types';

describe('canImprove', () => {
  it('free: allows up to 2', () => {
    expect(canImprove('free', 0)).toBe(true);
    expect(canImprove('free', 1)).toBe(true);
    expect(canImprove('free', 2)).toBe(false);
  });

  it('pro: allows up to 20', () => {
    expect(canImprove('pro', 19)).toBe(true);
    expect(canImprove('pro', 20)).toBe(false);
  });

  it('team: metered, not unlimited', () => {
    expect(canImprove('team', PLAN_LIMITS.team.improvements - 1)).toBe(true);
    expect(canImprove('team', PLAN_LIMITS.team.improvements)).toBe(false);
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
