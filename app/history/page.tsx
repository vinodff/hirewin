'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Trash2, Plus, Search, Briefcase, TrendingUp, X, Check, ChevronRight, Edit3 } from 'lucide-react';
import Link from 'next/link';
import AppNav from '@/components/app-nav';
import type { ResumeVersion, ApplicationStatus } from '@/types';
import { APPLICATION_STATUS_LABELS } from '@/types';

/* ─── Status config ─── */

const STATUS_CFG: Record<ApplicationStatus, { label: string; color: string; bg: string; border: string; dot: string }> = {
  evaluated: { label: 'Evaluated', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)',  border: 'rgba(148,163,184,0.25)', dot: '#64748b' },
  applied:   { label: 'Applied',   color: '#60a5fa', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.35)',  dot: '#3b82f6' },
  responded: { label: 'Responded', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.35)', dot: '#8b5cf6' },
  interview: { label: 'Interview', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.35)',  dot: '#f59e0b' },
  offer:     { label: '🎉 Offer',  color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.35)',  dot: '#10b981' },
  rejected:  { label: 'Rejected',  color: '#f87171', bg: 'rgba(248,113,113,0.1)',  border: 'rgba(248,113,113,0.3)',  dot: '#ef4444' },
  discarded: { label: 'Discarded', color: '#475569', bg: 'rgba(71,85,105,0.08)',   border: 'rgba(71,85,105,0.22)',  dot: '#334155' },
};

const MAIN_STAGES: ApplicationStatus[] = ['evaluated', 'applied', 'responded', 'interview', 'offer'];
const ALL_STAGES: ApplicationStatus[]  = ['evaluated', 'applied', 'responded', 'interview', 'offer', 'rejected', 'discarded'];

/* ─── API helpers ─── */

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

