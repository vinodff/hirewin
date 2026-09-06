'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Link2Off,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  Zap,
} from 'lucide-react';

const cardStyle = { background: 'var(--surface)', border: '1px solid var(--edge)' };
const POLL_MS = 15_000;

type Settings = {
  runHoursIst: number[];
  sweepLimit: number;
  maxPublishPerRun: number;
  autoPublish: boolean;
  paused: boolean;
  updatedAt: string | null;
  runsPerDay: number;
  currentIstHour: number;
  nextRunHour: number | null;
  dueNow: boolean;
  dueReason: string;
};

type Row = {
  id: string;
  title: string;
  organization: string;
  kind: string;
  apply_url: string;
  location: string | null;
  compensation: string | null;
  deadline: string | null;
  status: string;
  source_tier: string;
  signals: string[] | null;
  is_direct_apply: boolean | null;
  discovered_at: string;
  last_checked_at: string | null;
  last_check_result: string | null;
  retired_at: string | null;
  retired_reason: string | null;
  retired_by: string | null;
  corroborations: number;
};

type Run = {
  id: string;
  status: string;
  trigger: string;
  slot: string;
  runDate: string;
  startedAt: string;
  durationMs: number | null;
  verified: number;
  pending: number;
  rejected: number;
  rechecked: number;
  retired: number;
  error: string | null;
};

type Payload = {
  /** True until supabase/migrations/013 + 014 have been applied. */
  setupRequired?: boolean;
  settings: Settings;
  today: { date: string; discovered: number; published: number; pending: number; retired: number; removed: number };
  totals: { live: number; pending: number; directApply: number; indirect: number };
  runs: Run[];
  daily: { day: string; discovered: number; verified: number; retired: number; runs: number }[];
  view: string;
  rows: Row[];
  generatedAt: string;
};

const VIEWS = [
  { key: 'live', label: 'Live on site' },
  { key: 'needs-review', label: 'Needs review' },
  { key: 'indirect', label: 'Not direct links' },
  { key: 'removed', label: 'Removed' },
] as const;

