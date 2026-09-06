'use client';

import { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  TrendingUp,
  FileCheck2,
  Lock,
} from 'lucide-react';
import Link from 'next/link';

type DemoCandidate = {
  role: string;
  company: string;
  trustScore: number;
  atsScore: number;
  evidence: {
    skill: string;
    confidence: 'high' | 'medium' | 'low' | 'claimed_only';
    proof: string;
  }[];
  risks: {
    skill: string;
    reason: string;
    prepAdvice: string;
  }[];
};

const CANDIDATES: DemoCandidate[] = [
  {
    role: 'Senior Full Stack Engineer',
    company: 'Stripe Target Application',
    trustScore: 94,
    atsScore: 91,
    evidence: [
      {
        skill: 'Distributed Systems & Microservices',
        confidence: 'high',
        proof: 'Verified from 3-year tenure at Wipro: scaled Spring Boot services to 2M+ daily transactions.',
      },
      {
        skill: 'React 19 & Next.js Architecture',
        confidence: 'high',
        proof: 'Verified: Led frontend migration cutting LCP by 42% across 6 core production routes.',
      },
      {
        skill: 'Kubernetes & Docker Orchestration',
        confidence: 'medium',
        proof: 'Partial: Referenced in CI/CD pipeline automation; recommended to elaborate on cluster management.',
      },
      {
        skill: 'Kafka Streaming',
        confidence: 'claimed_only',
        proof: 'Unverified: Added to match JD keyword without prior project context in source resume.',
      },
    ],
    risks: [
      {
        skill: 'Kafka Streaming',
        reason: 'Recruiter may probe message ordering & partition strategies in round 2.',
        prepAdvice: 'Prepare a clear explanation of how you integrated Kafka consumers or replace with RabbitMQ.',
      },
      {
        skill: 'Kubernetes',
        reason: 'Job requires multi-cluster deployment experience.',
        prepAdvice: 'Highlight your direct involvement with Helm charts and production rollout debugging.',
      },
    ],
  },
  {
    role: 'Lead Product Manager',
    company: 'Swiggy Target Application',
    trustScore: 96,
    atsScore: 89,
    evidence: [
      {
        skill: 'Agile Roadmap & 0-to-1 Product Launch',
        confidence: 'high',
        proof: 'Verified: Owned 3 product verticals, shipped 8 on-time major releases with 99.7% uptime.',
      },
      {
        skill: 'Data-driven A/B Experimentation',
        confidence: 'high',
        proof: 'Verified: Conducted 14 statistical experiments delivering ₹2.4Cr uplift in quarterly GMV.',
      },
      {
        skill: 'SQL & Amplitude Funnel Analytics',
        confidence: 'medium',
        proof: 'Partial: Mentioned in reporting queries; ensure you can explain your cohort retention formulas.',
      },
    ],
    risks: [
      {
        skill: 'SQL Cohort Analysis',
        reason: 'Director of Product will test your metric definitions for user churn.',
        prepAdvice: 'Have your exact conversion funnel framework ready to sketch on a whiteboard.',
      },
    ],
  },
];

const CONFIDENCE_BADGES = {
  high: { label: 'Verified', color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.3)', icon: CheckCircle2 },
  medium: { label: 'Partial', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.3)', icon: HelpCircle },
  low: { label: 'Weak', color: '#fb923c', bg: 'rgba(251,146,60,0.1)', border: 'rgba(251,146,60,0.3)', icon: HelpCircle },
  claimed_only: { label: 'Unverified', color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.3)', icon: AlertTriangle },
};

