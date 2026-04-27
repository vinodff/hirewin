'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Trash2, Plus, Search, Briefcase, TrendingUp, X, Check, Edit3, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import AppNav from '@/components/app-nav';
import type { ResumeVersion, ApplicationStatus } from '@/types';
import { APPLICATION_STATUS_LABELS } from '@/types';

/* ─────────── Config ─────────── */

const PIPELINE: { key: ApplicationStatus; label: string; short: string }[] = [
  { key: 'evaluated', label: 'Evaluated', short: 'Eval'      },
  { key: 'applied',   label: 'Applied',   short: 'Applied'   },
  { key: 'responded', label: 'Responded', short: 'Responded' },
  { key: 'interview', label: 'Interview', short: 'Interview' },
  { key: 'offer',     label: 'Offer',     short: 'Offer'     },
];

const STATUS_CFG: Record<ApplicationStatus, { color: string; bg: string; border: string; dot: string; glow: string }> = {
  evaluated: { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)',  border: 'rgba(148,163,184,0.25)', dot: '#64748b', glow: 'rgba(148,163,184,0.2)'  },
  applied:   { color: '#60a5fa', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.35)',  dot: '#3b82f6', glow: 'rgba(59,130,246,0.25)'  },
  responded: { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.35)', dot: '#8b5cf6', glow: 'rgba(167,139,250,0.25)' },
  interview: { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.35)',  dot: '#f59e0b', glow: 'rgba(251,191,36,0.25)'  },
  offer:     { color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.35)',  dot: '#10b981', glow: 'rgba(52,211,153,0.25)'  },
  rejected:  { color: '#f87171', bg: 'rgba(248,113,113,0.1)',  border: 'rgba(248,113,113,0.3)',  dot: '#ef4444', glow: 'rgba(248,113,113,0.2)'  },
  discarded: { color: '#475569', bg: 'rgba(71,85,105,0.08)',   border: 'rgba(71,85,105,0.22)',   dot: '#334155', glow: 'rgba(71,85,105,0.15)'  },
};

const PIPELINE_IDX: Partial<Record<ApplicationStatus, number>> = {
  evaluated: 0, applied: 1, responded: 2, interview: 3, offer: 4,
};

/* ─────────── Helpers ─────────── */

async function patchStatus(id: string, status: ApplicationStatus) {
  await fetch('/api/history', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, application_status: status }),
  });
}

async function patchNote(id: string, note: string) {
  await fetch('/api/history', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, pipeline_note: note }),
  });
}