function hourLabel(hour: number): string {
  const suffix = hour < 12 ? 'am' : 'pm';
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}${suffix}`;
}

function ago(iso: string | null): string {
  if (!iso) return 'never';
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
  return `${Math.round(seconds / 86400)}d ago`;
}

export default function OpportunitiesConsole() {
  const [data, setData] = useState<Payload | null>(null);
  const [view, setView] = useState<string>('live');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = useCallback(
    async (nextView = view) => {
      try {
        const res = await fetch(`/api/admin/opportunities?view=${nextView}`, { cache: 'no-store' });
        if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
        setData(await res.json());
        setError('');
        setLastRefresh(new Date());
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load the console.');
      }
    },
    [view]
  );

  useEffect(() => {
    load(view);
    const id = setInterval(() => load(view), POLL_MS);
    return () => clearInterval(id);
  }, [load, view]);

  async function act(action: string, id?: string, extra: Record<string, unknown> = {}) {
    setBusy(id ?? action);
    setNotice('');
    try {
      const res = await fetch('/api/admin/opportunities/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id, ...extra }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? `HTTP ${res.status}`);

      if (action === 'recheck') {
        setNotice(
          `${result.verdict.toUpperCase()} — ${result.evidence?.join(' · ') ?? 'no evidence'}` +
            (result.directApply ? '' : ` · link: ${result.linkReason}`)
        );
      } else if (action === 'run') {
        setNotice(result.note ?? 'Run finished. Counters below are updating.');
      }
      await load(view);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed.');
    } finally {
      setBusy(null);
    }
  }

  async function saveSettings(patch: Partial<Settings>) {
    setBusy('settings');
    try {
      const res = await fetch('/api/admin/opportunities', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setError('');
      await load(view);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save settings.');
    } finally {
      setBusy(null);
    }
  }

  if (!data && !error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center" style={{ color: 'var(--dim)' }}>
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" style={{ color: 'var(--accent)' }} />
        Loading the agent console…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div
          className="rounded-xl p-4 text-sm"
          style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: 'var(--danger)' }}
        >
          {error}
        </div>
      </div>
    );
  }

  // The schema is not applied yet. Say what to run rather than showing eight
  // zeroes, which would read as "the agent ran and found nothing".
  if (data.setupRequired) return <SetupNeeded />;

  const { settings, today, totals } = data;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--fg)' }}>
            Opportunities Agent
          </h1>
          <p className="text-sm" style={{ color: 'var(--dim)' }}>
            {settings.paused ? (
              <span style={{ color: 'var(--warn)' }}>Paused — no scheduled runs.</span>
            ) : (
              <>
                Runs <span className="font-data" style={{ color: 'var(--fg)' }}>{settings.runsPerDay}×</span> daily at{' '}
                <span className="font-data" style={{ color: 'var(--fg)' }}>
                  {settings.runHoursIst.map(hourLabel).join(', ')}
                </span>{' '}
                IST.
                {settings.nextRunHour !== null && (
                  <> Next: <span className="font-data" style={{ color: 'var(--accent-soft)' }}>{hourLabel(settings.nextRunHour)}</span>.</>
                )}
              </>
            )}
            {lastRefresh && (
              <span className="ml-2" style={{ color: 'var(--faint)' }}>
                Refreshed {lastRefresh.toLocaleTimeString('en-IN')}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => saveSettings({ paused: !settings.paused })}
            disabled={busy === 'settings'}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            style={{
              background: settings.paused ? 'rgba(16,185,129,0.12)' : 'rgba(251,191,36,0.12)',
              border: `1px solid ${settings.paused ? 'rgba(16,185,129,0.3)' : 'rgba(251,191,36,0.3)'}`,
              color: settings.paused ? 'var(--accent-soft)' : 'var(--warn)',
            }}
          >
            {settings.paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            {settings.paused ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={() => act('run')}
            disabled={busy === 'run'}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            style={{ background: 'var(--accent)', color: '#04140d' }}
          >
            {busy === 'run' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            Run now
          </button>
          <button
            onClick={() => load(view)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--edge)', color: 'var(--dim)' }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </header>

      {(error || notice) && (
        <div
          className="rounded-lg px-3 py-2 text-xs"
          style={
            error
              ? { background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: 'var(--danger)' }
              : { background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: 'var(--accent-soft)' }
          }
        >
          {error || notice}
        </div>
      )}

      {/* Today */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--faint)' }}>
          Today · {today.date} IST
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Stat label="Fetched" value={today.discovered} icon={<Search className="w-4 h-4" />} accent="var(--accent-soft)" />
          <Stat label="Published" value={today.published} icon={<CheckCircle2 className="w-4 h-4" />} accent="var(--accent)" />
          <Stat label="Held for review" value={today.pending} icon={<AlertTriangle className="w-4 h-4" />} accent="var(--warn)" />
          <Stat
            label="Auto-retired"
            value={today.retired}
            icon={<Link2Off className="w-4 h-4" />}
            accent="var(--danger)"
            sub="dead links"
          />
          <Stat
            label="Removed by admin"
            value={today.removed}
            icon={<Trash2 className="w-4 h-4" />}
            accent="var(--dim)"
            sub="by a human"
          />
        </div>
      </section>

      {/* Board health */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Live on site" value={totals.live} icon={<Activity className="w-4 h-4" />} accent="var(--accent)" live />
        <Stat label="Awaiting review" value={totals.pending} icon={<Clock className="w-4 h-4" />} accent="var(--warn)" />
        <Stat label="Direct apply links" value={totals.directApply} icon={<ExternalLink className="w-4 h-4" />} accent="var(--accent-soft)" />
        <Stat
          label="Not direct"
          value={totals.indirect}
          icon={<Link2Off className="w-4 h-4" />}
          accent={totals.indirect > 0 ? 'var(--warn)' : 'var(--faint)'}
          sub={totals.indirect > 0 ? 'held, never published' : 'all clear'}
        />
      </section>

      {/* Schedule */}
      <section className="rounded-xl p-4" style={cardStyle}>
        <h2 className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--faint)' }}>
          Schedule
        </h2>
        <p className="text-xs mb-3" style={{ color: 'var(--dim)' }}>
          Pick the hours (IST) the agent should run. Changes take effect on the next hour — no deploy needed.
          Hosting fires a run anywhere inside the chosen hour, so treat these as “around 6am”, not “06:00:00”.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 24 }, (_, hour) => {
            const on = settings.runHoursIst.includes(hour);
            const isNow = settings.currentIstHour === hour;
            return (
              <button
                key={hour}
                disabled={busy === 'settings'}
                onClick={() => {
                  const next = on
                    ? settings.runHoursIst.filter((h) => h !== hour)
                    : [...settings.runHoursIst, hour];
                  if (next.length === 0) {
                    setError('Pick at least one hour. To stop the agent entirely, use Pause.');
                    return;
                  }
                  saveSettings({ runHoursIst: next });
                }}
                className="font-data text-xs px-2 py-1.5 rounded-md transition-colors disabled:opacity-50"
                style={{
                  background: on ? 'rgba(16,185,129,0.16)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isNow ? 'var(--accent-soft)' : on ? 'rgba(16,185,129,0.35)' : 'var(--edge)'}`,
                  color: on ? 'var(--accent-soft)' : 'var(--faint)',
                }}
                title={isNow ? 'Current hour' : undefined}
              >
                {String(hour).padStart(2, '0')}
              </button>
            );
          })}
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mt-4 pt-4" style={{ borderTop: '1px solid var(--edge)' }}>
          <NumberField
            label="Links re-checked per run"
            hint="Oldest first. Higher clears the backlog faster."
            value={settings.sweepLimit}
            min={0}
            max={200}
            onSave={(v) => saveSettings({ sweepLimit: v })}
            disabled={busy === 'settings'}
          />
          <NumberField
            label="Max published per run"
            hint="Guard against a registry edit flooding the board."
            value={settings.maxPublishPerRun}
            min={0}
            max={1000}
            onSave={(v) => saveSettings({ maxPublishPerRun: v })}
            disabled={busy === 'settings'}
          />
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold" style={{ color: 'var(--dim)' }}>
              Auto-publish
            </span>
            <button
              onClick={() => saveSettings({ autoPublish: !settings.autoPublish })}
              disabled={busy === 'settings'}
              className="text-xs font-semibold px-3 py-2 rounded-lg text-left transition-colors disabled:opacity-50"
              style={{
                background: settings.autoPublish ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${settings.autoPublish ? 'rgba(16,185,129,0.3)' : 'var(--edge)'}`,
                color: settings.autoPublish ? 'var(--accent-soft)' : 'var(--dim)',
              }}
            >
              {settings.autoPublish ? 'On — verified rows go live' : 'Off — everything waits for approval'}
            </button>
            <span className="text-[11px]" style={{ color: 'var(--faint)' }}>
              Off routes every find to Needs review.
            </span>
          </label>
        </div>
      </section>

      {/* Runs */}
      <section className="rounded-xl p-4" style={cardStyle}>
        <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--faint)' }}>
          Recent runs
        </h2>
        {data.runs.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--faint)' }}>
            No runs recorded yet. Press “Run now” to trigger one.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ color: 'var(--faint)' }}>
                  <th className="text-left font-medium pb-2">Started</th>
                  <th className="text-left font-medium pb-2">Trigger</th>
                  <th className="text-right font-medium pb-2">Published</th>
                  <th className="text-right font-medium pb-2">Held</th>
                  <th className="text-right font-medium pb-2">Re-checked</th>
                  <th className="text-right font-medium pb-2">Retired</th>
                  <th className="text-right font-medium pb-2">Took</th>
                  <th className="text-left font-medium pb-2 pl-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.runs.map((run) => (
                  <tr key={run.id} style={{ borderTop: '1px solid var(--edge)' }}>
                    <td className="py-2 font-data" style={{ color: 'var(--dim)' }}>
                      {new Date(run.startedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td style={{ color: 'var(--faint)' }}>
                      {run.trigger} · {run.slot}
                    </td>
                    <td className="text-right font-data" style={{ color: 'var(--accent-soft)' }}>{run.verified}</td>
                    <td className="text-right font-data" style={{ color: 'var(--warn)' }}>{run.pending}</td>
                    <td className="text-right font-data" style={{ color: 'var(--dim)' }}>{run.rechecked}</td>
                    <td className="text-right font-data" style={{ color: 'var(--danger)' }}>{run.retired}</td>
                    <td className="text-right font-data" style={{ color: 'var(--faint)' }}>
                      {run.durationMs === null ? '—' : `${(run.durationMs / 1000).toFixed(1)}s`}
                    </td>
                    <td className="pl-3">
                      <RunStatus status={run.status} error={run.error} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Rows */}
      <section className="rounded-xl p-4" style={cardStyle}>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {VIEWS.map((v) => {
            const active = view === v.key;
            const count =
              v.key === 'live' ? totals.live : v.key === 'needs-review' ? totals.pending : v.key === 'indirect' ? totals.indirect : null;
            return (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                style={{
                  background: active ? 'rgba(16,185,129,0.14)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${active ? 'rgba(16,185,129,0.3)' : 'var(--edge)'}`,
                  color: active ? 'var(--accent-soft)' : 'var(--dim)',
                }}
              >
                {v.label}
                {count !== null && <span className="font-data ml-1.5">{count}</span>}
              </button>
            );
          })}
        </div>

        {data.rows.length === 0 ? (
          <p className="text-xs py-6 text-center" style={{ color: 'var(--faint)' }}>
            Nothing here.
          </p>
        ) : (
          <ul className="space-y-2">
            {data.rows.map((row) => (
              <RowCard key={row.id} row={row} busy={busy === row.id} onAct={act} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SetupNeeded() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--fg)' }}>
        One step left
      </h1>
      <p className="text-sm mt-2" style={{ color: 'var(--dim)' }}>
        The agent&rsquo;s tables have not been created yet, so there is nothing to show.
        Apply the two migrations and this page fills in.
      </p>

      <pre
        className="font-data text-xs rounded-xl p-4 mt-5 overflow-x-auto"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--edge)', color: 'var(--accent-soft)' }}
      >
{`supabase db push

# or paste these into the Supabase SQL editor, in order:
#   supabase/migrations/013_opportunities_agent.sql
#   supabase/migrations/014_opportunity_admin.sql`}
      </pre>

      <p className="text-xs mt-4" style={{ color: 'var(--faint)' }}>
        Then reload this page and press <span style={{ color: 'var(--accent-soft)' }}>Run now</span>.
        The first run takes a couple of minutes and reads about 7,000 postings.
      </p>

      <p className="text-xs mt-4" style={{ color: 'var(--faint)' }}>
        Nothing on the public board changes until then &mdash; /opportunities keeps serving
        the Google Sheet exactly as it does today.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  accent,
  sub,
  live,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
  sub?: string;
  live?: boolean;
}) {
  return (
    <div className="rounded-xl p-3" style={cardStyle}>
      <div className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: 'var(--faint)' }}>
        <span style={{ color: accent }}>{icon}</span>
        {label}
        {live && (
          <span className="w-1.5 h-1.5 rounded-full animate-pulse ml-0.5" style={{ background: accent }} aria-hidden />
        )}
      </div>
      <div className="font-data text-2xl mt-1" style={{ color: 'var(--fg)' }}>
        {value.toLocaleString('en-IN')}
      </div>
      {sub && (
        <div className="text-[11px] mt-0.5" style={{ color: 'var(--faint)' }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function RunStatus({ status, error }: { status: string; error: string | null }) {
  const colour =
    status === 'success'
      ? 'var(--accent-soft)'
      : status === 'partial'
        ? 'var(--warn)'
        : status === 'failed'
          ? 'var(--danger)'
          : 'var(--dim)';
  return (
    <span className="inline-flex items-center gap-1.5" style={{ color: colour }} title={error ?? undefined}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: colour }} aria-hidden />
      {status}
      {error && <span style={{ color: 'var(--faint)' }}>· {error.slice(0, 40)}…</span>}
    </span>
  );
}

function NumberField({
  label,
  hint,
  value,
  min,
  max,
  onSave,
  disabled,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onSave: (value: number) => void;
  disabled: boolean;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const changed = draft !== String(value);

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold" style={{ color: 'var(--dim)' }}>
        {label}
      </span>
      <div className="flex gap-1.5">
        <input
          type="number"
          min={min}
          max={max}
          value={draft}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          className="font-data text-xs px-3 py-2 rounded-lg w-full outline-none disabled:opacity-50"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--edge)', color: 'var(--fg)' }}
        />
        {changed && (
          <button
            onClick={() => onSave(Number(draft))}
            disabled={disabled}
            className="text-xs font-semibold px-3 rounded-lg disabled:opacity-50"
            style={{ background: 'var(--accent)', color: '#04140d' }}
          >
            Save
          </button>
        )}
      </div>
      <span className="text-[11px]" style={{ color: 'var(--faint)' }}>
        {hint}
      </span>
    </label>
  );
}

function RowCard({
  row,
  busy,
  onAct,
}: {
  row: Row;
  busy: boolean;
  onAct: (action: string, id?: string, extra?: Record<string, unknown>) => void;
}) {
  const removed = row.retired_at !== null;
  const indirect = row.is_direct_apply === false;

  return (
    <li
      className="rounded-lg p-3 flex flex-wrap items-start gap-3"
      style={{
        background: 'var(--surface-2)',
        border: `1px solid ${indirect ? 'rgba(251,191,36,0.25)' : 'var(--edge)'}`,
        opacity: removed ? 0.55 : 1,
      }}
    >
      <div className="flex-1 min-w-[16rem]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-sm" style={{ color: 'var(--fg)' }}>
            {row.organization}
          </span>
          <span className="text-[11px] font-data px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--faint)' }}>
            {row.kind}
          </span>
          {row.source_tier === 'aggregator' && (
            <span className="text-[11px]" style={{ color: 'var(--warn)' }}>
              second-hand
            </span>
          )}
          {indirect && (
            <span className="text-[11px] inline-flex items-center gap-1" style={{ color: 'var(--warn)' }}>
              <Link2Off className="w-3 h-3" /> not a direct apply link
            </span>
          )}
        </div>

        <div className="text-sm mt-0.5" style={{ color: 'var(--dim)' }}>
          {row.title}
        </div>

        <div className="text-[11px] mt-1 flex flex-wrap gap-x-3 gap-y-0.5" style={{ color: 'var(--faint)' }}>
          {row.location && <span>{row.location}</span>}
          {row.compensation && <span className="font-data" style={{ color: 'var(--accent-soft)' }}>{row.compensation}</span>}
          {row.deadline && <span className="font-data">closes {row.deadline}</span>}
          <span>found {ago(row.discovered_at)}</span>
          <span>
            checked {ago(row.last_checked_at)}
            {row.last_check_result && ` · ${row.last_check_result}`}
          </span>
        </div>

        {row.retired_reason && (
          <div className="text-[11px] mt-1" style={{ color: 'var(--danger)' }}>
            {row.retired_reason}
          </div>
        )}
        {!removed && row.signals && row.signals.length > 0 && (
          <div className="text-[11px] mt-1" style={{ color: 'var(--faint)' }}>
            {row.signals.join(' · ')}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <a
          href={row.apply_url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-md transition-colors"
          style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--dim)' }}
          title="Open the application link"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <button
          onClick={() => onAct('recheck', row.id)}
          disabled={busy}
          className="p-1.5 rounded-md transition-colors disabled:opacity-50"
          style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--dim)' }}
          title="Re-check this link now"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
        </button>
        {row.status === 'pending' && !removed && (
          <button
            onClick={() => onAct('approve', row.id)}
            disabled={busy}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-md disabled:opacity-50"
            style={{ background: 'rgba(16,185,129,0.14)', border: '1px solid rgba(16,185,129,0.3)', color: 'var(--accent-soft)' }}
          >
            Publish
          </button>
        )}
        {removed ? (
          <button
            onClick={() => onAct('restore', row.id)}
            disabled={busy}
            className="p-1.5 rounded-md disabled:opacity-50"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--dim)' }}
            title="Restore"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={() => onAct('remove', row.id)}
            disabled={busy}
            className="p-1.5 rounded-md disabled:opacity-50"
            style={{ background: 'rgba(248,113,113,0.1)', color: 'var(--danger)' }}
            title="Remove from the site"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </li>
  );
}