export default function TrustEngineShowcase() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [activeView, setActiveView] = useState<'evidence' | 'risks'>('evidence');

  const current = CANDIDATES[selectedIdx];

  return (
    <section className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-28">
      {/* Background glow effects */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, var(--accent), transparent 70%)' }}
      />

      {/* Header */}
      <div className="text-center mb-14">
        <div
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold text-accent-300 mb-4"
          style={{
            background: 'rgba(var(--accent-rgb), 0.1)',
            border: '1px solid rgba(var(--accent-rgb), 0.25)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          The HireWin Differentiator
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.05] mb-5">
          Other AI invents claims.<br className="hidden sm:block" />
          <span className="gradient-text">HireWin backs every claim with proof.</span>
        </h2>
        <p className="text-slate-400 text-sm sm:text-lg max-w-2xl mx-auto leading-relaxed">
          The biggest risk of AI resumes is failing technical questions. Our Trust Engine maps your claims to evidence and flags interview risks before recruiters see them.
        </p>
      </div>

      {/* Role Switcher Pill */}
      <div className="flex justify-center mb-8">
        <div
          className="inline-flex p-1.5 rounded-2xl gap-2"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {CANDIDATES.map((c, i) => (
            <button
              key={c.role}
              onClick={() => setSelectedIdx(i)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                selectedIdx === i
                  ? 'bg-accent-500/20 text-white border border-accent-500/40 shadow-lg shadow-accent-500/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {c.role}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Trust Dashboard Box */}
      <div
        className="rounded-3xl p-6 sm:p-10 relative overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #0a1124, #070c18)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 30px 80px -20px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)',
        }}
      >
        {/* Top bar of dashboard */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono uppercase tracking-widest text-slate-400">Live Trust Engine Audit</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mt-1">{current.role}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{current.company}</p>
          </div>

          {/* Scores Badges */}
          <div className="flex items-center gap-3">
            <div
              className="px-4 py-2.5 rounded-2xl flex items-center gap-3"
              style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)' }}
            >
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Trust Score</div>
                <div className="text-lg font-extrabold text-emerald-400 leading-tight">{current.trustScore}/100</div>
              </div>
            </div>

            <div
              className="px-4 py-2.5 rounded-2xl flex items-center gap-3"
              style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.25)' }}
            >
              <TrendingUp className="w-5 h-5 text-blue-400" />
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">ATS Match</div>
                <div className="text-lg font-extrabold text-blue-400 leading-tight">{current.atsScore}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs (Evidence Map vs Interview Risk Alerts) */}
        <div className="flex gap-3 my-6">
          <button
            onClick={() => setActiveView('evidence')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeView === 'evidence'
                ? 'bg-white/10 text-white border border-white/20'
                : 'text-slate-400 hover:text-slate-200 bg-white/[0.02]'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Skill Evidence Map ({current.evidence.length})
          </button>
          <button
            onClick={() => setActiveView('risks')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeView === 'risks'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200 bg-white/[0.02]'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            Interview Risk Alerts ({current.risks.length})
          </button>
        </div>

        {/* Content Panel */}
        {activeView === 'evidence' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {current.evidence.map((item, idx) => {
              const badge = CONFIDENCE_BADGES[item.confidence];
              const Icon = badge.icon;

              return (
                <div
                  key={idx}
                  className="rounded-2xl p-4 transition-all duration-200 hover:bg-white/[0.04]"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-sm font-bold text-white truncate">{item.skill}</span>
                    <span
                      className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0"
                      style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}
                    >
                      <Icon className="w-3 h-3" />
                      {badge.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.proof}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            {current.risks.map((risk, idx) => (
              <div
                key={idx}
                className="rounded-2xl p-4 sm:p-5"
                style={{
                  background: 'rgba(251,191,36,0.04)',
                  border: '1px solid rgba(251,191,36,0.18)',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-bold text-amber-200">Interview Probe: {risk.skill}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                  <strong className="text-amber-400/90 font-semibold">Why Recruiter Will Ask: </strong>
                  {risk.reason}
                </p>
                <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-xs text-emerald-300 flex items-start gap-2">
                  <span className="text-emerald-400 font-bold shrink-0">💡 Strategy:</span>
                  <span>{risk.prepAdvice}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bottom Trust Seal & Value Box */}
        <div className="mt-8 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Lock className="w-4 h-4" />
            </div>
            <span>Never get caught off-guard. 100% of generated bullet points map to your proven track record.</span>
          </div>

          <Link
            href="/analyze"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-[var(--on-accent)] font-bold px-6 py-3 rounded-xl text-sm transition-all hover:scale-105 active:scale-95 btn-accent shrink-0"
            style={{ background: 'var(--accent-fill)' }}
          >
            Audit My Resume Score
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
