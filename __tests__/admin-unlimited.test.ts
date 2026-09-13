import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getEffectiveLimits,
  isUnlimitedSession,
  canImprove,
  canDownload,
  canScan,
  canDeepEvaluate,
  canGenerateRoadmap,
} from '@/lib/usage';
import { isAdminEmail } from '@/lib/admin-emails';
import { PLAN_LIMITS, type Plan } from '@/types';

// A stand-in. The real admin list lives in ADMIN_EMAILS, never in the repo —
// committing it would advertise which account bypasses the paywall.
const ADMIN = 'admin@example.test';
const original = process.env.ADMIN_EMAILS;

beforeEach(() => { process.env.ADMIN_EMAILS = ADMIN; });
afterEach(() => {
  if (original === undefined) delete process.env.ADMIN_EMAILS;
  else process.env.ADMIN_EMAILS = original;
});

describe('admin email matching', () => {
  it('matches the configured admin', () => {
    expect(isAdminEmail(ADMIN)).toBe(true);
  });

  it('is case-insensitive — Google addresses arrive in mixed case', () => {
    expect(isAdminEmail('Admin@Example.TEST')).toBe(true);
  });

  it('handles a comma-separated list with whitespace', () => {
    process.env.ADMIN_EMAILS = ` a@x.com , ${ADMIN} ,b@y.com `;
    expect(isAdminEmail(ADMIN)).toBe(true);
    expect(isAdminEmail('a@x.com')).toBe(true);
  });

  it('rejects everyone else', () => {
    for (const e of ['someone@else.com', 'admin@example.test.evil.com', 'x@gmail.com']) {
      expect(isAdminEmail(e), e).toBe(false);
    }
  });

  it('rejects empty, null and undefined rather than matching', () => {
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
    expect(isAdminEmail('')).toBe(false);
  });

  it('grants nobody access when ADMIN_EMAILS is unset', () => {
    delete process.env.ADMIN_EMAILS;
    expect(isAdminEmail(ADMIN)).toBe(false);
    expect(isUnlimitedSession(ADMIN)).toBe(false);
  });

  it('an empty ADMIN_EMAILS does not match the empty string', () => {
    process.env.ADMIN_EMAILS = '';
    expect(isAdminEmail('')).toBe(false);
  });
});

describe('admin bypasses every quota', () => {
  const plans: Plan[] = ['free', 'starter', 'pack3', 'pro', 'power', 'team'];

  it.each(plans)('is unlimited on every axis regardless of the %s plan', (plan) => {
    const limits = getEffectiveLimits(plan, ADMIN);
    expect(limits.improvements).toBe(Infinity);
    expect(limits.downloads).toBe(Infinity);
    expect(limits.roadmaps).toBe(Infinity);
    expect(limits.deepEvals).toBe(Infinity);
    expect(limits.scansPerMonth).toBe(Infinity);
  });

  it('passes every gate at absurd usage counts, even on the free plan', () => {
    const huge = 999_999;
    expect(canImprove('free', huge, ADMIN)).toBe(true);
    expect(canDownload('free', huge, ADMIN)).toBe(true);
    expect(canScan('free', huge, ADMIN)).toBe(true);
    expect(canDeepEvaluate('free', huge, ADMIN)).toBe(true);
    expect(canGenerateRoadmap('free', huge, ADMIN)).toBe(true);
  });

  it('gets long history retention', () => {
    expect(getEffectiveLimits('free', ADMIN).historyMonths).toBeGreaterThan(
      PLAN_LIMITS.team.historyMonths
    );
  });
});

describe('the bypass does not leak to normal users', () => {
  it('a non-admin still gets their plan limits exactly', () => {
    expect(getEffectiveLimits('free', 'someone@else.com')).toEqual(PLAN_LIMITS.free);
    expect(getEffectiveLimits('pro', 'someone@else.com')).toEqual(PLAN_LIMITS.pro);
  });

  it('no email means no bypass — the free tier still has zero downloads', () => {
    expect(getEffectiveLimits('free', undefined)).toEqual(PLAN_LIMITS.free);
    expect(canDownload('free', 0)).toBe(false);
    expect(canDownload('free', 0, null)).toBe(false);
  });

  it('rewrites are unlimited for everyone, admin or not', () => {
    // The free tier used to stop at 2 while an anonymous visitor got ~150 a
    // month, so signing up was a downgrade. Rewriting is the hook now; the
    // gate that matters moved to downloads, asserted directly below.
    expect(canImprove('free', 2, 'someone@else.com')).toBe(true);
    expect(canImprove('free', 9999, 'someone@else.com')).toBe(true);
  });

  it('a non-admin free user still cannot download — that is the real gate', () => {
    // This is what the previous test was really protecting: that a normal user
    // gets no paid capability. Downloads are where the product is sold, so the
    // assertion belongs on downloads rather than on a cap that no longer exists.
    expect(canDownload('free', 0, 'someone@else.com')).toBe(false);
    expect(canDownload('free', 99, 'someone@else.com')).toBe(false);
  });

  it('scan caps still hold for paying plans', () => {
    expect(canScan('pro', PLAN_LIMITS.pro.scansPerMonth, 'someone@else.com')).toBe(false);
  });

  it('a lookalike email does not inherit admin access', () => {
    expect(canDownload('free', 99, 'admin@example.testx')).toBe(false);
  });
});
