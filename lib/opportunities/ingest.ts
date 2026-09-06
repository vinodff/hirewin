/**
 * The shared tail of every discovery channel: verify → dedupe → upsert.
 *
 * Both channels produce `OpportunityCandidate`s and neither may decide for
 * itself what reaches the page. Keeping the row shape, the fingerprinting and
 * the verification call in one place is what stops the ATS path and the search
 * path from drifting into two different definitions of "published" — which is
 * exactly the bug class the CHECK constraint in 013 exists to catch after the
 * fact, and this exists to prevent in the first place.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { contentFingerprint, urlFingerprint, verifyCandidate, type Reachability } from './verify';
import type { OpportunityCandidate } from './types';

/** Rows per upsert statement. See the chunking comment in ingestCandidates. */
const UPSERT_CHUNK = 500;

export interface IngestSummary {
  /** Candidates that were well-formed enough to verify. */
  considered: number;
  verified: number;
  pending: number;
  rejected: number;
  /** Candidates that collided with one already seen in THIS batch. */
  duplicates: number;
  /** Rows that reached or await the feed, for the run report. */
  added: { title: string; organization: string; host: string; status: string }[];
  /** Per-host tally of what was kept, for the run ledger's `sources`. */
  keptByHost: Map<string, number>;
}

export interface IngestOptions {
  runId?: string;
  now?: Date;
  /**
   * What is known about the apply URL's reachability.
   *
   * `'ok'` for both channels today, but for different reasons worth keeping
   * straight: the search channel fetched the page itself, while an ATS row came
   * back from the employer's own live board — a requisition an ATS is still
   * serving is stronger evidence of an open role than a 200 on a careers page.
   */
  reachability?: Reachability;
  /**
   * Skip WRITING rows the verifier rejected. They are still counted.
   *
   * The two channels want opposite answers here, for a reason worth stating.
   *
   * BVCITS stored every rejection so a scam URL seen once was recognised
   * without re-running the checks. That reasoning holds for the SEARCH channel,
   * where re-finding a page costs a search call and a fetch — so it keeps the
   * default and writes its rejects.
   *
   * It does not hold for the ATS channel. A board hands over all of its
   * postings in a single request whether we remember them or not, so storing
   * the rejects buys no future saving at all — and it is not a small number: a
   * harvest returns several thousand postings of which a few hundred clear the
   * India and student-level gates. Writing the rest would put tens of thousands
   * of rows nobody can ever see into the table twice a day, purely as a
   * bookkeeping habit inherited from a channel with different economics.
   */
  dropRejected?: boolean;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}

const EMPTY_SUMMARY = (): IngestSummary => ({
  considered: 0,
  verified: 0,
  pending: 0,
  rejected: 0,
  duplicates: 0,
  added: [],
  keptByHost: new Map(),
});

/**
 * Verify every candidate, drop what fails, and upsert the rest.
 *
 * Rejected rows ARE stored. That is deliberate and inherited from BVCITS: the
 * unique index on url_fingerprint means a scam URL seen once is recognised on
 * every later run without re-running the checks, and a human can audit what the
 * filter threw away. A rejected row can never be visible — the RLS policy in
 * 013 only admits `verified`.
 */
export async function ingestCandidates(
  supabase: SupabaseClient,
  candidates: readonly OpportunityCandidate[],
  options: IngestOptions = {}
): Promise<IngestSummary> {
  const now = options.now ?? new Date();
  const summary = EMPTY_SUMMARY();
  const rows: Record<string, unknown>[] = [];
  const byContent = new Map<string, number>();
  const byUrl = new Set<string>();

  for (const candidate of candidates) {
    if (!candidate.title?.trim() || !candidate.organization?.trim()) continue;
    summary.considered += 1;

    const fingerprint = urlFingerprint(candidate.applyUrl);
    // No canonical URL means no identity, and a row without identity would
    // duplicate itself on every run. verifyCandidate rejects these too; this
    // just avoids building a row that cannot be keyed.
    if (!fingerprint) {
      summary.rejected += 1;
      continue;
    }

    // Two rows in ONE batch sharing a URL would make the upsert's ON CONFLICT
    // fire against itself, which Postgres refuses outright.
    if (byUrl.has(fingerprint)) {
      summary.duplicates += 1;
      continue;
    }
    byUrl.add(fingerprint);

    const contentKey = contentFingerprint(candidate.title, candidate.organization);
    const seenBefore = byContent.get(contentKey) ?? 0;
    byContent.set(contentKey, seenBefore + 1);
    if (seenBefore > 0) summary.duplicates += 1;

    const verdict = verifyCandidate(candidate, {
      now,
      reachability: options.reachability ?? 'ok',
      corroborations: seenBefore + 1,
    });

    if (verdict.status === 'verified') summary.verified += 1;
    else if (verdict.status === 'pending') summary.pending += 1;
    else summary.rejected += 1;

    const host = hostOf(candidate.applyUrl);
    if (verdict.status === 'verified') {
      summary.keptByHost.set(host, (summary.keptByHost.get(host) ?? 0) + 1);
    }
    if (verdict.status !== 'rejected') {
      summary.added.push({
        title: candidate.title,
        organization: candidate.organization,
        host,
        status: verdict.status,
      });
    }

    const row: Record<string, unknown> = {
      title: candidate.title.trim().slice(0, 240),
      organization: candidate.organization.trim().slice(0, 160),
      kind: candidate.kind,
      apply_url: candidate.applyUrl,
      source_url: candidate.sourceUrl ?? candidate.applyUrl,
      url_fingerprint: fingerprint,
      content_fingerprint: contentKey,
      corroborations: seenBefore + 1,
      location: candidate.location ?? null,
      work_mode: candidate.workMode ?? null,
      eligibility: candidate.eligibility ?? null,
      skills: candidate.skills ?? [],
      description: candidate.description ?? null,
      compensation: candidate.compensation ?? null,
      deadline: candidate.deadline ?? null,
      posted_at: candidate.postedAt ?? null,
      status: verdict.status,
      source_tier: verdict.sourceTier,
      signals: verdict.signals,
      verified_at: verdict.status === 'verified' ? now.toISOString() : null,
      last_checked_at: now.toISOString(),
      last_check_result: 'ok',
      check_failures: 0,
      // A row that was retired and is being seen live again should come back,
      // not sit invisible forever behind a stale retirement.
      retired_at: null,
      retired_reason: null,
      ...(options.runId ? { last_seen_run: options.runId } : {}),
    };

    if (verdict.status === 'rejected' && options.dropRejected) continue;
    rows.push(row);
  }

  // Written in chunks, not one statement.
  //
  // A single ATS harvest can produce several thousand rows, and one upsert that
  // large is a multi-megabyte request body that PostgREST will reject or time
  // out on. Chunking also means a failure late in the batch keeps everything
  // written before it, which matters for a job that only runs twice a day.
  for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
    // merge-duplicates so a listing seen on a previous run is refreshed rather
    // than rejected by the unique index on url_fingerprint.
    const { error } = await supabase
      .from('opportunities')
      .upsert(rows.slice(i, i + UPSERT_CHUNK), {
        onConflict: 'url_fingerprint',
        ignoreDuplicates: false,
      });
    if (error) throw new Error(`Could not save discovered opportunities: ${error.message}`);
  }

  return summary;
}
