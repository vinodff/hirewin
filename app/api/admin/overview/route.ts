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

function startOfTodayIso(): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const sb = await createServiceClient();

  // --- Revenue (paid orders) ---
  const { data: paidOrders } = await sb
    .from('orders')
    .select('amount_paise, created_at, plan, is_yearly')
    .eq('status', 'paid')
    .order('created_at', { ascending: false });

  const orders = paidOrders ?? [];
  const totalPaise = orders.reduce((s, o) => s + (o.amount_paise ?? 0), 0);
  const sinceIso30 = isoDaysAgo(30);
  const sinceToday = startOfTodayIso();
  const last30dPaise = orders
    .filter((o) => o.created_at >= sinceIso30)
    .reduce((s, o) => s + (o.amount_paise ?? 0), 0);
  const todayPaise = orders
    .filter((o) => o.created_at >= sinceToday)
    .reduce((s, o) => s + (o.amount_paise ?? 0), 0);

  const byDayMap = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * DAY_MS).toISOString().slice(0, 10);
    byDayMap.set(d, 0);
  }
  for (const o of orders) {
    const day = (o.created_at as string).slice(0, 10);
    if (byDayMap.has(day)) byDayMap.set(day, (byDayMap.get(day) ?? 0) + (o.amount_paise ?? 0));
  }
  const revenueByDay = Array.from(byDayMap.entries()).map(([day, paise]) => ({ day, paise }));

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

  const { data: planRows } = await sb.from('profiles').select('plan');
  const byPlan: Record<string, number> = {};
  for (const row of planRows ?? []) byPlan[row.plan] = (byPlan[row.plan] ?? 0) + 1;

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

  // --- Usage events ---
  const { data: allUsage } = await sb
    .from('usage_events')
    .select('input_tokens, output_tokens, cost_usd, created_at, user_id, endpoint, version_id')
    .order('created_at', { ascending: false });

  const usage = allUsage ?? [];
  const totalCalls = usage.length;
  const totalInput = usage.reduce((s, u) => s + (u.input_tokens ?? 0), 0);
  const totalOutput = usage.reduce((s, u) => s + (u.output_tokens ?? 0), 0);
  const totalCostUsd = usage.reduce((s, u) => s + Number(u.cost_usd ?? 0), 0);
  const last30dUsage = usage.filter((u) => u.created_at >= sinceIso30);
  const last30dCostUsd = last30dUsage.reduce((s, u) => s + Number(u.cost_usd ?? 0), 0);
  const last30dTokens = last30dUsage.reduce(
    (s, u) => s + (u.input_tokens ?? 0) + (u.output_tokens ?? 0),
    0
  );
  const todayUsage = usage.filter((u) => u.created_at >= sinceToday);
  const todayCostUsd = todayUsage.reduce((s, u) => s + Number(u.cost_usd ?? 0), 0);
  const todayCalls = todayUsage.length;

  const costByDayMap = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * DAY_MS).toISOString().slice(0, 10);
    costByDayMap.set(d, 0);
  }
  for (const u of last30dUsage) {
    const day = (u.created_at as string).slice(0, 10);
    if (costByDayMap.has(day))
      costByDayMap.set(day, (costByDayMap.get(day) ?? 0) + Number(u.cost_usd ?? 0));
  }
  const costByDay = Array.from(costByDayMap.entries()).map(([day, usd]) => ({ day, usd }));

  // --- Recent feed (last 20 usage events joined to user + version) ---
  const recentRaw = usage.slice(0, 20);
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

  // --- Top users by cost (all-time) ---
  const perUser = new Map<string, { cost: number; calls: number; tokens: number }>();
  for (const u of usage) {
    if (!u.user_id) continue;
    const prev = perUser.get(u.user_id) ?? { cost: 0, calls: 0, tokens: 0 };
    prev.cost += Number(u.cost_usd ?? 0);
    prev.calls += 1;
    prev.tokens += (u.input_tokens ?? 0) + (u.output_tokens ?? 0);
    perUser.set(u.user_id, prev);
  }
  const topIds = Array.from(perUser.entries())
    .sort((a, b) => b[1].cost - a[1].cost)
    .slice(0, 10)
    .map(([id]) => id);

  let topUsers: Array<{
    email: string | null;
    plan: string | null;
    costUsd: number;
    calls: number;
    tokens: number;
  }> = [];
  if (topIds.length > 0) {
    const { data: topProfiles } = await sb
      .from('profiles')
      .select('id, email, plan')
      .in('id', topIds);
    const map = new Map((topProfiles ?? []).map((p) => [p.id, p]));
    topUsers = topIds.map((id) => {
      const agg = perUser.get(id)!;
      const prof = map.get(id);
      return {
        email: prof?.email ?? null,
        plan: prof?.plan ?? null,
        costUsd: agg.cost,
        calls: agg.calls,
        tokens: agg.tokens,
      };
    });
  }

  return NextResponse.json({
    revenue: {
      totalPaise,
      last30dPaise,
      todayPaise,
      byDay: revenueByDay,
      paidOrderCount: orders.length,
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
      totalCalls,
      totalInputTokens: totalInput,
      totalOutputTokens: totalOutput,
      totalCostUsd,
      last30dCostUsd,
      last30dTokens,
      todayCostUsd,
      todayCalls,
      costByDay,
    },
    recent,
    topUsers,
    generatedAt: new Date().toISOString(),
  });
}
