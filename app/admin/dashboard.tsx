'use client';

import { useEffect, useState } from 'react';
import {
  IndianRupee,
  Users,
  Activity,
  Cpu,
  TrendingUp,
  Clock,
  RefreshCw,
  Loader2,
} from 'lucide-react';

const cardStyle = { background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' };

type Overview = {
  revenue: {
    totalPaise: number;
    last30dPaise: number;
    todayPaise: number;
    byDay: { day: string; paise: number }[];
    paidOrderCount: number;
  };
  users: {
    total: number;
    newLast7d: number;
    newLast30d: number;
    byPlan: Record<string, number>;
  };
  presence: {
    activeNow: number;
    activeUsers: { email: string | null; path: string | null; lastSeenAt: string }[];
  };
  usage: {
    totalCalls: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCostUsd: number;
    last30dCostUsd: number;
    last30dTokens: number;
    todayCostUsd: number;
    todayCalls: number;
    costByDay: { day: string; usd: number }[];
  };
  recent: {
    createdAt: string;
    endpoint: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    userEmail: string | null;
    userPlan: string | null;
    company: string | null;
    role: string | null;
  }[];
  topUsers: {
    email: string | null;
    plan: string | null;
    costUsd: number;
    calls: number;
    tokens: number;
  }[];
  generatedAt: string;
};

const POLL_MS = 15_000;

export default function AdminDashboard() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  async function load() {
    try {
      const res = await fetch('/api/admin/overview', { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as Overview;
      setData(json);
      setLastRefresh(new Date());
      setError('');
    } catch {
      setError('Failed to load admin data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, []);

  if (loading && !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-400" />
        Loading admin data…
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div
          className="rounded-xl p-4 text-sm text-red-400"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.15)' }}
        >
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const maxUsd = Math.max(1, ...data.usage.costByDay.map((d) => d.usd));
  const maxPaise = Math.max(1, ...data.revenue.byDay.map((d) => d.paise));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Overview</h1>
          <p className="text-sm text-slate-500">
            Live metrics. Auto-refreshes every 15s.
            {lastRefresh && (
              <span className="ml-2 text-slate-600">
                Last: {lastRefresh.toLocaleTimeString('en-IN')}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg text-slate-300 hover:text-white transition-colors"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </header>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi
          icon={<IndianRupee className="w-4 h-4" />}
          label="Revenue (total)"
          value={formatInr(data.revenue.totalPaise)}
          sub={`${data.revenue.paidOrderCount} paid orders`}
          accent="#34d399"
        />
        <Kpi
          icon={<IndianRupee className="w-4 h-4" />}
          label="Revenue (30d)"
          value={formatInr(data.revenue.last30dPaise)}
          sub={`Today: ${formatInr(data.revenue.todayPaise)}`}
          accent="#34d399"
        />
        <Kpi
          icon={<Users className="w-4 h-4" />}
          label="Registered users"
          value={data.users.total.toLocaleString('en-IN')}
          sub={`+${data.users.newLast7d} in 7d · +${data.users.newLast30d} in 30d`}
          accent="#a78bfa"
        />
        <Kpi
          icon={<Activity className="w-4 h-4" />}
          label="Active now"
          value={data.presence.activeNow.toLocaleString('en-IN')}
          sub="signed-in, last 2 min"
          accent="#fbbf24"
          live
        />
        <Kpi
          icon={<Cpu className="w-4 h-4" />}
          label="API cost (total)"
          value={`$${data.usage.totalCostUsd.toFixed(2)}`}
          sub={`${data.usage.totalCalls.toLocaleString('en-IN')} calls`}
          accent="#60a5fa"
        />
        <Kpi
          icon={<Cpu className="w-4 h-4" />}
          label="API cost (30d)"
          value={`$${data.usage.last30dCostUsd.toFixed(2)}`}
          sub={`${(data.usage.last30dTokens / 1000).toFixed(1)}k tokens`}
          accent="#60a5fa"
        />
        <Kpi
          icon={<Cpu className="w-4 h-4" />}
          label="API cost (today)"
          value={`$${data.usage.todayCostUsd.toFixed(2)}`}
          sub={`${data.usage.todayCalls} calls`}
          accent="#60a5fa"
        />
        <Kpi
          icon={<TrendingUp className="w-4 h-4" />}
          label="Tokens (total)"
          value={formatTokens(data.usage.totalInputTokens + data.usage.totalOutputTokens)}
          sub={`in ${formatTokens(data.usage.totalInputTokens)} · out ${formatTokens(
            data.usage.totalOutputTokens
          )}`}
          accent="#c084fc"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BarChart
          title="Revenue — last 30 days"
          subtitle="daily paid orders (INR)"
          data={data.revenue.byDay.map((d) => ({ day: d.day, value: d.paise / 100 }))}
          max={maxPaise / 100}
          formatValue={(v) => `₹${v.toFixed(0)}`}
          accent="#34d399"
        />
        <BarChart
          title="API cost — last 30 days"
          subtitle="daily Anthropic spend (USD)"
          data={data.usage.costByDay.map((d) => ({ day: d.day, value: d.usd }))}
          max={maxUsd}
          formatValue={(v) => `$${v.toFixed(2)}`}
          accent="#60a5fa"
        />
      </div>

      {/* Plan distribution + Active users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl p-5" style={cardStyle}>
          <h3 className="font-semibold text-white mb-3">Users by plan</h3>
          <div className="space-y-2">
            {Object.entries(data.users.byPlan).map(([plan, count]) => {
              const pct = data.users.total > 0 ? (count / data.users.total) * 100 : 0;
              return (
                <div key={plan}>
                  <div className="flex items-center justify-between text-sm text-slate-300 mb-1">
                    <span className="capitalize">{plan}</span>
                    <span className="text-slate-500">
                      {count} <span className="text-slate-600">· {pct.toFixed(0)}%</span>
                    </span>
                  </div>
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: planColor(plan),
                        transition: 'width 0.3s',
                      }}
                    />
                  </div>
                </div>
              );
            })}
            {Object.keys(data.users.byPlan).length === 0 && (
              <div className="text-sm text-slate-500 italic">No users yet.</div>
            )}
          </div>
        </div>

        <div className="rounded-2xl p-5" style={cardStyle}>
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Active users now ({data.presence.activeUsers.length})
          </h3>
          {data.presence.activeUsers.length === 0 ? (
            <div className="text-sm text-slate-500 italic py-4">Nobody on the site right now.</div>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {data.presence.activeUsers.map((u, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm py-1.5 px-2 rounded-lg hover:bg-white/5"
                >
                  <span className="text-slate-200 truncate">{u.email ?? '(unknown)'}</span>
                  <span className="text-xs text-slate-500 font-mono truncate ml-2">
                    {u.path ?? '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top users + Recent feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl p-5" style={cardStyle}>
          <h3 className="font-semibold text-white mb-3">Top users by API cost</h3>
          {data.topUsers.length === 0 ? (
            <div className="text-sm text-slate-500 italic py-4">No usage yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 uppercase tracking-wide">
                  <th className="text-left pb-2 font-semibold">User</th>
                  <th className="text-right pb-2 font-semibold">Plan</th>
                  <th className="text-right pb-2 font-semibold">Calls</th>
                  <th className="text-right pb-2 font-semibold">Tokens</th>
                  <th className="text-right pb-2 font-semibold">Cost</th>
                </tr>
              </thead>
              <tbody>
                {data.topUsers.map((u, i) => (
                  <tr key={i} className="border-t border-white/5">
                    <td className="py-2 text-slate-200 truncate max-w-[180px]">
                      {u.email ?? '(unknown)'}
                    </td>
                    <td className="text-right text-slate-400 capitalize">{u.plan ?? '—'}</td>
                    <td className="text-right text-slate-400">{u.calls}</td>
                    <td className="text-right text-slate-400">{formatTokens(u.tokens)}</td>
                    <td className="text-right font-semibold text-emerald-400">
                      ${u.costUsd.toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-2xl p-5" style={cardStyle}>
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-400" />
            Live API feed (last 20)
          </h3>
          {data.recent.length === 0 ? (
            <div className="text-sm text-slate-500 italic py-4">No API calls yet.</div>
          ) : (
            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {data.recent.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-xs gap-3 py-2 px-2 rounded-lg hover:bg-white/5"
                  style={{ borderBottom: '1px dashed rgba(255,255,255,0.04)' }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-200 truncate">
                      {r.userEmail ?? '(anonymous)'}{' '}
                      <span className="text-slate-500">· {r.endpoint}</span>
                    </div>
                    <div className="text-slate-500 truncate">
                      {r.company && r.role ? `${r.role} @ ${r.company}` : '—'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-emerald-400 font-semibold">${r.costUsd.toFixed(4)}</div>
                    <div className="text-slate-600">
                      {formatTokens(r.inputTokens + r.outputTokens)} tok ·{' '}
                      {relativeTime(r.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  sub,
  accent,
  live,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent: string;
  live?: boolean;
}) {
  return (
    <div className="rounded-2xl p-4 relative" style={cardStyle}>
      {live && (
        <span
          className="absolute top-3 right-3 w-2 h-2 rounded-full"
          style={{ background: '#34d399', boxShadow: '0 0 8px #34d399' }}
        />
      )}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: `${accent}20`, color: accent }}
        >
          {icon}
        </div>
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

function BarChart({
  title,
  subtitle,
  data,
  max,
  formatValue,
  accent,
}: {
  title: string;
  subtitle: string;
  data: { day: string; value: number }[];
  max: number;
  formatValue: (v: number) => string;
  accent: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="rounded-2xl p-5" style={cardStyle}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-white">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">Total</div>
          <div className="font-bold text-white">{formatValue(total)}</div>
        </div>
      </div>
      <div className="flex items-end gap-0.5 h-32">
        {data.map((d) => {
          const h = max > 0 ? (d.value / max) * 100 : 0;
          return (
            <div key={d.day} className="flex-1 flex flex-col justify-end group relative">
              <div
                className="rounded-t-sm transition-all"
                style={{
                  height: `${Math.max(h, d.value > 0 ? 2 : 0)}%`,
                  background: d.value > 0 ? accent : 'rgba(255,255,255,0.04)',
                  opacity: d.value > 0 ? 0.85 : 1,
                }}
              />
              {d.value > 0 && (
                <div
                  className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-black/80 text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10"
                >
                  {d.day.slice(5)}: {formatValue(d.value)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-slate-600 mt-1">
        <span>{data[0]?.day.slice(5) ?? ''}</span>
        <span>{data[Math.floor(data.length / 2)]?.day.slice(5) ?? ''}</span>
        <span>{data[data.length - 1]?.day.slice(5) ?? 'today'}</span>
      </div>
    </div>
  );
}

function formatInr(paise: number): string {
  const rupees = paise / 100;
  if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(2)}L`;
  if (rupees >= 1000) return `₹${(rupees / 1000).toFixed(1)}k`;
  return `₹${rupees.toFixed(0)}`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function planColor(plan: string): string {
  switch (plan) {
    case 'free':
      return '#64748b';
    case 'starter':
      return '#60a5fa';
    case 'pro':
      return '#a78bfa';
    case 'power':
      return '#f472b6';
    case 'team':
      return '#34d399';
    default:
      return '#94a3b8';
  }
}
