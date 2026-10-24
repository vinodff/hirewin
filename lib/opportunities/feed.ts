/**
 * The public feed — one list, two origins.
 *
 * The Google Sheet is not being retired. It is the hand-curated half: rows a
 * human chose, with comp figures and notes no crawler would produce, and it
 * stays the fastest way to put something on the board. The agent supplies
 * volume around it.
 *
 * Where they disagree, the sheet wins. A hand-entered row is a decision; an
 * agent row is a find. That ordering also means a bad agent run can never
 * displace curated content — the worst it can do is add less.
 *
 * Both halves are projected into the same `Opportunity` shape the browser
 * already renders, so the UI needs no knowledge of where a card came from.
 */

import { createClient } from '@supabase/supabase-js';
import { getOpportunities, type Opportunity, type OpportunityFeed, type Urgency } from './sheet';
import { fromRow, OPPORTUNITY_COLUMNS } from './records';
import { daysUntil, rankOpportunities } from './score';
import { KIND_LABELS, type OpportunityRecord } from './types';

/** Agent rows shown at most. High volume catalog for freshers and students. */
const MAX_AGENT_ROWS = 200;

/**
 * Rows fetched before ranking cuts them down to MAX_AGENT_ROWS.
 *
 * Deliberately larger than the cap, because otherwise the cap and the ranking
 * fight each other: taking the first 120 by deadline and THEN ranking only
 * reorders a selection the database already made on one column. Fetching a
 * wider set and letting scoreOpportunity choose means source trust, urgency,
 * kind and freshness all get a say in which rows survive — which is the whole
 * reason the score exists.
 */
const RANKING_POOL = 400;

/**
 * Read-only anon client.
 *
 * Deliberately NOT the service client: the RLS policy in 013 is the thing that
 * guarantees only verified, live, unretired rows are public, and reading the
 * feed through the anon key is what keeps that guarantee load-bearing rather
 * than decorative. A service-role read here would bypass the policy and mean a
 * `pending` row could reach the page through an application bug.
 */
function anonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Bucket a record the same way sheet.ts buckets its free-text Status column. */
function urgencyOf(days: number | null): Urgency {
  if (days === null) return 'open';
  if (days < 0) return 'stale';
  if (days <= 7) return 'closing';
  return 'open';
}

/**
 * Status line for an agent row.
 *
 * The sheet's Status is free text a human wrote. There is no equivalent here,
 * so it is composed from what the pipeline actually established — and an
 * aggregator listing says so, per the tier's "second-hand" meaning in
 * sources.ts. Claiming more certainty than the source tier supports is the one
 * thing this string must never do.
 */
function statusOf(record: OpportunityRecord, days: number | null): string {
  if (days !== null && days < 0) return 'Closed';
  if (days !== null && days <= 7) return 'Closing soon';
  if (record.sourceTier === 'aggregator') return 'Open · confirm on employer site';
  return 'Open';
}

/**
 * Project a stored row into the shape the card renders.
 *
 * `category` deserves a note. The browser folds type and category into one
 * filter row and drops any category that merely restates a type, so setting
 * category to the type label adds no chip. Remote is the one distinction worth
 * a chip of its own to someone job-hunting from a tier-2 town, so that is the
 * only case that gets one.
 */
function toCard(record: OpportunityRecord, now: Date): Opportunity {
  const days = daysUntil(record.deadline, now);
  const type = KIND_LABELS[record.kind];

  const notes: string[] = [];
  if (record.location) notes.push(record.location);
  if (record.postedAt) notes.push(`Posted ${record.postedAt}`);

  return {
    id: `agent-${record.id}`,
    company: record.organization,
    category: record.workMode === 'remote' ? 'Remote' : type,
    type,
    title: record.title,
    url: record.applyUrl,
    deadline: record.deadline,
    deadlineIso: record.deadline ? `${record.deadline}T00:00:00.000Z` : null,
    daysLeft: days,
    status: statusOf(record, days),
    urgency: urgencyOf(days),
    // Comp is a price tag on this card, so the published figure gets the slot
    // when there is one and the description only fills in when there is not.
    benefits: record.compensation ?? record.description ?? null,
    notes: notes.length > 0 ? notes.join(' · ') : null,
    location: record.location ?? null,
    workMode: record.workMode ?? null,
    skills: record.skills ?? [],
    eligibility: record.eligibility ?? null,
    source: record.applyUrl.includes('unstop.com')
      ? 'Unstop'
      : record.sourceTier === 'official'
        ? 'Direct ATS'
        : 'Verified Direct Link',
    verified: record.status === 'verified',
    compensation: record.compensation ?? null,
    isFresher:
      record.kind === 'internship' ||
      record.kind === 'hackathon' ||
      record.kind === 'competition' ||
      /fresher|graduate|intern|trainee|entry[\s-]level|junior|associate|0\s*-\s*1|0\s*yoe|0\s*years?|campus|college|batch|2024|2025|2026|2027|2028|get\b|mt\b/i.test(
        `${record.title} ${record.eligibility ?? ''} ${record.description ?? ''}`
      ),
    batchEligibility: (() => {
      const text = `${record.title} ${record.eligibility ?? ''} ${record.description ?? ''}`;
      const matches = text.match(/\b(202[4-8])\b/g);
      const unique = matches ? Array.from(new Set(matches)).sort() : [];
      return unique.length > 0 ? `Batches ${unique.join(' · ')}` : null;
    })(),
    experienceLevel:
      record.kind === 'internship'
        ? '0 YOE (College Students)'
        : '0-1 Years (Freshers & College)',
  };
}

