/**
 * Ranking.
 *
 * Adapted from BVCITS 2.0, with its largest component removed. That version
 * scored against a signed-in student's department, because it ran inside a
 * college portal where every reader had a known branch. HireWin's
 * /opportunities page is public and anonymous — there is no profile to match
 * against at read time, so a `profile` term would score every row identically
 * and only add a number nobody could act on.
 *
 * What is left is the part that was always audience-independent: how soon it
 * closes, how much the source can be trusted, what kind of thing it is, and how
 * recently it was found. Every component is bounded and the breakdown is
 * returned alongside the total, so the ordering can be explained rather than
 * presented as a magic number.
 */

import { TIER_WEIGHT } from './sources';
import type { OpportunityKind, OpportunityRecord } from './types';

/** How much a kind is worth, before any other signal. */
const KIND_WEIGHT: Record<OpportunityKind, number> = {
  internship: 15,
  job: 15,
  hackathon: 12,
  scholarship: 12,
  fellowship: 12,
  competition: 10,
  ambassador: 10,
  workshop: 8,
  event: 7,
  webinar: 6,
};

export interface ScoreBreakdown {
  source: number;
  urgency: number;
  kind: number;
  freshness: number;
}

export interface ScoredOpportunity {
  total: number;
  breakdown: ScoreBreakdown;
  /** Short reasons the card can show: "Closes in 3 days", "Official source". */
  reasons: string[];
}

/**
 * Whole days from `now` until `deadline`; null when there is no deadline.
 *
 * Compares calendar days rather than subtracting instants. Doing it by instant
 * makes a deadline of *today* come out as a fraction that rounds to 1 — so the
 * last day of an application window would announce itself as "closes in 1 day"
 * and never as "closes today", in the one feature whose entire promise is that
 * the reader does not miss the deadline.
 */
export function daysUntil(deadline: string | null | undefined, now: Date): number | null {
  if (!deadline) return null;
  const parsed = new Date(`${deadline}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;

  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((parsed.getTime() - today) / 86_400_000);
}

/**
 * Urgency is front-loaded on purpose.
 *
 * The promise is "never miss a deadline", so a posting closing in two days must
 * outrank a better-matched one closing in three months — the second can still
 * be acted on tomorrow.
 */
function urgencyPoints(days: number | null): number {
  if (days === null) return 4;
  if (days < 0) return 0;
  if (days <= 3) return 20;
  if (days <= 7) return 17;
  if (days <= 14) return 13;
  if (days <= 30) return 9;
  if (days <= 60) return 6;
  return 3;
}

/** Recently discovered rows rank slightly higher — the feed should feel live. */
function freshnessPoints(discoveredAt: string, now: Date): number {
  const parsed = new Date(discoveredAt);
  if (Number.isNaN(parsed.getTime())) return 0;
  const ageDays = (now.getTime() - parsed.getTime()) / 86_400_000;
  if (ageDays <= 3) return 10;
  if (ageDays <= 7) return 7;
  if (ageDays <= 30) return 3;
  return 0;
}

export function scoreOpportunity(
  opportunity: OpportunityRecord,
  now: Date = new Date()
): ScoredOpportunity {
  const days = daysUntil(opportunity.deadline, now);

  const breakdown: ScoreBreakdown = {
    source: TIER_WEIGHT[opportunity.sourceTier],
    urgency: urgencyPoints(days),
    kind: KIND_WEIGHT[opportunity.kind],
    freshness: freshnessPoints(opportunity.discoveredAt, now),
  };

  const total = Math.min(
    100,
    breakdown.source + breakdown.urgency + breakdown.kind + breakdown.freshness
  );

  const reasons: string[] = [];
  if (days !== null && days >= 0 && days <= 7) {
    reasons.push(days === 0 ? 'Closes today' : `Closes in ${days} day${days === 1 ? '' : 's'}`);
  }
  if (opportunity.sourceTier === 'official') {
    reasons.push('Official source');
  }
  if (opportunity.corroborations > 1) {
    reasons.push(`Seen on ${opportunity.corroborations} sources`);
  }

  return { total, breakdown, reasons };
}

/** Highest score first; ties broken by the nearer deadline. */
export function rankOpportunities(
  opportunities: readonly OpportunityRecord[],
  now: Date = new Date()
): { opportunity: OpportunityRecord; score: ScoredOpportunity }[] {
  return opportunities
    .map((opportunity) => ({ opportunity, score: scoreOpportunity(opportunity, now) }))
    .sort((a, b) => {
      if (b.score.total !== a.score.total) return b.score.total - a.score.total;
      const aDays = daysUntil(a.opportunity.deadline, now) ?? Number.MAX_SAFE_INTEGER;
      const bDays = daysUntil(b.opportunity.deadline, now) ?? Number.MAX_SAFE_INTEGER;
      return aDays - bDays;
    });
}
