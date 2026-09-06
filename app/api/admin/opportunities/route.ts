/**
 * Everything the Opportunities console reads, in one request.
 *
 * The console polls this every 15 seconds per open tab, so the shape is chosen
 * to keep that cheap: today's counters come from a single SQL function
 * (`opportunity_console_summary`) rather than nine round trips, and the row
 * lists are capped.
 *
 * PATCH edits the agent's schedule and limits. Both verbs are gated by
 * requireAdmin(), which is HireWin's existing email-based admin check — the
 * same boundary /api/admin/overview uses.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin';
import { readSettings, writeSettings, validatePatch, isDue, istHour } from '@/lib/opportunities/settings';
import { listRuns, listDailyStats, istDate } from '@/lib/opportunities/runs';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** Rows returned per list. The console paginates by filtering, not by paging. */
const LIST_LIMIT = 60;

const ROW_COLUMNS =
  'id, title, organization, kind, apply_url, location, compensation, deadline, status, source_tier, signals, ' +
  'is_direct_apply, discovered_at, last_checked_at, last_check_result, retired_at, retired_reason, retired_by, corroborations';

/**
 * Has the migration not been applied yet?
 *
 * PostgREST reports an unknown relation as PGRST205 with a message naming the
 * table. Both are checked because the code is the reliable signal and the
 * message is the readable one, and older PostgREST builds send only the latter.
 */
function isMissingSchema(error: { code?: string; message?: string }): boolean {
  if (error.code === 'PGRST205' || error.code === '42P01') return true;
  const message = error.message ?? '';
  return /could not find the table|relation .* does not exist/i.test(message);
}

/** Midnight IST today, as an instant. The console's "today" is the admin's day. */
function istMidnight(now = new Date()): string {
  const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const midnightIst = Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate());
  return new Date(midnightIst - 5.5 * 60 * 60 * 1000).toISOString();
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const sb = await createServiceClient();
  const since = istMidnight();
  const view = new URL(req.url).searchParams.get('view') ?? 'live';

  const [settings, summaryResult, runs, daily] = await Promise.all([
    readSettings(sb),
    sb.rpc('opportunity_console_summary', { p_since: since }),
    listRuns(sb, 12).catch(() => []),
    listDailyStats(sb, 14).catch(() => []),
  ]);

  const counts = (summaryResult.data?.[0] ?? {}) as Record<string, number | string>;
  const n = (key: string) => Number(counts[key] ?? 0);

  /*
   * Which rows the console is looking at.
   *
   * `needs-review` is the queue that actually needs a human: anything held at
   * pending, which now includes every listing whose link is not a direct
   * application page.
   */
  let query = sb.from('opportunities').select(ROW_COLUMNS);
  if (view === 'needs-review') {
    query = query.eq('status', 'pending').is('retired_at', null).order('discovered_at', { ascending: false });
  } else if (view === 'removed') {
    query = query.not('retired_at', 'is', null).order('retired_at', { ascending: false });
  } else if (view === 'indirect') {
    query = query.eq('is_direct_apply', false).is('retired_at', null).order('discovered_at', { ascending: false });
  } else {
    query = query.eq('status', 'verified').is('retired_at', null).order('discovered_at', { ascending: false });
  }

  const { data: rows, error: rowsError } = await query.limit(LIST_LIMIT);

  /*
   * The schema not being applied yet is a SETUP state, not a failure.
   *
   * Returning 500 here was actively unhelpful: an admin opening the console
   * before running `supabase db push` got a red box quoting a PostgREST error
   * about a missing relation, which says nothing about what to do next. This
   * returns 200 with a flag the UI turns into instructions.
   */
  if (rowsError) {
    if (isMissingSchema(rowsError)) {
      return NextResponse.json({ setupRequired: true, generatedAt: new Date().toISOString() });
    }
    return NextResponse.json({ error: rowsError.message }, { status: 500 });
  }

  const due = isDue(settings);

  return NextResponse.json({
    settings: {
      ...settings,
      // Derived here so the UI never has to recompute the schedule's meaning.
      runsPerDay: settings.runHoursIst.length,
      currentIstHour: istHour(),
      nextRunHour: nextHour(settings.runHoursIst, istHour()),
      dueNow: due.due,
      dueReason: due.reason,
    },
    today: {
      date: istDate(),
      discovered: n('discovered_today'),
      published: n('published_today'),
      pending: n('pending_today'),
      // Retired by the sweep — a dead link the crawler proved gone.
      retired: n('retired_today'),
      // Removed by a human. Different meaning, so never summed with the above.
      removed: n('removed_today'),
    },
    totals: {
      live: n('live_total'),
      pending: n('pending_total'),
      directApply: n('direct_apply_total'),
      indirect: n('indirect_total'),
    },
    runs,
    daily,
    view,
    rows: rows ?? [],
    generatedAt: new Date().toISOString(),
  });
}

/** The next scheduled hour, wrapping past midnight. Null when nothing is set. */
function nextHour(hours: number[], current: number): number | null {
  if (hours.length === 0) return null;
  const sorted = [...hours].sort((a, b) => a - b);
  return sorted.find((h) => h > current) ?? sorted[0];
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  let patch;
  try {
    patch = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body must be JSON.' }, { status: 400 });
  }

  // Validated before it reaches Postgres so the admin reads a sentence rather
  // than a constraint name. The CHECKs in 014 remain the floor.
  const invalid = validatePatch(patch);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  const sb = await createServiceClient();
  try {
    const settings = await writeSettings(sb, patch, admin.id);
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
