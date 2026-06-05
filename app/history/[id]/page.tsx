'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Calendar, Building2, Loader2, Copy, Check, CheckCircle, TrendingUp } from 'lucide-react';
import type { ResumeVersion } from '@/types';
import AppNav from '@/components/app-nav';
import ScoreHero from '@/components/score-hero';
import TrustPanel from '@/components/trust-panel';
import BeforeAfter from '@/components/before-after';
import KeywordChips from '@/components/keyword-chips';
import SkillGapList from '@/components/skill-gap-list';
import DownloadButtons from '@/components/download-buttons';
import BrandLoader from '@/components/brand-loader';

// Browser-only features (mic, speech) — load client-side, same as the analyze page.
const VoiceInterview = dynamic(() => import('@/components/voice-interview'), { ssr: false });
const SelfDescription = dynamic(() => import('@/components/self-description'), { ssr: false });

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
          <div className="rounded-2xl py-16 flex justify-center" style={cardStyle}>
            <BrandLoader inline label="Loading analysis" />
          </div>
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

            {/* 1 · Resume Score Analysis */}
            <ScoreHero
              atsScore={version.ats_score}
              jobFitScore={version.job_fit_score}
              optimizedAtsScore={version.optimized_ats_score}
            />

            {/* 2 · Before / After */}
            <BeforeAfter
              original={version.original_resume}
              optimized={version.optimized_resume}
              atsScore={version.ats_score}
              jobFitScore={version.job_fit_score}
              optimizedAtsScore={version.optimized_ats_score}
            />

            {/* 3 · Download your resume */}
            <DownloadButtons optimizedResume={version.optimized_resume} versionId={version.id} beforeScore={version.ats_score} afterScore={version.optimized_ats_score ?? undefined} />

            {/* 4 · Keyword Coverage */}
            <KeywordChips
              matched={version.keywords_matched ?? []}
              missing={version.keywords_missing ?? []}
            />

            {/* 5 · Trust & Evidence */}
            <TrustPanel
              variant="evidence"
              trustScore={version.trust_score ?? undefined}
              skillEvidence={version.skill_evidence ?? undefined}
            />

            {/* 6 · Skill Gaps */}
            <SkillGapList gaps={version.skill_gaps ?? []} />

            {/* 7 · Interview Risk Alerts */}
            <TrustPanel
              variant="risks"
              interviewRisks={version.interview_risks ?? undefined}
            />

            {/* 8 · Self-Introduction Generator */}
            <SelfDescription
              resumeText={version.optimized_resume}
              role={version.role}
              company={version.company}
              jdText={version.jd_text ?? undefined}
            />

            {/* 9 · HireWin Interview (live voice mock interview) */}
            <VoiceInterview
              resumeText={version.optimized_resume}
              role={version.role}
              company={version.company}
              jdText={version.jd_text ?? undefined}
              versionId={version.id}
            />

            {/* Saved interview report, if one exists */}
            {version.evaluation_report && <InterviewResultsSection report={JSON.parse(version.evaluation_report)} />}

            {/* 10 · Cold Outreach */}
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

type InterviewReport = {
  overallScore: number;
  selectionChance: 'High' | 'Medium' | 'Low';
  summary: string;
  strengths: string[];
  improvements: string[];
  questionFeedback: Array<{
    question: string;
    score: number;
    feedback: string;
    betterAnswer: string;
  }>;
};

const CHANCE_STYLES = {
  High:   { color: '#34d399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.25)',  icon: '🎯' },
  Medium: { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)',  icon: '⚡' },
  Low:    { color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)', icon: '📈' },
};

function InterviewResultsSection({ report }: { report: InterviewReport }) {
  const r = 36, circ = 2 * Math.PI * r, dash = (report.overallScore / 100) * circ;
  const scoreColor = report.overallScore >= 75 ? '#34d399' : report.overallScore >= 55 ? '#fbbf24' : '#f87171';
  const chance = CHANCE_STYLES[report.selectionChance];

  return (
    <div className="space-y-5">
      <div className="rounded-xl p-5 flex flex-col sm:flex-row items-center gap-5"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
          <svg className="absolute inset-0 -rotate-90" width="96" height="96">
            <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
            <circle cx="48" cy="48" r={r} fill="none" stroke={scoreColor} strokeWidth="6"
              strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
          </svg>
          <div className="text-center z-10">
            <div className="text-2xl font-black text-white leading-none">{report.overallScore}</div>
            <div className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">Score</div>
          </div>
        </div>
        <div className="flex-1 text-center sm:text-left">
          <div className="flex items-center gap-2 justify-center sm:justify-start mb-1.5 flex-wrap">
            <span className="text-base font-bold text-white">Interview Report</span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ background: chance.bg, border: `1px solid ${chance.border}`, color: chance.color }}>
              {chance.icon} {report.selectionChance === 'High' ? 'High chance of selection' : report.selectionChance === 'Medium' ? 'Medium — strengthen key answers' : 'Low — significant practice needed'}
            </span>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">{report.summary}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl p-4"
          style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.18)' }}>
          <div className="flex items-center gap-1.5 mb-2.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Strengths</span>
          </div>
          <ul className="space-y-1.5">
            {report.strengths.map((s, i) => (
              <li key={i} className="text-sm text-slate-300 flex items-start gap-1.5">
                <span className="text-emerald-400 shrink-0 text-xs mt-0.5">✓</span>{s}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl p-4"
          style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.18)' }}>
          <div className="flex items-center gap-1.5 mb-2.5">
            <TrendingUp className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-[11px] font-bold text-yellow-400 uppercase tracking-wider">Areas to Improve</span>
          </div>
          <ul className="space-y-1.5">
            {report.improvements.map((s, i) => (
              <li key={i} className="text-sm text-slate-300 flex items-start gap-1.5">
                <span className="text-yellow-400 shrink-0 text-xs mt-0.5">↗</span>{s}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
          Question Breakdown
        </h4>
        <div className="space-y-3">
          {report.questionFeedback.map((qf, i) => {
            const sc = qf.score >= 8 ? '#34d399' : qf.score >= 6 ? '#fbbf24' : '#f87171';
            return (
              <div key={i} className="rounded-xl p-4"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-bold text-slate-500">Q{i + 1}</span>
                  <span className="text-xs font-black shrink-0" style={{ color: sc }}>{qf.score}/10</span>
                </div>
                <p className="text-sm font-medium text-slate-200 mb-2 leading-snug">{qf.question}</p>
                <div className="h-1 rounded-full mb-2.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full rounded-full" style={{ width: `${qf.score * 10}%`, background: sc }} />
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-2">{qf.feedback}</p>
                {qf.betterAnswer && (
                  <div className="rounded-lg p-3"
                    style={{ background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.15)' }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-purple-400 mb-1">Stronger Answer</p>
                    <p className="text-xs text-slate-300 leading-relaxed">{qf.betterAnswer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
