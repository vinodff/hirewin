/**
 * The Opportunities Agent — runs twice a day.
 *
 * vercel.json schedules two invocations:
 *   { "path": "/api/cron/opportunities", "schedule": "30 0 * * *" }   06:00 IST
 *   { "path": "/api/cron/opportunities", "schedule": "30 12 * * *" }  18:00 IST
 *
 * Three stages, in this order and for these reasons:
 *
 *   1. **ATS harvest.** Structured postings straight from Greenhouse, Lever,
 *      Ashby and SmartRecruiters. Free, uncapped, exact. This is where the bulk
 *      of the feed comes from and it runs first because it cannot fail
 *      expensively — a board being down costs that board's rows and nothing
 *      else.
 *   2. **Grounded search.** Hackathons, scholarships and programmes, which have
 *      no API. Rate-limited and optional; skipped entirely without a key.
 *   3. **Liveness sweep.** Re-checks already-published rows and retires the
 *      dead ones. Runs LAST and always, even when discovery failed, because
 *      retiring closed listings matters most on exactly the days the discovery
 *      half is unhealthy.
 *
 * Each stage is allowed to fail without cancelling the others. A run that
 * harvested 400 rows and admits its search half broke is far more useful than
 * one that reports a single error and did nothing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { harvestAts } from '@/lib/opportunities/ats';
import { ingestCandidates } from '@/lib/opportunities/ingest';
import { runDiscovery } from '@/lib/opportunities/discover';
import { runRefresh, DEFAULT_SWEEP_LIMIT } from '@/lib/opportunities/refresh';
import { startRun, finishRun, istSlot, type RunSource } from '@/lib/opportunities/runs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * Wall-clock budget for the harvest + ingest half.
 *
 * `maxDuration` is 300s and the sweep still has to happen afterwards. Rather
 * than hope the work fits, the harvest stops taking on new boards once this
 * passes. A run that ingests 25 boards and says so beats one killed mid-flight
 * that records nothing.
 */
const HARVEST_BUDGET_MS = 90_000;

/**
 * Authorisation. Fails CLOSED, matching /api/cron/monthly-reset.
 *
 * This route runs with the service-role key and fires several hundred outbound
 * requests per call. An unauthenticated endpoint that does that is a
 * denial-of-wallet hole, not a convenience — so a missing CRON_SECRET closes
 * the door rather than opening it.
 */
function authorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error('[opportunities-agent] CRON_SECRET is not configured — refusing to run');
    return false;
  }
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

/**
 * Vercel invokes a cron with GET, so that verb has to be the one the scheduler
 * can reach — a POST-only route would deploy fine, report no error, and simply
 * never run. POST is kept for a future "Run now" control, which is a
 * state-changing action and should not be a GET.
 */
export async function GET(req: NextRequest) {
  return handleRun(req);
}

export async function POST(req: NextRequest) {
  return handleRun(req);
}

