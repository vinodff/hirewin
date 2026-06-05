'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Sparkles, FileText, FileEdit } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppNav from '@/components/app-nav';
import ResumeViewerModal, { type ViewableResume } from '@/components/resume-viewer-modal';
import {
  loadResumes, saveResume, deleteResume, emptyResume, completionPercent,
  type ResumeData,
} from '@/lib/resume-store';

const FREE_LIMIT = 3;

type Tab = 'builder' | 'optimized';

/* ─── AI-optimized resume shape (from /api/history) ─── */
type OptimizedVersion = {
  id: string;
  created_at: string;
  company: string | null;
  role: string | null;
  ats_score: number;
  optimized_ats_score: number | null;
  job_fit_score: number;
  original_resume: string | null;
  optimized_resume: string | null;
};

function CircleProgress({ pct }: { pct: number }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" className="shrink-0">
      <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
      <circle
        cx="22" cy="22" r={r} fill="none"
        stroke="url(#pg)" strokeWidth="3"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform="rotate(-90 22 22)"
      />
      <defs>
        <linearGradient id="pg" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <text x="22" y="26" textAnchor="middle" fontSize="9" fontWeight="700" fill="#e2e8f0">
        {pct}%
      </text>
    </svg>
  );
}

/* ─── ATS score ring (for optimized cards) ─── */
function AtsRing({ score }: { score: number }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const col = score >= 70 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171';
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" className="shrink-0">
      <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
      <circle cx="22" cy="22" r={r} fill="none" stroke={col} strokeWidth="3"
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" transform="rotate(-90 22 22)" />
      <text x="22" y="20" textAnchor="middle" fontSize="10" fontWeight="700" fill="#e2e8f0">{score}</text>
      <text x="22" y="30" textAnchor="middle" fontSize="6" fill="#64748b">ATS</text>
    </svg>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function MyResumesPage() {
  const [tab, setTab]           = useState<Tab>('builder');
  const [resumes, setResumes]   = useState<ResumeData[]>([]);
  const [mounted, setMounted]   = useState(false);
  const router = useRouter();

  // AI-optimized state
  const [optimized, setOptimized]   = useState<OptimizedVersion[]>([]);
  const [optLoading, setOptLoading] = useState(false);
  const [optLoaded, setOptLoaded]   = useState(false);
  const [optError, setOptError]     = useState('');
  const [signedIn, setSignedIn]     = useState<boolean | null>(null);
  const [viewing, setViewing]       = useState<ViewableResume | null>(null);

  // Load builder resumes AND optimized resumes up front. Loading optimized
  // eagerly (not lazily on tab open) lets us show a count badge and auto-open
  // the optimized tab — so AI-optimized resumes are never hidden behind a tab
  // the user didn't think to click.
  useEffect(() => {
    const builderResumes = loadResumes();
    setResumes(builderResumes);
    setMounted(true);

    const wantOptimized = new URLSearchParams(window.location.search).get('tab') === 'optimized';
    if (wantOptimized) setTab('optimized');

    setOptLoading(true);
    fetch('/api/history')
      .then(r => {
        if (r.status === 401) { setSignedIn(false); return null; }
        setSignedIn(true);
        return r.json();
      })
      .then(d => {
        if (d) {
          // Only keep entries that actually have an optimized resume
          const list = (d.versions ?? []).filter((v: OptimizedVersion) => v.optimized_resume);
          setOptimized(list);
          // If the user has optimized resumes but hasn't built any, show the
          // optimized tab by default so their work isn't behind an empty tab.
          if (!wantOptimized && list.length > 0 && builderResumes.length === 0) {
            setTab('optimized');
          }
        }
      })
      .catch(() => setOptError('Failed to load optimized resumes.'))
      .finally(() => { setOptLoading(false); setOptLoaded(true); });
  }, []);

  // If a signed-out user clicks the AI Optimized tab, send them to login.
  function selectTab(next: Tab) {
    if (next === 'optimized' && signedIn === false) {
      window.location.href = '/auth/login?next=/my-resumes?tab=optimized';
      return;
    }
    setTab(next);
  }

  function handleNew() {
    if (resumes.length >= FREE_LIMIT) return;
    const r = emptyResume();
    saveResume(r);
    router.push(`/my-resumes/${r.id}`);
  }

  function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm('Delete this resume?')) return;
    deleteResume(id);
    setResumes(loadResumes());
  }

  const canAdd = resumes.length < FREE_LIMIT;

  return (
    <div className="min-h-screen" style={{ background: '#07070f' }}>
      <AppNav />

      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">My Resumes</h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {tab === 'builder'
                ? `${mounted ? resumes.length : 0} / ${FREE_LIMIT} built`
                : `${optLoaded ? optimized.length : '…'} AI-optimized`}
            </p>
          </div>
          {tab === 'builder' ? (
            <button
              onClick={handleNew}
              disabled={!canAdd}
              className="flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
            >
              <Plus className="w-4 h-4" />
              New Resume
            </button>
          ) : (
            <Link
              href="/analyze"
              className="flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
            >
              <Sparkles className="w-4 h-4" />
              Optimize New
            </Link>
          )}
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 mb-8">
          {([
            { key: 'builder',   label: 'Built by me',   icon: FileEdit, count: mounted ? resumes.length : null },
            { key: 'optimized', label: 'AI Optimized',  icon: Sparkles, count: optLoaded ? optimized.length : null },
          ] as const).map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => selectTab(key)}
              className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl transition-all"
              style={tab === key
                ? { background: 'rgba(124,58,237,0.15)', color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.35)' }
                : { background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <Icon className="w-4 h-4" />
              {label}
              {typeof count === 'number' && count > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                  style={tab === key
                    ? { background: 'rgba(196,181,253,0.2)', color: '#ddd6fe' }
                    : { background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ════════ BUILDER TAB ════════ */}
        {tab === 'builder' && (
          <>
            {!mounted && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2].map((i) => (
                  <div key={i} className="rounded-2xl h-52 animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
                ))}
              </div>
            )}

            {mounted && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {resumes.map((r) => {
                  const pct = completionPercent(r);
                  return (
                    <div
                      key={r.id}
                      className="rounded-2xl p-5 flex flex-col gap-3 cursor-pointer group transition-all hover:-translate-y-0.5"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.07)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-bold text-white text-base truncate">{r.title}</h3>
                          <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>
                            {r.personalInfo.fullName || 'No name yet'}
                          </p>
                          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
                            Edited {timeAgo(r.updatedAt)}
                          </p>
                        </div>
                        <CircleProgress pct={pct} />
                      </div>

                      <div className="flex items-center gap-2 mt-auto pt-1">
                        <button
                          onClick={() => router.push(`/my-resumes/${r.id}`)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                          style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, r.id)}
                          className="p-2.5 rounded-xl text-slate-600 hover:text-red-400 transition-colors"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
                          aria-label="Delete resume"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {canAdd && (
                  <button
                    onClick={handleNew}
                    className="rounded-2xl min-h-[180px] flex flex-col items-center justify-center gap-2 transition-all group"
                    style={{ background: 'transparent', border: '1.5px dashed rgba(255,255,255,0.12)' }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center transition-all group-hover:scale-110"
                      style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}
                    >
                      <Plus className="w-5 h-5 text-purple-400" />
                    </div>
                    <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      New Resume
                    </span>
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* ════════ AI OPTIMIZED TAB ════════ */}
        {tab === 'optimized' && (
          <>
            {optLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="rounded-2xl h-44 animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
                ))}
              </div>
            )}

            {optError && (
              <div className="rounded-xl p-4 text-sm text-red-400"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                {optError}
              </div>
            )}

            {/* Empty */}
            {optLoaded && !optError && optimized.length === 0 && (
              <div className="rounded-2xl p-12 text-center"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                  style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
                  <Sparkles className="w-6 h-6 text-purple-400" />
                </div>
                <h2 className="font-bold text-white text-lg mb-2">No optimized resumes yet</h2>
                <p className="text-sm text-slate-500 mb-6 max-w-xs mx-auto">
                  Run the AI optimizer on your resume against a job description — the results will be saved here.
                </p>
                <Link href="/analyze"
                  className="inline-flex items-center gap-2 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-all active:scale-95"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#3b82f6)' }}>
                  <Sparkles className="w-4 h-4" />Optimize My Resume
                </Link>
              </div>
            )}

            {/* Cards */}
            {optLoaded && optimized.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {optimized.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => setViewing(v)}
                    className="rounded-2xl p-5 flex flex-col gap-3 cursor-pointer group transition-all hover:-translate-y-0.5"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-bold text-white text-base truncate">{v.role ?? 'Optimized Resume'}</h3>
                        <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>
                          {v.company ?? '—'}
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
                          {timeAgo(v.created_at)}
                        </p>
                      </div>
                      <AtsRing score={v.optimized_ats_score ?? v.ats_score} />
                    </div>

                    <button
                      onClick={(e) => { e.stopPropagation(); setViewing(v); }}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 mt-auto"
                      style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      View &amp; Download
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Before/after viewer */}
      {viewing && <ResumeViewerModal v={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
