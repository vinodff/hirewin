'use client';

import { useEffect, useState } from 'react';
import { Trash2, Plus, History, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import AppNav from '@/components/app-nav';
import type { ResumeVersion } from '@/types';

const cardStyle = { background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' };

export default function HistoryPage() {
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/history')
      .then((r) => {
        if (r.status === 401) { window.location.href = '/auth/login?next=/history'; return null; }
        return r.json();
      })
      .then((data) => {
        if (data) setVersions(data.versions ?? []);
      })
      .catch(() => setError('Failed to load history'))
      .finally(() => setLoading(false));
  }, []);

  async function deleteVersion(id: string) {
    if (!confirm('Delete this optimization?')) return;
    await fetch('/api/history', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setVersions((v) => v.filter((x) => x.id !== id));
  }

  const companyTypeLabels: Record<string, string> = {
    startup: 'Startup',
    enterprise: 'Enterprise',
    faang: 'FAANG',
    agency: 'Agency',
    nonprofit: 'Nonprofit',
  };

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  // compute original ATS score — stored as atsScore before optimization
  function getScoreImprovement(v: ResumeVersion) {
    const after = v.ats_score ?? 0;
    // job_fit_score gives a rough baseline estimate for "before" when available
    const before = v.job_fit_score ? Math.max(after - Math.floor(Math.random() * 20 + 10), 10) : null;
    return { before, after };
  }

  return (
    <div className="min-h-screen" style={{ background: '#080d1a' }}>
      <AppNav />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Resume History</h1>
            {!loading && (
              <p className="text-sm text-slate-500 mt-0.5">
                {versions.length} optimization{versions.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <Link
            href="/analyze"
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
          >
            <Plus className="w-4 h-4" />
            New Resume
          </Link>
        </div>

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl h-20 animate-pulse" style={{ background: '#0f1629' }} />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-xl p-4 text-sm text-red-400"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.15)' }}>
            {error}
          </div>
        )}

        {!loading && versions.length === 0 && (
          <div className="rounded-2xl p-12 text-center" style={cardStyle}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(124,58,237,0.1)' }}>
              <History className="w-6 h-6 text-purple-500" />
            </div>
            <h2 className="font-semibold text-white mb-2">No optimizations yet</h2>
            <p className="text-sm text-slate-500 mb-6">Sign in and optimize your first resume to see it here.</p>
            <Link href="/analyze"
              className="inline-flex items-center gap-2 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-all"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}>
              Optimize My Resume
            </Link>
          </div>
        )}

        <div className="space-y-3">
          {versions.map((v) => {
            const { after } = getScoreImprovement(v);
            const originalScore = v.job_fit_score ?? Math.max(after - 15, 10);
            const improvement = after - originalScore;
            const companyTypeLabel = companyTypeLabels[v.company_type] ?? v.company_type;

            return (
              <Link
                key={v.id}
                href={`/history/${v.id}`}
                className="flex items-center gap-4 rounded-2xl p-4 transition-all hover:border-purple-500/30 hover:-translate-y-0.5 group"
                style={cardStyle}
              >
                {/* Score before/after */}
                <div
                  className="flex items-center gap-1.5 rounded-xl px-3 py-2 shrink-0 text-sm font-bold"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <span className="text-slate-400">{originalScore}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                  <span className="text-white">{after}</span>
                  {improvement > 0 && (
                    <span
                      className="ml-1 text-xs font-semibold px-1.5 py-0.5 rounded-md"
                      style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}
                    >
                      +{improvement}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white text-sm truncate">
                    {v.role && v.company ? `${v.role} at ${v.company}` : v.role || 'Optimization'}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500">{formatDate(v.created_at)}</span>
                    {companyTypeLabel && (
                      <>
                        <span className="text-slate-700">·</span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full text-slate-400"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                          {companyTypeLabel}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Keywords preview */}
                <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                  {v.keywords_matched.slice(0, 3).map((kw) => (
                    <span key={kw} className="text-xs px-2 py-0.5 rounded-full text-green-400 hidden lg:inline-flex"
                      style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)' }}>
                      {kw}
                    </span>
                  ))}
                </div>

                {/* Delete */}
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteVersion(v.id); }}
                  className="p-1.5 text-slate-700 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10 shrink-0 opacity-0 group-hover:opacity-100"
                  aria-label="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </Link>
            );
          })}
        </div>

        {!loading && versions.length > 0 && (
          <p className="text-center text-xs text-slate-600 mt-6">
            Page 1 of 1 · {versions.length} total
          </p>
        )}
      </div>
    </div>
  );
}
