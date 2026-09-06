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

/** Agent rows shown at most. Beyond this the page stops being scannable. */
const MAX_AGENT_ROWS = 120;

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

/**
 * The list the page renders.
 *
 * The database half is allowed to fail without taking the page down. The sheet
 * (and its committed snapshot) has kept /opportunities working since before the
 * agent existed, so a Supabase outage should cost the page its automated rows,
 * not its existence.
 */
export async function getMergedFeed(): Promise<MergedFeed> {
  const sheet = await getOpportunities();

  const supabase = anonClient();
  if (!supabase) return { ...sheet, agentCount: 0 };

  let records: OpportunityRecord[] = [];
  try {
    const { data, error } = await supabase
      .from('opportunities')
      .select(OPPORTUNITY_COLUMNS)
      // RLS already restricts this to verified + live + unretired rows. Asking
      // again in the query is not redundancy for its own sake: it keeps the
      // intent readable at the call site and lets the partial feed index serve
      // the sort.
      .eq('status', 'verified')
      .order('deadline', { ascending: true, nullsFirst: false })
      .order('discovered_at', { ascending: false })
      .limit(RANKING_POOL);

    if (error) throw new Error(error.message);
    records = (data ?? [])
      .map((row) => fromRow(row as Record<string, unknown>))
      .filter((record): record is OpportunityRecord => record !== null);
  } catch (error) {
    console.error('[opportunities] agent rows unavailable:', (error as Error).message);
    return { ...sheet, agentCount: 0 };
  }

  const now = new Date();
  const seen = new Set(sheet.opportunities.map((o) => mergeKey(o.company, o.title)));

  // Rank first, cut second. Deduplication against the sheet happens in ranked
  // order so that when a curated row displaces an agent one, the slot goes to
  // the next best find rather than being lost.
  const agentCards: Opportunity[] = [];
  for (const { opportunity: record } of rankOpportunities(records, now)) {
    if (agentCards.length >= MAX_AGENT_ROWS) break;
    const key = mergeKey(record.organization, record.title);
    if (seen.has(key)) continue; // the curated row already covers it
    seen.add(key);
    agentCards.push(toCard(record, now));
  }

  const opportunities = [...sheet.opportunities, ...agentCards].sort(
    (a, b) =>
      URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency] ||
      (a.daysLeft ?? Number.MAX_SAFE_INTEGER) - (b.daysLeft ?? Number.MAX_SAFE_INTEGER) ||
      a.company.localeCompare(b.company)
  );

  return { opportunities, isStale: sheet.isStale, agentCount: agentCards.length };
}

// Exported for tests: the projection and the merge key are pure, and they are
// where the sheet/agent boundary is actually decided.
export const __internal = { toCard, mergeKey, statusOf, urgencyOf };
