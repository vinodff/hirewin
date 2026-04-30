import { Plan, PlanLimits, PLAN_LIMITS } from '@/types';

export function getPlanLimits(plan: Plan): PlanLimits {
  return PLAN_LIMITS[plan];
}

export function canImprove(plan: Plan, improvementsUsed: number): boolean {
  if (process.env.USAGE_LIMITS_DISABLED === 'true') return true;
  const limits = getPlanLimits(plan);
  return limits.improvements === Infinity || improvementsUsed < limits.improvements;
}

export function canDownload(plan: Plan, downloadsUsed: number): boolean {
  if (process.env.DOWNLOAD_LIMITS_DISABLED === 'true') return true;
  const limits = getPlanLimits(plan);
  if (limits.downloads === 0) return false;
  if (limits.downloads === Infinity) return true;
  return downloadsUsed < limits.downloads;
}

export function canGenerateRoadmap(plan: Plan, roadmapsUsed: number): boolean {
  const limits = getPlanLimits(plan);
  return limits.roadmaps === Infinity || roadmapsUsed < limits.roadmaps;
}

export function canDeepEvaluate(plan: Plan, deepEvalsUsed: number): boolean {
  const limits = getPlanLimits(plan);
  if (limits.deepEvals === 0) return false;
  return limits.deepEvals === Infinity || deepEvalsUsed < limits.deepEvals;
}

export function canScan(plan: Plan, scansUsed: number): boolean {
  const limits = getPlanLimits(plan);
  if (limits.scansPerMonth === 0) return false;
  return limits.scansPerMonth === Infinity || scansUsed < limits.scansPerMonth;
}

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export const PLAN_PRICES = {
  starter: { one_time_paise: 9900, label: '₹99 one-time' },
  pro: { monthly_paise: 19900, yearly_paise: 199000, label: '₹199/mo' },
  power: { monthly_paise: 39900, yearly_paise: 399000, label: '₹399/mo' },
};