function formatDate(ds: string) {
  return new Date(ds).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ─────────── Animated counter ─────────── */
function Counter({ value, color }: { value: number; color: string }) {
  const [n, setN] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current;
    const t0 = Date.now();
    const run = () => {
      const p = Math.min((Date.now() - t0) / 600, 1);
      setN(Math.round(from + (value - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(run);
      else prev.current = value;
    };
    requestAnimationFrame(run);
  }, [value]);
  return <span style={{ color }}>{n}</span>;
}

/* ─────────── ATS ring ─────────── */
function Ring({ score }: { score: number }) {
  const S = 48, r = (S - 6) / 2, C = 2 * Math.PI * r;
  const col = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: S, height: S }}>
      <svg width={S} height={S} style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
        <circle cx={S / 2} cy={S / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={3} />
        <circle cx={S / 2} cy={S / 2} r={r} fill="none" stroke={col} strokeWidth={3}
          strokeDasharray={`${(score / 100) * C} ${C}`} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 3px ${col}90)` }} />
      </svg>
      <div className="text-center z-10">
        <div className="text-xs font-bold text-white leading-none">{score}</div>
        <div className="text-[8px] text-slate-600 leading-none">ATS</div>
      </div>
    </div>
  );
}

/* ─────────── Inline stage selector ─────────── */
function StageSelector({ status, versionId, onChange }: {
  status: ApplicationStatus; versionId: string; onChange: (s: ApplicationStatus) => void;
}) {
  const [busy, setBusy] = useState<ApplicationStatus | null>(null);
  const [showTerminal, setShowTerminal] = useState(false);
  const termRef = useRef<HTMLDivElement>(null);

  const isTerminal = status === 'rejected' || status === 'discarded';
  const currentIdx = PIPELINE_IDX[status] ?? -1;

  useEffect(() => {
    function close(e: MouseEvent) {
      if (termRef.current && !termRef.current.contains(e.target as Node)) setShowTerminal(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  async function select(s: ApplicationStatus) {
    if (s === status) return;
    setBusy(s);
    await patchStatus(versionId, s);
    onChange(s);
    setBusy(null);
    setShowTerminal(false);
  }

  return (
    <div className="flex items-center gap-2 px-4 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}
      onClick={(e) => e.stopPropagation()}>

      {/* Terminal state banner */}
      {isTerminal && (
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ color: STATUS_CFG[status].color, background: STATUS_CFG[status].bg, border: `1px solid ${STATUS_CFG[status].border}` }}>
            {status === 'rejected' ? '✕ Rejected' : '⊘ Discarded'}
          </span>
          <button onClick={() => select('evaluated')}
            className="text-xs text-slate-600 hover:text-slate-400 transition-colors underline underline-offset-2">
            Reopen
          </button>
        </div>
      )}

      {/* Pipeline stepper */}
      {!isTerminal && (
        <div className="flex items-center gap-0 flex-1 overflow-x-auto">
          {PIPELINE.map((stage, i) => {
            const cfg = STATUS_CFG[stage.key];
            const isActive = stage.key === status;
            const isPast = currentIdx > i;
            const isBusy = busy === stage.key;
            return (
              <div key={stage.key} className="flex items-center">
                {/* Connector line */}
                {i > 0 && (
                  <div className="w-6 sm:w-10 h-px transition-all duration-500 shrink-0"
                    style={{ background: isPast || isActive ? `linear-gradient(90deg, ${STATUS_CFG[PIPELINE[i-1].key].dot}60, ${cfg.dot}60)` : 'rgba(255,255,255,0.05)' }} />
                )}
                {/* Stage button */}
                <button
                  onClick={() => select(stage.key)}
                  disabled={isBusy}
                  title={stage.label}
                  className="flex flex-col items-center gap-1 group/stage transition-all duration-200 active:scale-95 px-1"
                >
                  <div
                    className="rounded-full transition-all duration-300 flex items-center justify-center"
                    style={{
                      width: isActive ? 20 : 14,
                      height: isActive ? 20 : 14,
                      background: isActive ? cfg.dot : isPast ? `${cfg.dot}50` : 'rgba(255,255,255,0.07)',
                      border: isActive ? `2px solid ${cfg.dot}` : isPast ? 'none' : '1.5px solid rgba(255,255,255,0.1)',
                      boxShadow: isActive ? `0 0 12px ${cfg.glow}, 0 0 4px ${cfg.dot}` : 'none',
                    }}
                  >
                    {isPast && <Check className="w-2 h-2 text-white" strokeWidth={3} />}
                    {isBusy && (
                      <svg className="w-2.5 h-2.5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                        <path fill="currentColor" d="M4 12a8 8 0 018-8v8z" className="opacity-75" />
                      </svg>
                    )}
                  </div>
                  <span
                    className="text-[9px] font-medium whitespace-nowrap transition-colors hidden sm:block"
                    style={{ color: isActive ? cfg.color : isPast ? '#475569' : '#2d3748' }}
                  >
                    {stage.short}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Terminal actions (reject/discard dropdown) */}
      {!isTerminal && (
        <div ref={termRef} className="relative shrink-0">
          <button
            onClick={() => setShowTerminal(!showTerminal)}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-all"
            style={{ color: '#475569', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            title="Mark as rejected or discarded"
          >
            <ChevronDown className="w-3.5 h-3.5" style={{ transform: showTerminal ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
          {showTerminal && (
            <div className="absolute right-0 bottom-full mb-2 rounded-xl overflow-hidden z-50"
              style={{ background: '#0d1526', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 16px 48px rgba(0,0,0,0.8)', minWidth: 140 }}>
              <div className="px-3 py-1.5 text-[10px] text-slate-600 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                Mark as…
              </div>
              {(['rejected', 'discarded'] as ApplicationStatus[]).map((s) => {
                const c = STATUS_CFG[s];
                return (
                  <button key={s} onClick={() => select(s)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium hover:bg-white/5 transition-colors"
                    style={{ color: c.color }}>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.dot }} />
                    {s === 'rejected' ? '✕ Rejected' : '⊘ Discarded'}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────── Note editor ─────────── */
function NoteEditor({ versionId, note, onSave }: { versionId: string; note: string; onSave: (n: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(note);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    await patchNote(versionId, val);
    onSave(val);
    setBusy(false);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="px-4 pb-4" onClick={(e) => e.stopPropagation()}>
        <textarea autoFocus value={val} onChange={(e) => setVal(e.target.value)}
          placeholder="Recruiter name, follow-up date, interview notes…"
          rows={2}
          className="w-full text-xs rounded-xl px-3 py-2.5 text-slate-300 resize-none outline-none"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)' }}
        />
        <div className="flex gap-2 mt-2">
          <button onClick={save} disabled={busy}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}>
            <Check className="w-3 h-3" />{busy ? 'Saving…' : 'Save'}
          </button>
          <button onClick={() => { setVal(note); setEditing(false); }}
            className="text-xs px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)' }}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-3" onClick={(e) => e.stopPropagation()}>
      {note ? (
        <div className="flex items-start gap-2 group/note">
          <p className="text-xs text-slate-600 italic flex-1 line-clamp-1">&#8220;{note}&#8221;</p>
          <button onClick={() => setEditing(true)} className="opacity-0 group-hover/note:opacity-100 transition-opacity shrink-0">
            <Edit3 className="w-3 h-3 text-slate-600 hover:text-slate-400" />
          </button>
        </div>
      ) : (
        <button onClick={() => setEditing(true)}
          className="text-xs text-slate-700 hover:text-slate-500 transition-colors flex items-center gap-1">
          <Edit3 className="w-3 h-3" />Add note
        </button>
      )}
    </div>
  );
}

/* ─────────── Job card ─────────── */
function JobCard({ v, index, onStatusChange, onDelete, onNoteChange }: {
  v: ResumeVersion; index: number;
  onStatusChange: (id: string, s: ApplicationStatus) => void;
  onDelete: (id: string) => void;
  onNoteChange: (id: string, note: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const status = (v.application_status ?? 'evaluated') as ApplicationStatus;
  const cfg = STATUS_CFG[status];
  const initial = (v.company?.[0] ?? v.role?.[0] ?? '?').toUpperCase();

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), index * 60);
    return () => clearTimeout(t);
  }, [index]);

  const COMPANY_LABELS: Record<string, string> = {
    startup: 'Startup', enterprise: 'Enterprise', faang: 'FAANG', agency: 'Agency', nonprofit: 'Nonprofit',
  };

  return (
    <div className="relative rounded-2xl overflow-hidden group"
      style={{
        background: '#0c1220',
        border: '1px solid rgba(255,255,255,0.07)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(14px)',
        transition: `opacity 0.35s ease ${index * 60}ms, transform 0.35s cubic-bezier(0.22,1,0.36,1) ${index * 60}ms`,
        boxShadow: status === 'offer' ? `0 0 32px rgba(16,185,129,0.1)` : 'none',
      }}>

      {/* Top shimmer */}
      <div className="absolute top-0 left-12 right-12 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${cfg.dot}70, transparent)` }} />

      {/* Left status bar */}
      <div className="absolute left-0 top-4 bottom-4 w-0.5 rounded-r"
        style={{ background: cfg.dot, boxShadow: `0 0 6px ${cfg.dot}80` }} />

      {/* Card header row */}
      <Link href={`/history/${v.id}`} className="flex items-center gap-3 px-5 pt-4 pb-3 hover:bg-white/[0.01] transition-colors">
        {/* Avatar */}
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
          style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
          {initial}
        </div>

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white text-sm truncate">
              {v.role && v.company ? `${v.role} at ${v.company}` : v.role || 'Optimization'}
            </h3>
            {status === 'offer' && <span className="text-base animate-bounce">🎉</span>}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs text-slate-600">{formatDate(v.created_at)}</span>
            {v.company_type && (
              <>
                <span className="text-slate-800">·</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#475569' }}>
                  {COMPANY_LABELS[v.company_type] ?? v.company_type}
                </span>
              </>
            )}
            {/* Keywords */}
            {(v.keywords_matched ?? []).slice(0, 2).map((kw) => (
              <span key={kw} className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded-md text-emerald-400"
                style={{ background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.12)' }}>
                {kw}
              </span>
            ))}
          </div>
        </div>

        {/* ATS ring + delete */}
        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.preventDefault()}>
          <Ring score={v.ats_score} />
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(v.id); }}
            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
            style={{ color: '#334155' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.cssText += ';color:#f87171;background:rgba(239,68,68,0.08)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.cssText += ';color:#334155;background:transparent'; }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </Link>

      {/* Note */}
      <NoteEditor versionId={v.id} note={v.pipeline_note ?? ''} onSave={(n) => onNoteChange(v.id, n)} />

      {/* Stage selector — full width at bottom */}
      <StageSelector status={status} versionId={v.id} onChange={(s) => onStatusChange(v.id, s)} />
    </div>
  );
}

