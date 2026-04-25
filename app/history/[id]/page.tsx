'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Building2, Mail, Linkedin, Copy, Check } from 'lucide-react';
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

            <DownloadButtons optimizedResume={version.optimized_resume} versionId={version.id} />

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

            {(version.outreach_email || version.outreach_linkedin) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {version.outreach_email && (
                  <OutreachCard
                    title="Cold Email Draft"
                    icon={<Mail className="w-4 h-4 text-purple-400" />}
                    body={version.outreach_email}
                  />
                )}
                {version.outreach_linkedin && (
                  <OutreachCard
                    title="LinkedIn Connection Note"
                    icon={<Linkedin className="w-4 h-4 text-blue-400" />}
                    body={version.outreach_linkedin}
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function OutreachCard({ title, icon, body }: { title: string; icon: React.ReactNode; body: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-2xl p-6" style={cardStyle}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-semibold text-white">{title}</h3>
        </div>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">{body}</pre>
    </div>
  );
}