/** Company + title, normalised — the key the two halves are merged on. */
function mergeKey(company: string, title: string): string {
  const norm = (value: string) =>
    value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\b(20\d{2}|batch|hiring|apply|now|off\s*campus)\b/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .sort()
      .join(' ');
  return `${norm(company)}::${norm(title)}`;
}

/** Closing first, dead last — the sheet's ordering, applied to the merged list. */
const URGENCY_ORDER: Record<Urgency, number> = { closing: 0, open: 1, upcoming: 2, stale: 3 };

export type MergedFeed = OpportunityFeed & {
  /** How many cards came from the agent rather than the sheet. */
  agentCount: number;
};

/** Load cached verified records from disk when Supabase is paused or unreachable. */
function loadCachedRecords(): OpportunityRecord[] {
  try {
    // Dynamic import to avoid build errors if file isn't present
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const cache = require('./live-feed-cache.json');
    if (Array.isArray(cache?.records)) {
      return cache.records as OpportunityRecord[];
    }
  } catch {
    // Cache file missing or unparseable
  }
  return [];
}

/**
 * The list the page renders.
 *
 * The database half is allowed to fail without taking the page down. When Supabase
 * is unreachable, the pipeline falls back to the dynamic verified local cache,
 * ensuring students ALWAYS see verified, active, non-expired opportunities from
 * Unstop and direct employer ATS boards.
 */
export async function getMergedFeed(): Promise<MergedFeed> {
  const sheet = await getOpportunities();

  const supabase = anonClient();
  let records: OpportunityRecord[] = [];

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('opportunities')
        .select(OPPORTUNITY_COLUMNS)
        .eq('status', 'verified')
        .order('deadline', { ascending: true, nullsFirst: false })
        .order('discovered_at', { ascending: false })
        .limit(RANKING_POOL);

      if (!error && data && data.length > 0) {
        records = data
          .map((row) => fromRow(row as Record<string, unknown>))
          .filter((record): record is OpportunityRecord => record !== null);
      }
    } catch {
      // Supabase unavailable; fall through to cache
    }
  }

  // If Supabase returned nothing or was unreachable, load from verified live cache
  if (records.length === 0) {
    records = loadCachedRecords();
  }

  const now = new Date();

  // Deduplicate and rank verified live agent records
  const agentCards: Opportunity[] = [];
  const seen = new Set<string>();

  for (const { opportunity: record } of rankOpportunities(records, now)) {
    if (agentCards.length >= MAX_AGENT_ROWS) break;
    const key = mergeKey(record.organization, record.title);
    if (seen.has(key)) continue;
    seen.add(key);
    agentCards.push(toCard(record, now));
  }

  // Filter out any obsolete Google Sheet rows:
  // Must have a valid HTTP URL, no past deadlines, no tombstone statuses, and no dead search placeholders
  const cleanSheetOps = sheet.opportunities.filter((o) => {
    if (!o.url || !o.url.startsWith('http')) return false;
    if (o.daysLeft !== null && o.daysLeft < 0) return false;
    // Filter out past 2026 dates or unverified statuses
    if (o.deadline && /2026-0[1-9]/i.test(o.deadline)) return false;
    if (o.notes && /posted date unknown|check page/i.test(o.notes)) return false;
    if (o.status && /verify|possibly closed|closed|not yet open/i.test(o.status)) return false;
    // Don't duplicate anything already covered by verified live findings
    const key = mergeKey(o.company, o.title);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const opportunities = [...agentCards, ...cleanSheetOps].sort(
    (a, b) =>
      URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency] ||
      (a.daysLeft ?? Number.MAX_SAFE_INTEGER) - (b.daysLeft ?? Number.MAX_SAFE_INTEGER) ||
      a.company.localeCompare(b.company)
  );

  return {
    opportunities,
    isStale: sheet.isStale && agentCards.length === 0,
    agentCount: agentCards.length,
  };
}

// Exported for tests: the projection and the merge key are pure, and they are
// where the sheet/agent boundary is actually decided.
export const __internal = { toCard, mergeKey, statusOf, urgencyOf };
