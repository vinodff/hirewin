import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DAY_MS = 24 * 60 * 60 * 1000;
const PRESENCE_WINDOW_MS = 2 * 60 * 1000;

function isoDaysAgo(n: number): string {
  return new Date(Date.now() - n * DAY_MS).toISOString();
}

/**
 * Counts for the agent, or null when its schema is not installed.
 *
 * `head: true` with `count: 'exact'` asks Postgres for the count and no rows,
 * which is what keeps four of these cheap enough to run on every 15s poll.
 */
async function readOpportunitySummary(sb: Awaited<ReturnType<typeof createServiceClient>>) {
  try {
    const since = istMidnight();

    const [live, pendingReview, foundToday, publishedToday, retiredToday, lastRun] = await Promise.all([
      sb.from('opportunities').select('id', { count: 'exact', head: true })
        .eq('status', 'verified').is('retired_at', null),
      sb.from('opportunities').select('id', { count: 'exact', head: true })
        .eq('status', 'pending').is('retired_at', null),
      sb.from('opportunities').select('id', { count: 'exact', head: true })
        .gte('discovered_at', since),
      sb.from('opportunities').select('id', { count: 'exact', head: true })
        .gte('discovered_at', since).eq('status', 'verified'),
      sb.from('opportunities').select('id', { count: 'exact', head: true })
        .gte('retired_at', since),
      sb.from('opportunity_runs').select('started_at, status, verified, retired, trigger')
        .order('started_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    // Any of these erroring the same way means the tables are not there yet.
    if (live.error) return null;

    return {
      live: live.count ?? 0,
      needsReview: pendingReview.count ?? 0,
      foundToday: foundToday.count ?? 0,
      publishedToday: publishedToday.count ?? 0,
      retiredToday: retiredToday.count ?? 0,
      lastRun: lastRun.data
        ? {
            startedAt: String(lastRun.data.started_at),
            status: String(lastRun.data.status),
            trigger: String(lastRun.data.trigger),
            verified: Number(lastRun.data.verified ?? 0),
            retired: Number(lastRun.data.retired ?? 0),
          }
        : null,
    };
  } catch {
    return null;
  }
}

/** Midnight IST today. The agent's day, which is not the server's day. */
function istMidnight(now = new Date()): string {
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const midnight = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate());
  return new Date(midnight - 5.5 * 60 * 60 * 1000).toISOString();
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const sb = await createServiceClient();

  // --- Revenue (paid orders) ---
  // Aggregated in SQL: PostgREST caps rows per response, so summing a plain
  // SELECT in JS silently under-reported every total past the first page.
  const [{ data: revenueRows }, { data: revenueByDayRows }] = await Promise.all([
    sb.rpc('admin_revenue_summary'),
    sb.rpc('admin_revenue_by_day'),
  ]);
  const rev = revenueRows?.[0] ?? {
    total_paise: 0, last30d_paise: 0, today_paise: 0, paid_order_count: 0,
  };
  const revenueByDay = (revenueByDayRows ?? []).map(
    (r: { day: string; paise: number }) => ({ day: r.day, paise: Number(r.paise) })
  );

  // --- Users ---
  const { count: totalUsers } = await sb
    .from('profiles')
    .select('id', { count: 'exact', head: true });

  const { count: newLast7d } = await sb
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', isoDaysAgo(7));

  const { count: newLast30d } = await sb
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', isoDaysAgo(30));

  const { data: planRows } = await sb.rpc('admin_plan_counts');
  const byPlan: Record<string, number> = {};
  for (const row of (planRows ?? []) as Array<{ plan: string; count: number }>) {
    byPlan[row.plan] = Number(row.count);
  }

  // --- Presence ---
  const presenceCutoff = new Date(Date.now() - PRESENCE_WINDOW_MS).toISOString();
  const { count: activeNow } = await sb
    .from('presence')
    .select('user_id', { count: 'exact', head: true })
    .gte('last_seen_at', presenceCutoff);

  const { data: activeRows } = await sb
    .from('presence')
    .select('user_id, last_seen_at, path')
    .gte('last_seen_at', presenceCutoff)
    .order('last_seen_at', { ascending: false })
    .limit(20);

  let activeUsers: Array<{ email: string | null; path: string | null; lastSeenAt: string }> = [];
  if (activeRows && activeRows.length > 0) {
    const ids = activeRows.map((r) => r.user_id);
    const { data: profs } = await sb.from('profiles').select('id, email').in('id', ids);
    const emailMap = new Map((profs ?? []).map((p) => [p.id, p.email]));
    activeUsers = activeRows.map((r) => ({
      email: emailMap.get(r.user_id) ?? null,
      path: r.path,
      lastSeenAt: r.last_seen_at,
    }));
  }

  // --- Usage events (aggregated in SQL — see revenue note above) ---
  const [{ data: usageRows }, { data: costByDayRows }, { data: recentUsage }] = await Promise.all([
    sb.rpc('admin_usage_summary'),
    sb.rpc('admin_cost_by_day'),
    sb
      .from('usage_events')
      .select('input_tokens, output_tokens, cost_usd, created_at, user_id, endpoint, version_id')
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const u = usageRows?.[0] ?? {
    total_calls: 0, total_input_tokens: 0, total_output_tokens: 0, total_cost_usd: 0,
    last30d_cost_usd: 0, last30d_tokens: 0, today_cost_usd: 0, today_calls: 0,
  };
  const costByDay = (costByDayRows ?? []).map(
    (r: { day: string; usd: number }) => ({ day: r.day, usd: Number(r.usd) })
  );

  // --- Recent feed (last 20 usage events joined to user + version) ---
  const recentRaw = recentUsage ?? [];
  const recentUserIds = Array.from(new Set(recentRaw.map((r) => r.user_id).filter((x): x is string => !!x)));
  const recentVersionIds = Array.from(new Set(recentRaw.map((r) => r.version_id).filter((x): x is string => !!x)));

  const [{ data: recentProfiles }, { data: recentVersions }] = await Promise.all([
    recentUserIds.length
      ? sb.from('profiles').select('id, email, plan').in('id', recentUserIds)
      : Promise.resolve({ data: [] as { id: string; email: string; plan: string }[] }),
    recentVersionIds.length
      ? sb.from('resume_versions').select('id, company, role').in('id', recentVersionIds)
      : Promise.resolve({ data: [] as { id: string; company: string; role: string }[] }),
  ]);

  const profMap = new Map((recentProfiles ?? []).map((p) => [p.id, p]));
  const versionMap = new Map((recentVersions ?? []).map((v) => [v.id, v]));

  const recent = recentRaw.map((r) => {
    const prof = r.user_id ? profMap.get(r.user_id) : null;
    const ver = r.version_id ? versionMap.get(r.version_id) : null;
    return {
      createdAt: r.created_at,
      endpoint: r.endpoint,
      inputTokens: r.input_tokens ?? 0,
      outputTokens: r.output_tokens ?? 0,
      costUsd: Number(r.cost_usd ?? 0),
      userEmail: prof?.email ?? null,
      userPlan: prof?.plan ?? null,
      company: ver?.company ?? null,
      role: ver?.role ?? null,
    };
  });

  // --- Top users by cost (all-time, ranked in SQL over every row) ---
  const { data: topRows } = await sb.rpc('admin_top_users', { p_limit: 10 });
  const topUsers = (
    (topRows ?? []) as Array<{
      email: string | null; plan: string | null; cost_usd: number; calls: number; tokens: number;
    }>
  ).map((r) => ({
    email: r.email ?? null,
    plan: r.plan ?? null,
    costUsd: Number(r.cost_usd),
    calls: Number(r.calls),
    tokens: Number(r.tokens),
  }));

  /*
   * --- Opportunities Agent ---
   *
   * Summarised here as well as on its own console, because this is the page an
   * admin actually opens. A board that has silently stopped publishing is worth
   * seeing next to revenue and users, not only after a deliberate click.
   *
   * Degrades to null rather than failing the whole overview: until migrations
   * 013/014 are applied these tables do not exist, and the revenue and user
   * panels above must keep working regardless.
   */
  const opportunities = await readOpportunitySummary(sb);

  return NextResponse.json({
    opportunities,
    revenue: {
      totalPaise: Number(rev.total_paise),
      last30dPaise: Number(rev.last30d_paise),
      todayPaise: Number(rev.today_paise),
      byDay: revenueByDay,
      paidOrderCount: Number(rev.paid_order_count),
    },
    users: {
      total: totalUsers ?? 0,
      newLast7d: newLast7d ?? 0,
      newLast30d: newLast30d ?? 0,
      byPlan,
    },
    presence: {
      activeNow: activeNow ?? 0,
      activeUsers,
    },
    usage: {
      totalCalls: Number(u.total_calls),
      totalInputTokens: Number(u.total_input_tokens),
      totalOutputTokens: Number(u.total_output_tokens),
      totalCostUsd: Number(u.total_cost_usd),
      last30dCostUsd: Number(u.last30d_cost_usd),
      last30dTokens: Number(u.last30d_tokens),
      todayCostUsd: Number(u.today_cost_usd),
      todayCalls: Number(u.today_calls),
      costByDay,
    },
    recent,
    topUsers,
    generatedAt: new Date().toISOString(),
  });
}