function fmt(ds: string) {
  return new Date(ds).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/* ─── ATS ring ─── */
function Ring({ score }: { score: number }) {
  const S = 44, r = (S - 6) / 2, C = 2 * Math.PI * r;
  const col = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div className="relative shrink-0" style={{ width: S, height: S }}>
      <svg width={S} height={S} style={{ transform: 'rotate(-90deg)', position: 'absolute', inset: 0 }}>
        <circle cx={S/2} cy={S/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={3} />
        <circle cx={S/2} cy={S/2} r={r} fill="none" stroke={col} strokeWidth={3}
          strokeDasharray={`${(score/100)*C} ${C}`} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 3px ${col}90)` }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs font-bold text-white leading-none">{score}</span>
        <span className="text-[8px] text-slate-600 leading-none mt-0.5">ATS</span>
      </div>
    </div>
  );
}

/* ─── Status pill row ─── */
function StatusRow({ status, versionId, onChange }: {
  status: ApplicationStatus; versionId: string; onChange: (s: ApplicationStatus) => void;
}) {
  const [busy, setBusy] = useState<ApplicationStatus | null>(null);

  async function select(s: ApplicationStatus) {
    if (s === status || busy) return;
    setBusy(s);
    onChange(s); // optimistic
    await patchStatus(versionId, s);
    setBusy(null);
  }

  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-none px-4 pb-3 pt-1"
      onClick={(e) => e.stopPropagation()}>
      {ALL_STAGES.map((s) => {
        const cfg = STATUS_CFG[s];
        const active = s === status;
        const loading = busy === s;
        return (
          <button key={s} onClick={() => select(s)}
            className="shrink-0 flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full transition-all duration-150 active:scale-95"
            style={{
              background: active ? cfg.bg : 'rgba(255,255,255,0.03)',
              border: `1px solid ${active ? cfg.border : 'rgba(255,255,255,0.07)'}`,
              color: active ? cfg.color : '#475569',
              minHeight: 32,
            }}>
            {loading ? (
              <svg className="w-3 h-3 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                <path fill="currentColor" d="M4 12a8 8 0 018-8v8z" className="opacity-75" />
              </svg>
            ) : active ? (
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.dot }} />
            ) : null}
            {cfg.label}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Note editor ─── */
function NoteEditor({ versionId, note, onSave }: {
  versionId: string; note: string; onSave: (n: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(note);
  const [busy, setBusy] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (editing) taRef.current?.focus(); }, [editing]);

  async function save() {
    setBusy(true);
    await patchNote(versionId, val.trim());
    onSave(val.trim());
    setBusy(false);
    setEditing(false);
  }

  function cancel() { setVal(note); setEditing(false); }

  if (editing) {
    return (
      <div className="px-4 pb-3" onClick={(e) => e.stopPropagation()}>
        <textarea ref={taRef} value={val} onChange={(e) => setVal(e.target.value)}
          placeholder="Recruiter name, follow-up date, interview notes…"
          rows={2}
          className="w-full text-xs rounded-xl px-3 py-2.5 text-slate-300 resize-none outline-none"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)' }}
        />
        <div className="flex gap-2 mt-2">
          <button onClick={save} disabled={busy}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-semibold text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#3b82f6)', minHeight: 32 }}>
            <Check className="w-3 h-3" />{busy ? 'Saving…' : 'Save'}
          </button>
          <button onClick={cancel}
            className="text-xs px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', minHeight: 32 }}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <button onClick={(e) => { e.stopPropagation(); setEditing(true); }}
      className="mx-4 mb-3 flex items-start gap-2 text-left w-[calc(100%-2rem)] group/note"
      style={{ minHeight: 28 }}>
      <Edit3 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-700 group-hover/note:text-slate-500 transition-colors" />
      {note ? (
        <span className="text-xs text-slate-600 italic line-clamp-1 group-hover/note:text-slate-500 transition-colors">
          {note}
        </span>
      ) : (
        <span className="text-xs text-slate-700 group-hover/note:text-slate-500 transition-colors">Add note…</span>
      )}
    </button>
  );
}

/* ─── Job card ─── */
function JobCard({ v, index, onStatusChange, onDelete, onNoteChange }: {
  v: ResumeVersion; index: number;
  onStatusChange: (id: string, s: ApplicationStatus) => void;
  onDelete: (id: string) => void;
  onNoteChange: (id: string, note: string) => void;
}) {
  const [vis, setVis] = useState(false);
  const status = (v.application_status ?? 'evaluated') as ApplicationStatus;
  const cfg = STATUS_CFG[status];
  const initial = (v.company?.[0] ?? v.role?.[0] ?? '?').toUpperCase();

  useEffect(() => {
    const t = setTimeout(() => setVis(true), index * 50);
    return () => clearTimeout(t);
  }, [index]);

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{
        background: '#0c1220',
        border: `1px solid ${status === 'offer' ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.07)'}`,
        boxShadow: status === 'offer' ? '0 0 28px rgba(16,185,129,0.08)' : 'none',
        opacity: vis ? 1 : 0,
        transform: vis ? 'none' : 'translateY(10px)',
        transition: `opacity 0.3s ease ${index * 50}ms, transform 0.3s cubic-bezier(0.22,1,0.36,1) ${index * 50}ms`,
      }}>

      {/* Left accent */}
      <div className="absolute" style={{ display:'none' }} />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        {/* Left status stripe */}
        <div className="w-1 self-stretch rounded-full shrink-0" style={{ background: cfg.dot, boxShadow: `0 0 8px ${cfg.dot}60`, minHeight: 40 }} />

        {/* Avatar */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
          style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
          {initial}
        </div>

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <Link href={`/history/${v.id}`}
            className="font-semibold text-white text-sm sm:text-base truncate block hover:text-purple-300 transition-colors">
            {v.role && v.company ? `${v.role} · ${v.company}` : v.role || 'Optimization'}
          </Link>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[11px] text-slate-600">{fmt(v.created_at)}</span>
            {(v.keywords_matched ?? []).slice(0, 2).map((kw) => (
              <span key={kw} className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded-md text-emerald-400"
                style={{ background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.1)' }}>
                {kw}
              </span>
            ))}
          </div>
        </div>

        {/* ATS ring */}
        <Ring score={v.ats_score} />

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Link href={`/history/${v.id}`}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-all"
            title="View details">
            <ChevronRight className="w-4 h-4" />
          </Link>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(v.id); }}
            className="p-2 rounded-lg text-slate-700 hover:text-red-400 hover:bg-red-500/10 transition-all"
            title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Note */}
      <NoteEditor versionId={v.id} note={v.pipeline_note ?? ''} onSave={(n) => onNoteChange(v.id, n)} />

      {/* Status pills */}
      <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <StatusRow status={status} versionId={v.id} onChange={(s) => onStatusChange(v.id, s)} />
      </div>
    </div>
  );
}