async function handleRun(req: NextRequest) {
  if (!authorised(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const force = new URL(req.url).searchParams.get('force') === '1';
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const slot = istSlot();

  let run;
  try {
    const started = await startRun(supabase, { trigger: 'cron', slot, force });
    // This slot already ran and nobody asked for a repeat: report the existing
    // run rather than sweeping the same rows twice.
    if (started.reused) {
      return NextResponse.json({ ok: true, reused: true, slot, run: started.run });
    }
    run = started.run;
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }

  const sources: RunSource[] = [];
  const errors: string[] = [];

  // --- 1. ATS harvest ------------------------------------------------------
  let atsVerified = 0;
  let atsPending = 0;
  let atsRejected = 0;
  let atsDuplicates = 0;
  let atsConsidered = 0;
  let boardsPolled = 0;

  try {
    const harvest = await harvestAts({ deadline: Date.now() + HARVEST_BUDGET_MS });
    boardsPolled = harvest.boardsPolled;

    const ingested = await ingestCandidates(supabase, harvest.candidates, {
      runId: run.id,
      // The employer's own live board is still serving this requisition, which
      // is stronger evidence the role is open than a 200 on a careers page.
      reachability: 'ok',
      // A harvest returns several thousand postings, of which the few hundred
      // that are Indian and student-level are the ones anyone can act on.
      // Storing the remainder buys nothing here — the next run gets the whole
      // board back in one request regardless. See the option's doc comment.
      dropRejected: true,
    });

    atsConsidered = ingested.considered;
    atsVerified = ingested.verified;
    atsPending = ingested.pending;
    atsRejected = ingested.rejected;
    atsDuplicates = ingested.duplicates;

    for (const result of harvest.results) {
      sources.push({
        host: `${result.board.vendor}:${result.board.slug}`,
        plan: 'ats',
        results: result.candidates.length,
        // Per-board kept counts would need the ingest tally keyed by board
        // rather than by host; the host tally below carries the same evidence.
        kept: 0,
      });
      if (result.error) errors.push(`${result.board.vendor}/${result.board.slug}: ${result.error}`);
    }
    for (const [host, kept] of ingested.keptByHost) {
      sources.push({ host, plan: 'ats-kept', results: kept, kept });
    }
  } catch (error) {
    const message = (error as Error).message;
    errors.push(`ats harvest: ${message}`);
    console.error('[opportunities-agent] ATS harvest failed:', message);
  }

  // --- 2. Grounded search (optional) ---------------------------------------
  let discovery: Awaited<ReturnType<typeof runDiscovery>> | null = null;
  try {
    discovery = await runDiscovery(supabase, { runId: run.id });
    if (discovery.sources.length > 0) sources.push(...discovery.sources);
  } catch (error) {
    const message = (error as Error).message;
    errors.push(`search: ${message}`);
    console.error('[opportunities-agent] discovery failed:', message);
  }

  // --- 3. Liveness sweep ---------------------------------------------------
  let rechecked = 0;
  let retired = 0;
  let retirements: { title: string; url: string; evidence: string[] }[] = [];

  try {
    const summary = await runRefresh(supabase, { runId: run.id, limit: DEFAULT_SWEEP_LIMIT });
    rechecked = summary.rechecked;
    retired = summary.retired;
    // Only rows that actually changed state — a full dump of 40 "still fine"
    // checks is noise in a cron log.
    retirements = summary.outcomes
      .filter((outcome) => outcome.retired)
      .map((outcome) => ({ title: outcome.title, url: outcome.applyUrl, evidence: outcome.evidence }));
  } catch (error) {
    const message = (error as Error).message;
    errors.push(`sweep: ${message}`);
    console.error('[opportunities-agent] sweep failed:', message);
  }

  const verified = atsVerified + (discovery?.verified ?? 0);

  await finishRun(supabase, run.id, {
    // `partial` is an honest third state: some stages worked, some did not.
    status: errors.length === 0 ? 'success' : verified > 0 || rechecked > 0 ? 'partial' : 'failed',
    startedAt: run.startedAt,
    counts: {
      pages_searched: boardsPolled + (discovery?.pagesSearched ?? 0),
      extracted: atsConsidered + (discovery?.extracted ?? 0),
      verified,
      pending: atsPending + (discovery?.pending ?? 0),
      rejected: atsRejected + (discovery?.rejected ?? 0),
      duplicates: atsDuplicates + (discovery?.duplicates ?? 0),
      rechecked,
      retired,
    },
    sources,
    model: discovery?.model ?? null,
    error: errors.length > 0 ? errors.join(' · ').slice(0, 2000) : null,
  });

  // Both halves change what the page shows.
  if (verified > 0 || retired > 0) {
    revalidatePath('/opportunities');
  }

  return NextResponse.json({
    ok: true,
    reused: false,
    runId: run.id,
    slot,
    ats: {
      boardsPolled,
      considered: atsConsidered,
      verified: atsVerified,
      pending: atsPending,
      rejected: atsRejected,
      duplicates: atsDuplicates,
    },
    search: discovery
      ? {
          skipped: discovery.skipped ?? null,
          pagesSearched: discovery.pagesSearched,
          extracted: discovery.extracted,
          verified: discovery.verified,
          pending: discovery.pending,
          rejected: discovery.rejected,
        }
      : null,
    rechecked,
    retired,
    retirements,
    errors,
  });
}
