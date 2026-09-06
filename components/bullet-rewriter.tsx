'use client';

import { useState } from 'react';
import { ArrowDown, Sparkles, TrendingUp, CheckCircle2, XCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

const ROLES = [
  {
    id: 'sde',
    label: 'Software Engineer',
    job: 'Senior Backend Engineer · Stripe Target',
    jdHint: 'Requires: Spring Boot, distributed microservices, latency optimization, AWS',
    before: 'Worked on Java modules in the team project, wrote unit tests, and fixed bugs in Jira.',
    after: 'Architected 4 Spring Boot microservices handling 2M+ daily transactions, reducing p99 API latency by 42% and eliminating production incidents.',
    tag: 'Latency & Scale',
    atsBefore: 38,
    atsAfter: 94,
    trustScore: 96,
    color: 'var(--accent-soft)',
  },
  {
    id: 'pm',
    label: 'Product Manager',
    job: 'Staff Product Manager · Swiggy Target',
    jdHint: 'Requires: Agile roadmap ownership, A/B experimentation, funnel optimization, GMV growth',
    before: 'Attended daily standups, created user stories, and helped coordinate releases with devs.',
    after: 'Owned 0-to-1 product roadmap for 3 growth verticals; led 14 A/B experiments yielding +38% onboarding conversion and ₹2.4Cr incremental GMV.',
    tag: 'Revenue & Growth',
    atsBefore: 42,
    atsAfter: 91,
    trustScore: 94,
    color: '#60a5fa',
  },
  {
    id: 'data',
    label: 'Data Scientist / Analyst',
    job: 'Senior Data Scientist · Razorpay Target',
    jdHint: 'Requires: Python, SQL, predictive ML models, fraud prevention, KPI dashboards',
    before: 'Built SQL queries for internal stakeholder reports and trained basic machine learning models.',
    after: 'Developed XGBoost fraud-detection model processing ₹180Cr in monthly volume, cutting chargeback disputes by 29% and saving $340k annually.',
    tag: 'Fraud & Revenue Impact',
    atsBefore: 35,
    atsAfter: 95,
    trustScore: 98,
    color: '#34d399',
  },
  {
    id: 'devops',
    label: 'DevOps & Cloud',
    job: 'DevOps / SRE · Uber Target',
    jdHint: 'Requires: Kubernetes, Terraform, CI/CD pipeline modernization, 99.99% SLA',
    before: 'Assisted team with AWS deployment scripts and monitored server alert dashboards.',
    after: 'Automated multi-region Kubernetes clusters via Terraform, slashing deployment lead time from 4h to 8m while maintaining 99.99% service availability.',
    tag: 'SLA & Automation',
    atsBefore: 40,
    atsAfter: 93,
    trustScore: 95,
    color: '#fbbf24',
  },
];

export default function BulletRewriter() {
  const [activeIdx, setActiveIdx] = useState(0);
  const current = ROLES[activeIdx];

  return (
    <div className="space-y-6">
      {/* Role Switcher Tabs */}
      <div className="flex justify-center flex-wrap gap-2">
        {ROLES.map((role, idx) => (
          <button
            key={role.id}
            onClick={() => setActiveIdx(idx)}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
              activeIdx === idx
                ? 'bg-accent-500/20 text-white border border-accent-500/40 shadow-lg shadow-accent-500/10'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-white/5'
            }`}
          >
            {role.label}
          </button>
        ))}
      </div>

      {/* Main Interactive Transformation Card */}
      <div
        className="rounded-3xl overflow-hidden transition-all duration-300"
        style={{
          background: 'linear-gradient(145deg, #0d1428, #080d1a)',
          border: '1px solid rgba(255,255,255,0.09)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
        }}
      >
        {/* Top header bar */}
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b"
          style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-bold text-white">{current.job}</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{current.jdHint}</p>
          </div>

          <div className="flex items-center gap-3">
            <div
              className="px-3 py-1 rounded-lg flex items-center gap-1.5 text-xs font-bold"
              style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              ATS {current.atsBefore} → {current.atsAfter}
            </div>
            <div
              className="px-3 py-1 rounded-lg flex items-center gap-1.5 text-xs font-bold"
              style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.25)' }}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Trust Score: {current.trustScore}/100
            </div>
          </div>
        </div>

        {/* Diff content */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Before */}
          <div className="flex items-start gap-4 p-4 rounded-2xl bg-red-500/[0.04] border border-red-500/15">
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-red-500/15 border border-red-500/30">
              <XCircle className="w-4 h-4 text-red-400" />
            </div>
            <div className="flex-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-400/90 mb-1 block">
                Original Draft (Vague & Passive)
              </span>
              <p className="text-sm sm:text-base text-slate-400 line-through leading-relaxed">
                &ldquo;{current.before}&rdquo;
              </p>
            </div>
          </div>

          {/* Transformation indicator */}
          <div className="flex items-center gap-3 px-4">
            <ArrowDown className="w-4 h-4 text-slate-600" />
            <div className="h-px flex-1 bg-gradient-to-r from-white/10 via-emerald-500/40 to-transparent" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">
              HireWin Metric-Driven Enhancement
            </span>
          </div>

          {/* After */}
          <div className="flex items-start gap-4 p-4 rounded-2xl bg-emerald-500/[0.05] border border-emerald-500/25">
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-emerald-500/15 border border-emerald-500/35">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 mb-1 block">
                Verified Recruiter-Approved Phrasing
              </span>
              <p className="text-sm sm:text-base text-slate-100 font-medium leading-relaxed">
                &ldquo;{current.after}&rdquo;
              </p>
            </div>
          </div>
        </div>

        {/* Card Footer CTA */}
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t"
          style={{ background: 'rgba(255,255,255,0.015)', borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <span className="text-xs text-slate-400 text-center sm:text-left">
            Never invents fake claims. Every metric is calibrated to your real career milestones.
          </span>
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Try it on your resume
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