/* ─── Summary bar ─── */
function SummaryBar({ versions }: { versions: ResumeVersion[] }) {
  const total = versions.length;
  if (total === 0) return null;

  const stages = [
    { label: 'Applied',   count: versions.filter(v => ['applied','responded','interview','offer'].includes(v.application_status ?? 'evaluated')).length, color: '#3b82f6' },
    { label: 'Interview', count: versions.filter(v => ['interview','offer'].includes(v.application_status ?? 'evaluated')).length,                       color: '#f59e0b' },
    { label: 'Offer',     count: versions.filter(v => (v.application_status ?? 'evaluated') === 'offer').length,                                         color: '#10b981' },
    { label: 'Rejected',  count: versions.filter(v => (v.application_status ?? 'evaluated') === 'rejected').length,                                      color: '#ef4444' },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-5">
      {stages.map(({ label, count, color }) => (
        <div key={label} className="rounded-xl p-3 sm:p-4 text-center"
          style={{ background: '#0c1220', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="text-xl sm:text-2xl font-extrabold" style={{ color }}>{count}</div>
          <div className="text-[10px] sm:text-xs mt-0.5 text-slate-600">{label}</div>
        </div>
      ))}
    </div>
  );
}

/* ─── Skeleton ─── */
function Skeleton() {
  return (
    <div className="space-y-3">
      {[1,2,3].map(i => (
        <div key={i} className="rounded-2xl overflow-hidden animate-pulse" style={{ background: '#0c1220', height: 140 }}>
          <div className="flex items-center gap-3 px-4 pt-4 pb-3">
            <div className="w-1 h-10 rounded-full bg-white/5" />
            <div className="w-10 h-10 rounded-xl bg-white/5" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-white/5 rounded w-2/3" />
              <div className="h-2.5 bg-white/5 rounded w-1/3" />
            </div>
            <div className="w-11 h-11 rounded-full bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Page ─── */
export default function HistoryPage() {
  const [versions, setVersions]   = useState<ResumeVersion[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [filter, setFilter]       = useState<ApplicationStatus | 'all'>('all');
  const [search, setSearch]       = useState('');

  useEffect(() => {
    fetch('/api/history')
      .then(r => {
        if (r.status === 401) { window.location.href = '/auth/login?next=/history'; return null; }
        return r.json();
      })
      .then(d => { if (d) setVersions(d.versions ?? []); })
      .catch(() => setError('Failed to load history.'))
      .finally(() => setLoading(false));
  }, []);

  const handleStatusChange = useCallback((id: string, s: ApplicationStatus) => {
    setVersions(vs => vs.map(v => v.id === id ? { ...v, application_status: s } : v));
  }, []);

  const handleNoteChange = useCallback((id: string, note: string) => {
    setVersions(vs => vs.map(v => v.id === id ? { ...v, pipeline_note: note } : v));
  }, []);

  async function del(id: string) {
    if (!confirm('Delete this entry?')) return;
    await fetch('/api/history', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setVersions(vs => vs.filter(x => x.id !== id));
  }

  const counts: Partial<Record<ApplicationStatus, number>> = {};
  versions.forEach(v => {
    const s = (v.application_status ?? 'evaluated') as ApplicationStatus;
    counts[s] = (counts[s] ?? 0) + 1;
  });

  const activeCount = versions.filter(v => ['applied','responded','interview','offer'].includes(v.application_status ?? 'evaluated')).length;

  const FILTER_TABS: { key: ApplicationStatus | 'all'; label: string }[] = [
    { key: 'all',       label: 'All'       },
    { key: 'applied',   label: 'Applied'   },
    { key: 'interview', label: 'Interview' },
    { key: 'offer',     label: 'Offer'     },
    { key: 'rejected',  label: 'Rejected'  },
  ];

  const filtered = versions.filter(v => {
    const s = (v.application_status ?? 'evaluated') as ApplicationStatus;
    if (filter !== 'all' && s !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (v.role?.toLowerCase().includes(q) || v.company?.toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <div className="min-h-screen" style={{ background: '#080d1a' }}>
      <AppNav />
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-purple-400" />
              Job Tracker
            </h1>
            {!loading && (
              <p className="text-xs text-slate-500 mt-0.5">
                {versions.length} tracked · {activeCount} active
              </p>
            )}
          </div>
          <Link href="/analyze"
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl text-white hover:opacity-90 active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#3b82f6)' }}>
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Resume</span>
            <span className="sm:hidden">New</span>
          </Link>
        </div>

        {/* Summary */}
        {!loading && <SummaryBar versions={versions} />}

        {/* Search */}
        {!loading && versions.length > 0 && (
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search role or company…"
              className="w-full text-sm rounded-xl pl-9 pr-9 py-2.5 text-slate-300 outline-none placeholder-slate-700"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Filter tabs */}
        {!loading && versions.length > 0 && (
          <div className="flex gap-1 overflow-x-auto scrollbar-none mb-5 pb-0.5">
            {FILTER_TABS.map(({ key, label }) => {
              const cnt = key === 'all' ? versions.length : (counts[key as ApplicationStatus] ?? 0);
              const on = filter === key;
              return (
                <button key={key} onClick={() => setFilter(key)}
                  className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-all"
                  style={on
                    ? { background: 'linear-gradient(135deg,#7c3aed,#3b82f6)', color: '#fff' }
                    : { background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid rgba(255,255,255,0.07)' }
                  }>
                  {label}
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                    style={on
                      ? { background: 'rgba(255,255,255,0.2)', color: '#fff' }
                      : { background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }
                    }>{cnt}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Loading */}
        {loading && <Skeleton />}

        {/* Error */}
        {error && (
          <div className="rounded-xl p-4 text-sm text-red-400 mb-4"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
            {error}
          </div>
        )}

        {/* Empty state — no data */}
        {!loading && !error && versions.length === 0 && (
          <div className="rounded-2xl p-12 text-center"
            style={{ background: '#0c1220', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
              <TrendingUp className="w-7 h-7 text-purple-400" />
            </div>
            <h2 className="font-bold text-white text-lg mb-2">Start tracking your job hunt</h2>
            <p className="text-sm text-slate-500 mb-6 max-w-xs mx-auto">
              Optimize a resume, then track every application — interviews, follow-ups, and offers — right here.
            </p>
            <Link href="/analyze"
              className="inline-flex items-center gap-2 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#3b82f6)' }}>
              <Plus className="w-4 h-4" />Optimize My First Resume
            </Link>
          </div>
        )}

        {/* Empty state — filters */}
        {!loading && !error && filtered.length === 0 && versions.length > 0 && (
          <div className="rounded-2xl p-8 text-center"
            style={{ background: '#0c1220', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-sm text-slate-500 mb-3">No results match your filters.</p>
            <button onClick={() => { setFilter('all'); setSearch(''); }}
              className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
              Clear filters →
            </button>
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

        {!loading && versions.length > 2 && (
          <p className="text-center text-xs text-slate-700 mt-6">
            {filtered.length} of {versions.length} shown
          </p>
        )}
      </div>
    </div>
  );
}
