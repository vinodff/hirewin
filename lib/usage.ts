import { Plan, PlanLimits, PLAN_LIMITS, ADMIN_LIMITS } from '@/types';
import { isAdminEmail } from '@/lib/admin-emails';

export function getPlanLimits(plan: Plan): PlanLimits {
  return PLAN_LIMITS[plan];
}

/**
 * The limits that actually apply to a request.
 *
 * Single resolution point for the admin testing bypass: every quota gate reads
 * its ceiling from here, so admin access can never be enforced inconsistently
 * across routes. `email` MUST come from supabase.auth.getUser() on the server —
 * an email from a request body would make this a trivial paywall bypass.
 */
export function getEffectiveLimits(plan: Plan, email?: string | null): PlanLimits {
  if (isAdminEmail(email)) return ADMIN_LIMITS;
  return PLAN_LIMITS[plan];
}

/** True when this session bypasses quotas and rate limits entirely. */
export function isUnlimitedSession(email?: string | null): boolean {
  return isAdminEmail(email);
}

/** True when the plan or session has paid-tier access to premium features. */
export function isPaidUserPlan(plan: Plan, email?: string | null): boolean {
  if (isUnlimitedSession(email)) return true;
  return plan !== 'free';
}

export function canImprove(plan: Plan, improvementsUsed: number, email?: string | null): boolean {
  if (process.env.USAGE_LIMITS_DISABLED === 'true') return true;
  const limits = getEffectiveLimits(plan, email);
  return limits.improvements === Infinity || improvementsUsed < limits.improvements;
}

export function canDownload(plan: Plan, downloadsUsed: number, email?: string | null): boolean {
  if (process.env.DOWNLOAD_LIMITS_DISABLED === 'true') return true;
  const limits = getEffectiveLimits(plan, email);
  if (limits.downloads === 0) return false;
  if (limits.downloads === Infinity) return true;
  return downloadsUsed < limits.downloads;
}

export function canGenerateRoadmap(plan: Plan, roadmapsUsed: number, email?: string | null): boolean {
  const limits = getEffectiveLimits(plan, email);
  return limits.roadmaps === Infinity || roadmapsUsed < limits.roadmaps;
}

export function canDeepEvaluate(plan: Plan, deepEvalsUsed: number, email?: string | null): boolean {
  const limits = getEffectiveLimits(plan, email);
  if (limits.deepEvals === 0) return false;
  return limits.deepEvals === Infinity || deepEvalsUsed < limits.deepEvals;
}

export function canScan(plan: Plan, scansUsed: number, email?: string | null): boolean {
  const limits = getEffectiveLimits(plan, email);
  if (limits.scansPerMonth === 0) return false;
  return limits.scansPerMonth === Infinity || scansUsed < limits.scansPerMonth;
}

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export const PLAN_PRICES = {
  // Launch prices, shown against list prices. The 3-pack is the intended
  // default: it is what makes the free tier pay for itself at a realistic
  // conversion rate (~5% vs ~40% on the single download alone).
  starter: { one_time_paise: 1900, mrp_paise: 4500, label: '₹19 one-time' },
  pack3: { one_time_paise: 4900, mrp_paise: 13500, label: '₹49 one-time' },
  pro: { monthly_paise: 19900, yearly_paise: 199000, label: '₹199/mo' },
  power: { monthly_paise: 39900, yearly_paise: 399000, label: '₹399/mo' },
};
