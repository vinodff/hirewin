'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Building2, Loader2, Copy, Check } from 'lucide-react';
import type { ResumeVersion } from '@/types';
import AppNav from '@/components/app-nav';
import AtsGauge from '@/components/ats-gauge';
import BeforeAfter from '@/components/before-after';
import KeywordChips from '@/components/keyword-chips';
import SkillGapList from '@/components/skill-gap-list';
import DownloadButtons from '@/components/download-buttons';

const cardStyle = { background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' };

const companyTypeLabels: Record<string, string> = {
  startup: 'Startup',
  enterprise: 'Enterprise',
  faang: 'FAANG',
  agency: 'Agency',
  nonprofit: 'Nonprofit',
};

export default function HistoryDetailPage() {
  const params = useParams<{ id: string }>();
  const [version, setVersion] = useState<ResumeVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!params?.id) return;
    fetch(`/api/history/${params.id}`)
      .then((r) => {
        if (r.status === 401) { window.location.href = `/auth/login?next=/history/${params.id}`; return null; }
        if (r.status === 404) { setError('Analysis not found or you do not have access.'); return null; }
        return r.json();
      })
      .then((data) => {
        if (data?.version) setVersion(data.version);
      })
      .catch(() => setError('Failed to load analysis'))
      .finally(() => setLoading(false));
  }, [params?.id]);

  return (
    <div className="min-h-screen" style={{ background: '#080d1a' }}>
      <AppNav />

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-5">
        {loading && (
          <div className="rounded-2xl p-12 text-center text-slate-500" style={cardStyle}>Loading…</div>
        )}

        {error && (
          <div className="rounded-2xl p-8 text-center" style={cardStyle}>
            <p className="text-red-400 mb-4">{error}</p>
            <Link href="/history" className="text-purple-400 hover:text-purple-300 text-sm font-medium">
              ← Back to history
            </Link>
          </div>
        )}

        {version && (
          <>
            <header className="rounded-2xl p-6" style={cardStyle}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-white mb-1">
                    {version.role}
                    <span className="text-slate-500 font-normal"> at </span>
                    <span className="gradient-text">{version.company}</span>
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(version.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {companyTypeLabels[version.company_type] ?? version.company_type}
                    </span>
                    <span>{version.career_level}</span>
                  </div>
                </div>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <AtsGauge
                score={version.ats_score}
                label="ATS Score"
                sublabel="Applicant Tracking System match"
              />
              <AtsGauge
                score={version.job_fit_score}
                label="Job Fit Score"
                sublabel="How well you match this role"
                color="emerald"
              />
            </div>

            <DownloadButtons optimizedResume={version.optimized_resume} versionId={version.id} beforeScore={version.ats_score} />

            <BeforeAfter
              original={version.original_resume}
              optimized={version.optimized_resume}
              atsScore={version.ats_score}
            />

            <KeywordChips
              matched={version.keywords_matched ?? []}
              missing={version.keywords_missing ?? []}
            />

            <SkillGapList gaps={version.skill_gaps ?? []} />

            <OutreachSection
              optimizedResume={version.optimized_resume}
              role={version.role}
              company={version.company}
              prefillEmail={version.outreach_email ?? ''}
              prefillLinkedin={version.outreach_linkedin ?? ''}
            />
          </>
        )}
      </div>
    </div>
  );
}

function OutreachSection({
  optimizedResume,
  role,
  company,
  prefillEmail = '',
  prefillLinkedin = '',
}: {
  optimizedResume: string;
  role: string;
  company: string;
  prefillEmail?: string;
  prefillLinkedin?: string;
}) {
  const [tab, setTab]           = useState<'email' | 'linkedin'>('email');
  const [email, setEmail]       = useState(prefillEmail);
  const [linkedin, setLinkedin] = useState(prefillLinkedin);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [copied, setCopied]     = useState(false);

  const generated = email || linkedin;
  const text = tab === 'email' ? email : linkedin;

  async function generate() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optimizedResume, role, company, jdText: '' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setEmail(data.email ?? '');
      setLinkedin(data.linkedin ?? '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    }
    setLoading(false);
  }

  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-2xl p-6" style={cardStyle}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white">Cold Outreach</h3>
        {generated && (
          <button
            onClick={generate}
            disabled={loading}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            Regenerate
          </button>
        )}
      </div>

      {!generated ? (
        <div className="flex flex-col items-center gap-4 py-6">
          <p className="text-sm text-slate-400 text-center max-w-xs">
            Generate a personalised cold email draft and LinkedIn connection note based on your optimised resume.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button
              onClick={() => { setTab('email'); generate(); }}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
              style={{ background: '#ea4335' }}
            >
              {loading && tab === 'email' ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                </svg>
              )}
              Generate Cold Email Draft
            </button>
            <button
              onClick={() => { setTab('linkedin'); generate(); }}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
              style={{ background: '#0a66c2' }}
            >
              {loading && tab === 'linkedin' ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              )}
              Generate LinkedIn Note
            </button>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      ) : (
        <>
          <div className="flex gap-2 mb-4">
            {(['email', 'linkedin'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-4 py-1.5 text-sm rounded-lg font-medium transition-all"
                style={tab === t
                  ? { background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', color: '#fff' }
                  : { background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}
              >
                {t === 'email' ? 'Cold Email' : 'LinkedIn Note'}
              </button>
            ))}
          </div>
          <div className="rounded-xl p-4 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {text}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={copy}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