/* ─────────── Funnel ─────────── */
function Funnel({ versions }: { versions: ResumeVersion[] }) {
  const total = versions.length;
  if (total === 0) return null;

  const funnelStages = [
    { label: 'Tracked',   color: '#8b5cf6', count: total },
    {
      label: 'Applied', color: '#3b82f6',
      count: versions.filter((v) => ['applied','responded','interview','offer'].includes(v.application_status ?? 'evaluated')).length,
    },
    {
      label: 'Interview', color: '#f59e0b',
      count: versions.filter((v) => ['interview','offer'].includes(v.application_status ?? 'evaluated')).length,
    },
    {
      label: 'Offer', color: '#10b981',
      count: versions.filter((v) => (v.application_status ?? 'evaluated') === 'offer').length,
    },
  ];

  return (
    <div className="rounded-2xl p-5 mb-5" style={{ background: '#0c1220', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white">Pipeline Funnel</h2>
        <span className="text-xs text-slate-600">{total} tracked</span>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {funnelStages.map(({ label, color, count }, i) => {
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const prev = i > 0 ? funnelStages[i - 1].count : total;
          const conv = prev > 0 ? Math.round((count / prev) * 100) : 0;
          return (
            <div key={label}>
              <div className="flex items-end justify-between mb-1.5">
                <span className="text-xs font-semibold" style={{ color }}>{count}</span>
                {i > 0 && count > 0 && (
                  <span className="text-[10px] text-slate-600">{conv}% conv.</span>
                )}
              </div>
              <div className="h-1.5 rounded-full overflow-hidden mb-1" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${pct}%`, background: color, boxShadow: pct > 0 ? `0 0 6px ${color}80` : 'none' }} />
              </div>
              <div className="text-[10px] text-slate-600">{label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────── Page ─────────── */
export default function HistoryPage() {
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<ApplicationStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/history')
      .then((r) => { if (r.status === 401) { window.location.href = '/auth/login?next=/history'; return null; } return r.json(); })
      .then((d) => { if (d) setVersions(d.versions ?? []); })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const handleStatusChange = useCallback((id: string, s: ApplicationStatus) => {
    setVersions((vs) => vs.map((v) => v.id === id ? { ...v, application_status: s } : v));
  }, []);

  const handleNoteChange = useCallback((id: string, note: string) => {
    setVersions((vs) => vs.map((v) => v.id === id ? { ...v, pipeline_note: note } : v));
  }, []);

  async function del(id: string) {
    if (!confirm('Delete this optimization?')) return;
    await fetch('/api/history', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setVersions((vs) => vs.filter((x) => x.id !== id));
  }

  // Counts by status
  const counts: Partial<Record<ApplicationStatus, number>> = {};
  versions.forEach((v) => {
    const s = (v.application_status ?? 'evaluated') as ApplicationStatus;
    counts[s] = (counts[s] ?? 0) + 1;
  });

  const activeCount = versions.filter((v) => ['applied','responded','interview','offer'].includes(v.application_status ?? 'evaluated')).length;

  const filtered = versions.filter((v) => {
    const s = (v.application_status ?? 'evaluated') as ApplicationStatus;
    if (filter !== 'all' && s !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!v.role?.toLowerCase().includes(q) && !v.company?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const STAT_CARDS = [
    { key: 'applied'   as ApplicationStatus, label: 'Applied',   color: '#60a5fa', bg: 'rgba(59,130,246,0.1)',   border: 'rgba(59,130,246,0.25)'   },
    { key: 'interview' as ApplicationStatus, label: 'Interview',  color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',   border: 'rgba(251,191,36,0.25)'   },
    { key: 'offer'     as ApplicationStatus, label: 'Offer',      color: '#34d399', bg: 'rgba(52,211,153,0.1)',   border: 'rgba(52,211,153,0.25)'   },
    { key: 'rejected'  as ApplicationStatus, label: 'Rejected',   color: '#f87171', bg: 'rgba(248,113,113,0.1)',  border: 'rgba(248,113,113,0.22)'  },
  ];

  const FILTER_KEYS = ['all', 'evaluated', 'applied', 'interview', 'offer', 'rejected'] as const;

  return (
    <div className="min-h-screen" style={{ background: '#080d1a' }}>
      <AppNav />
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-purple-400" />
              Job Tracker
            </h1>
            {!loading && (
              <p className="text-sm text-slate-500 mt-0.5">
                {versions.length} resume{versions.length !== 1 ? 's' : ''} · {activeCount} in pipeline
              </p>
            )}
          </div>
          <Link href="/analyze"
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl text-white transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}>
            <Plus className="w-4 h-4" />New Resume
          </Link>
        </div>

        {/* Stat tiles */}
        {!loading && versions.length > 0 && (
          <div className="grid grid-cols-4 gap-3 mb-5">
            {STAT_CARDS.map(({ key, label, color, bg, border }) => {
              const on = filter === key;
              return (
                <button key={key} onClick={() => setFilter(on ? 'all' : key)}
                  className="rounded-2xl p-4 text-center transition-all duration-200 active:scale-[0.97] hover:scale-[1.02]"
                  style={{
                    background: on ? bg : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${on ? border : 'rgba(255,255,255,0.06)'}`,
                    boxShadow: on ? `0 0 20px ${bg}` : 'none',
                  }}>
                  <div className="text-2xl font-extrabold">
                    <Counter value={counts[key] ?? 0} color={on ? color : '#4b5563'} />
                  </div>
                  <div className="text-xs mt-1 font-medium" style={{ color: on ? color : '#374151' }}>{label}</div>
                </button>
              );
            })}
          </div>
        )}

        {/* Funnel */}
        {!loading && <Funnel versions={versions} />}

        {/* Search + filter bar */}
        {!loading && versions.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search role or company…"
                className="w-full text-sm rounded-xl pl-9 pr-9 py-2.5 text-slate-300 outline-none placeholder-slate-700"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex gap-1 p-1 rounded-xl overflow-x-auto"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {FILTER_KEYS.map((key) => {
                const cnt = key === 'all' ? versions.length : (counts[key as ApplicationStatus] ?? 0);
                const on = filter === key;
                return (
                  <button key={key} onClick={() => setFilter(key)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all"
                    style={on ? { background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', color: '#fff' } : { color: '#64748b' }}>
                    {key === 'all' ? 'All' : APPLICATION_STATUS_LABELS[key as ApplicationStatus]}
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={on ? { background: 'rgba(255,255,255,0.2)', color: '#fff' } : { background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>
                      {cnt}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl animate-pulse" style={{ height: 120, background: '#0c1220' }} />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-xl p-4 text-sm text-red-400"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.15)' }}>{error}</div>
        )}

        {/* Empty — no data */}
        {!loading && versions.length === 0 && (
          <div className="rounded-2xl p-14 text-center" style={{ background: '#0c1220', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
              <TrendingUp className="w-7 h-7 text-purple-400" />
            </div>
            <h2 className="font-bold text-white text-lg mb-2">Start your job hunt</h2>
            <p className="text-sm text-slate-500 mb-6 max-w-xs mx-auto">Optimize a resume and track your application here.</p>
            <Link href="/analyze"
              className="inline-flex items-center gap-2 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-all"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}>
              <Plus className="w-4 h-4" />Optimize My First Resume
            </Link>
          </div>
        )}

        {/* Empty — filter no match */}
        {!loading && filtered.length === 0 && versions.length > 0 && (
          <div className="rounded-2xl p-8 text-center" style={{ background: '#0c1220', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-sm text-slate-500 mb-3">No results match your filters.</p>
            <button onClick={() => { setFilter('all'); setSearch(''); }}
              className="text-xs text-purple-400 hover:text-purple-300 transition-colors">Clear filters →</button>
          </div>
        )}

        {/* Cards */}
        <div className="space-y-3">
          {filtered.map((v, i) => (
            <JobCard key={v.id} v={v} index={i}
              onStatusChange={handleStatusChange}
              onDelete={del}
              onNoteChange={handleNoteChange}
            />
          ))}
        </div>

        {!loading && versions.length > 0 && (
          <p className="text-center text-xs text-slate-700 mt-6">{filtered.length} of {versions.length} shown</p>
        )}
      </div>
    </div>
  );
}
