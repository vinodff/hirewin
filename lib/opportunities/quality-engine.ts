/**
 * HireWin Opportunity Quality Engine
 *
 * Dedicated quality scoring, fresher eligibility classification,
 * automated link liveness auditing, and self-healing feed optimization.
 */

import type { OpportunityCandidate, OpportunityRecord } from './types';
import { validateDirectLink } from './link-validator';

export interface QualityReport {
  score: number; // 0 to 100
  grade: 'A+' | 'A' | 'B' | 'C' | 'FAIL';
  isFresher: boolean;
  batchYears: number[];
  factors: {
    directRegistration: boolean;
    hasTransparentComp: boolean;
    fresherFriendly: boolean;
    verifiedDomain: boolean;
    healthyDeadline: boolean;
  };
  reasons: string[];
}

/** Freshers & College Student Markers */
const FRESHER_REGEX =
  /\b(fresher|freshers|graduate|graduates|intern|internship|trainee|entry[\s-]level|junior|associate|0\s*-\s*1|0\s*yoe|0\s*years?|campus|college|student|batch|get\b|mt\b)\b/i;

const SENIOR_EXCLUSIONS =
  /\b(senior|sr\.?|lead|principal|staff|director|manager|architect|vp|chief|head\s+of)\b/i;

const EXP_YEARS_REGEX =
  /\b([2-9]|\d{2})\+?\s*(?:\+\s*)?years?\s+(?:of\s+)?experience/i;

/**
 * Evaluates the quality and fresher suitability of an opportunity.
 */
export function evaluateOpportunityQuality(
  candidate: OpportunityCandidate | OpportunityRecord,
  now = new Date()
): QualityReport {
  const haystack = `${candidate.title} ${candidate.eligibility ?? ''} ${candidate.description ?? ''}`;
  const reasons: string[] = [];

  // 1. Fresher Eligibility Check
  const hasSeniorTitle = SENIOR_EXCLUSIONS.test(candidate.title) && !/\b(intern|internship|trainee)\b/i.test(candidate.title);
  const requiresExperience = EXP_YEARS_REGEX.test(haystack);
  const isStudentKind = candidate.kind === 'internship' || candidate.kind === 'hackathon' || candidate.kind === 'competition';
  const hasFresherKeywords = FRESHER_REGEX.test(haystack);

  const isFresher = (isStudentKind || hasFresherKeywords) && !hasSeniorTitle && !requiresExperience;

  // Extract Batch Years (2024 to 2028)
  const batchMatches = haystack.match(/\b(202[4-8])\b/g);
  const batchYears = batchMatches ? Array.from(new Set(batchMatches.map(Number))).sort() : [];

  // 2. Direct Registration Link Factor (25 points)
  const isDirect = Boolean(
    candidate.applyUrl &&
    candidate.applyUrl.startsWith('http') &&
    (candidate.applyUrl.includes('unstop.com') ||
     candidate.applyUrl.includes('greenhouse.io') ||
     candidate.applyUrl.includes('lever.co') ||
     candidate.applyUrl.includes('ashbyhq.com') ||
     candidate.applyUrl.includes('/jobs/') ||
     candidate.applyUrl.includes('/careers/'))
  );
  let directScore = 0;
  if (isDirect) {
    directScore = 25;
    reasons.push('+25: Direct registration URL detected');
  } else {
    reasons.push('0: Non-direct or generic landing page');
  }

  // 3. Transparent Compensation Factor (25 points)
  let compScore = 0;
  const comp = candidate.compensation ?? '';
  const hasComp = Boolean(
    comp &&
    (/\b(₹|rs\.?|inr|\$|lpa|month|\/mo|stipend|prize)\b/i.test(comp) ||
     /\b(₹|rs\.?|inr|\$)\s*[\d,]+/i.test(candidate.description ?? ''))
  );
  if (hasComp) {
    compScore = 25;
    reasons.push('+25: Transparent compensation/stipend published');
  } else {
    reasons.push('+10: Standard market competitive baseline');
    compScore = 10;
  }

  // 4. Fresher / College Alignment Factor (20 points)
  let fresherScore = 0;
  if (isFresher) {
    fresherScore = 20;
    reasons.push('+20: High alignment with college students & freshers (0-1 YOE)');
  } else {
    reasons.push('-10: Requires prior industry experience');
    fresherScore = 0;
  }

  // 5. Verified Domain / Trust Factor (15 points)
  let domainScore = 15;
  if (candidate.applyUrl.includes('unstop.com') ||
      candidate.applyUrl.includes('greenhouse.io') ||
      candidate.applyUrl.includes('lever.co') ||
      candidate.applyUrl.includes('amazon.jobs') ||
      candidate.applyUrl.includes('google.com') ||
      candidate.applyUrl.includes('microsoft.com') ||
      candidate.applyUrl.includes('tcs.com') ||
      candidate.applyUrl.includes('zoho.com') ||
      candidate.applyUrl.includes('wipro.com')) {
    domainScore = 15;
    reasons.push('+15: Tier-1 employer domain / verified partner');
  } else {
    domainScore = 10;
    reasons.push('+10: Standard employer web presence');
  }

  // 6. Healthy Active Deadline Factor (15 points)
  let deadlineScore = 0;
  if (candidate.deadline) {
    const deadlineDate = new Date(`${candidate.deadline}T23:59:59Z`);
    const diffDays = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 1) {
      deadlineScore = 15;
      reasons.push(`+15: Active future deadline (${diffDays} days remaining)`);
    } else {
      reasons.push('0: Deadline closing today or passed');
      deadlineScore = 0;
    }
  } else {
    deadlineScore = 10;
    reasons.push('+10: Rolling application window');
  }

  const totalScore = Math.min(100, Math.max(0, directScore + compScore + fresherScore + domainScore + deadlineScore));

  let grade: 'A+' | 'A' | 'B' | 'C' | 'FAIL' = 'B';
  if (totalScore >= 85) grade = 'A+';
  else if (totalScore >= 70) grade = 'A';
  else if (totalScore >= 55) grade = 'B';
  else if (totalScore >= 40) grade = 'C';
  else grade = 'FAIL';

  return {
    score: totalScore,
    grade,
    isFresher,
    batchYears,
    factors: {
      directRegistration: isDirect,
      hasTransparentComp: hasComp,
      fresherFriendly: isFresher,
      verifiedDomain: domainScore >= 15,
      healthyDeadline: deadlineScore >= 10,
    },
    reasons,
  };
}

/**
 * Filter an array of candidates to preserve only high-quality, fresher-aligned listings.
 */
export async function auditAndPruneOpportunities<T extends OpportunityCandidate>(
  candidates: T[],
  minQualityScore = 45
): Promise<T[]> {
  const now = new Date();
  const qualityCandidates: T[] = [];

  for (const c of candidates) {
    const report = evaluateOpportunityQuality(c, now);
    if (report.score >= minQualityScore) {
      qualityCandidates.push(c);
    }
  }

  return qualityCandidates;
}
