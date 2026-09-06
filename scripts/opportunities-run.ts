/**
 * Run the agent once, locally, against the configured Supabase project.
 *
 *   npm run opportunities:run
 *
 * Same three stages as the cron route, in the same order, using the same
 * functions — this is not a reimplementation, so a green run here means the
 * scheduled one works too. What it skips is the HTTP layer: no CRON_SECRET
 * round trip and no 300s serverless ceiling, which is what makes it the right
 * way to do the FIRST run. That one has an empty table to fill and takes
 * longer than every run after it.
 *
 * Reads .env.local directly, because a plain `vite-node` process gets none of
 * the env loading Next.js does for you.
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// Must happen before the modules below are touched: discover.ts reads
// GEMINI_API_KEY at call time, but failing early on a missing Supabase URL is
// far clearer than a null-client error twenty seconds into a harvest.
loadEnvLocal();

const { harvestAts } = await import('../lib/opportunities/ats');
const { ingestCandidates } = await import('../lib/opportunities/ingest');
const { runDiscovery } = await import('../lib/opportunities/discover');
const { runRefresh } = await import('../lib/opportunities/refresh');
const { startRun, finishRun, istSlot } = await import('../lib/opportunities/runs');
const { readSettings } = await import('../lib/opportunities/settings');

/** Minimal dotenv: `KEY=value`, ignoring blanks, comments and quotes. */
function loadEnvLocal() {
  let raw: string;
  try {
    raw = readFileSync('.env.local', 'utf-8');
  } catch {
    console.error('No .env.local found. Run this from the project root.');
    process.exit(1);
  }

  for (const line of raw.split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, value] = match;
    // Never clobber something already exported into the shell.
    if (process.env[key]) continue;
    process.env[key] = value.replace(/^["']|["']$/g, '');
  }
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`${name} is not set in .env.local — cannot continue.`);
    process.exit(1);
  }
  return value;
}

async function main() {
  const supabase = createClient(
    required('NEXT_PUBLIC_SUPABASE_URL'),
    required('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const settings = await readSettings(supabase);
  console.log(
    `Settings: runs at IST ${settings.runHoursIst.join(', ')} · sweep ${settings.sweepLimit} · ` +
      `publish cap ${settings.maxPublishPerRun} · auto-publish ${settings.autoPublish ? 'on' : 'off'}` +
      (settings.paused ? ' · PAUSED (a manual run ignores this)' : '')
  );

  const { run } = await startRun(supabase, { trigger: 'manual', slot: istSlot(), force: true });
  console.log(`Run ${run.id} opened.\n`);

  // --- 1. ATS harvest ------------------------------------------------------
  console.log('Harvesting ATS boards…');
  const started = Date.now();
  const harvest = await harvestAts();
  console.log(
    `  ${harvest.boardsPolled} boards · ${harvest.candidates.length} postings · ` +
      `${harvest.boardsFailed} failed · ${((Date.now() - started) / 1000).toFixed(1)}s`
  );

  const ingested = await ingestCandidates(supabase, harvest.candidates, {
    runId: run.id,
    reachability: 'ok',
    autoPublish: settings.autoPublish,
    maxPublish: settings.maxPublishPerRun,
    dropRejected: true,
  });
  console.log(
    `  published ${ingested.verified} · held ${ingested.pending} · ` +
      `rejected ${ingested.rejected} · duplicates ${ingested.duplicates}\n`
  );

  // --- 2. Grounded search (optional) ---------------------------------------
  let discovered = 0;
  let searchNote = '';
  try {
    const discovery = await runDiscovery(supabase, { runId: run.id });
    discovered = discovery.verified;
    searchNote = discovery.skipped
      ? `skipped — ${discovery.skipped}`
      : `${discovery.pagesSearched} pages · published ${discovery.verified} · held ${discovery.pending}`;
  } catch (error) {
    searchNote = `failed — ${(error as Error).message}`;
  }
  console.log(`Grounded search: ${searchNote}\n`);

  // --- 3. Liveness sweep ---------------------------------------------------
  const sweep = await runRefresh(supabase, { runId: run.id, limit: settings.sweepLimit });
  console.log(`Liveness sweep: re-checked ${sweep.rechecked} · retired ${sweep.retired}\n`);

  await finishRun(supabase, run.id, {
    status: 'success',
    startedAt: run.startedAt,
    counts: {
      pages_searched: harvest.boardsPolled,
      extracted: ingested.considered,
      verified: ingested.verified + discovered,
      pending: ingested.pending,
      rejected: ingested.rejected,
      duplicates: ingested.duplicates,
      rechecked: sweep.rechecked,
      retired: sweep.retired,
    },
  });

  const { count } = await supabase
    .from('opportunities')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'verified')
    .is('retired_at', null);

  console.log(`Done. ${count ?? 0} opportunities are now live on /opportunities.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
