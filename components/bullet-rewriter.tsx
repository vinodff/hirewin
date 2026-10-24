'use client';

import { useState, useRef } from 'react';
import {
  Sparkles,
  TrendingUp,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ShieldCheck,
  Code2,
  BarChart3,
  Database,
  Cloud,
  Zap,
  SlidersHorizontal,
  Flame,
  Check,
} from 'lucide-react';
import Link from 'next/link';

interface RoleData {
  id: string;
  label: string;
  job: string;
  targetCompany: string;
  jdHint: string;
  before: string;
  after: string;
  impactMetrics: { label: string; value: string; color: string }[];
  tag: string;
  atsBefore: number;
  atsAfter: number;
  trustScore: number;
  color: string;
  colorRgb: string;
  icon: typeof Code2;
}

const ROLES: RoleData[] = [
  {
    id: 'sde',
    label: 'Software Engineer',
    job: 'Senior Backend Engineer',
    targetCompany: 'Stripe Target',
    jdHint: 'Requires: Spring Boot, distributed microservices, latency optimization, AWS',
    before: 'Worked on Java modules in the team project, wrote unit tests, and fixed bugs in Jira.',
    after: 'Architected 4 Spring Boot microservices handling 2M+ daily transactions, reducing p99 API latency by 42% and eliminating production incidents.',
    impactMetrics: [
      { label: 'Latency Drop', value: '↓ 42%', color: '#34d399' },
      { label: 'Scale', value: '2M+ Tx/day', color: '#60a5fa' },
      { label: 'Reliability', value: '0 Incidents', color: '#22d3ee' },
    ],
    tag: 'Latency & Scale',
    atsBefore: 38,
    atsAfter: 94,
    trustScore: 96,
    color: '#34d399',
    colorRgb: '52, 211, 153',
    icon: Code2,
  },
  {
    id: 'pm',
    label: 'Product Manager',
    job: 'Staff Product Manager',
    targetCompany: 'Swiggy Target',
    jdHint: 'Requires: Agile roadmap ownership, A/B experimentation, funnel optimization, GMV growth',
    before: 'Attended daily standups, created user stories, and helped coordinate releases with devs.',
    after: 'Owned 0-to-1 product roadmap for 3 growth verticals; led 14 A/B experiments yielding +38% onboarding conversion and ₹2.4Cr incremental GMV.',
    impactMetrics: [
      { label: 'Conversion Jump', value: '+38%', color: '#38bdf8' },
      { label: 'New Revenue', value: '₹2.4Cr GMV', color: '#34d399' },
      { label: 'Velocity', value: '14 A/B Tests', color: '#fbbf24' },
    ],
    tag: 'Revenue & Growth',
    atsBefore: 42,
    atsAfter: 91,
    trustScore: 94,
    color: '#38bdf8',
    colorRgb: '56, 189, 248',
    icon: BarChart3,
  },
  {
    id: 'data',
    label: 'Data Scientist',
    job: 'Senior Data Scientist',
    targetCompany: 'Razorpay Target',
    jdHint: 'Requires: Python, SQL, predictive ML models, fraud prevention, KPI dashboards',
    before: 'Built SQL queries for internal stakeholder reports and trained basic machine learning models.',
    after: 'Developed XGBoost fraud-detection model processing ₹180Cr in monthly volume, cutting chargeback disputes by 29% and saving $340k annually.',
    impactMetrics: [
      { label: 'Annual Savings', value: '$340,000', color: '#34d399' },
      { label: 'Volume Checked', value: '₹180Cr/mo', color: '#60a5fa' },
      { label: 'Disputes Cut', value: '↓ 29%', color: '#f472b6' },
    ],
    tag: 'Fraud & Revenue Impact',
    atsBefore: 35,
    atsAfter: 95,
    trustScore: 98,
    color: '#34d399',
    colorRgb: '52, 211, 153',
    icon: Database,
  },
  {
    id: 'devops',
    label: 'DevOps & SRE',
    job: 'Staff SRE Engineer',
    targetCompany: 'Uber Target',
    jdHint: 'Requires: Kubernetes, Terraform, CI/CD pipeline modernization, 99.99% SLA',
    before: 'Assisted team with AWS deployment scripts and monitored server alert dashboards.',
    after: 'Automated multi-region Kubernetes clusters via Terraform, slashing deployment lead time from 4h to 8m while maintaining 99.99% service availability.',
    impactMetrics: [
      { label: 'Deploy Time', value: '4h → 8m', color: '#fbbf24' },
      { label: 'Uptime SLA', value: '99.99%', color: '#34d399' },
      { label: 'Automation', value: '100% IaC', color: '#38bdf8' },
    ],
    tag: 'SLA & Automation',
    atsBefore: 40,
    atsAfter: 93,
    trustScore: 95,
    color: '#fbbf24',
    colorRgb: '251, 191, 36',
    icon: Cloud,
  },
];

export default function BulletRewriter() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<'both' | 'before' | 'after'>('both');
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const current = ROLES[activeIdx];
  const Icon = current.icon;

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (typeof window !== 'undefined' && window.innerWidth < 768) return; // Keep mobile smooth
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 10;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -10;
    setTilt({ x: y, y: x });
  }

  function handleMouseLeave() {
    setTilt({ x: 0, y: 0 });
  }

  return (
    <div className="space-y-6">
      {/* ── 3D Interactive Role Selector Bar ── */}
      <div className="flex justify-center items-center flex-wrap gap-2.5 sm:gap-3">
        {ROLES.map((role, idx) => {
          const RoleIcon = role.icon;
          const isActive = activeIdx === idx;

          return (
            <button
              key={role.id}
              onClick={() => setActiveIdx(idx)}
              className="group relative flex items-center gap-2 px-3.5 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-300 active:scale-95 cursor-pointer select-none"
              style={{
                background: isActive
                  ? `linear-gradient(135deg, rgba(${role.colorRgb}, 0.22), rgba(${role.colorRgb}, 0.08))`
                  : 'rgba(255,255,255,0.03)',
                border: isActive
                  ? `1px solid rgba(${role.colorRgb}, 0.5)`
                  : '1px solid rgba(255,255,255,0.07)',
                color: isActive ? '#FFFFFF' : '#94A3B8',
                boxShadow: isActive
                  ? `0 10px 24px -6px rgba(${role.colorRgb}, 0.35), inset 0 1px 1px rgba(255,255,255,0.2)`
                  : 'none',
              }}
            >
              <div
                className="w-5 h-5 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
                style={{
                  background: isActive ? `rgba(${role.colorRgb}, 0.25)` : 'rgba(255,255,255,0.05)',
                  color: isActive ? role.color : '#64748B',
                }}
              >
                <RoleIcon className="w-3.5 h-3.5" />
              </div>
              <span>{role.label}</span>
              {isActive && (
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: role.color }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Main 3D Transformation Studio Card ── */}
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative rounded-3xl overflow-hidden transition-all duration-300"
        style={{
          background: 'linear-gradient(155deg, rgba(16,24,42,0.85), rgba(8,12,24,0.95))',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(20px)',
          boxShadow: `0 30px 80px -15px rgba(0,0,0,0.7), 0 0 40px -10px rgba(${current.colorRgb}, 0.15)`,
          transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        }}
      >
        {/* Dynamic Top Ambient Glow based on active role */}
        <div
          className="absolute -top-20 left-1/2 -translate-x-1/2 w-3/4 h-32 rounded-full blur-3xl pointer-events-none opacity-30 transition-all duration-700"
          style={{ background: `radial-gradient(ellipse, ${current.color}, transparent 70%)` }}
        />

        {/* Top Studio Header */}
        <div
          className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 sm:px-7 py-4 border-b z-10"
          style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.015)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md shrink-0"
              style={{
                background: `linear-gradient(135deg, rgba(${current.colorRgb}, 0.25), rgba(${current.colorRgb}, 0.08))`,
                border: `1px solid rgba(${current.colorRgb}, 0.4)`,
              }}
            >
              <Icon className="w-5 h-5" style={{ color: current.color }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-white tracking-tight">{current.job}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10">
                  {current.targetCompany}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">{current.jdHint}</p>
            </div>
          </div>

          {/* Metric Badges & View Switcher Strip */}
          <div className="flex items-center flex-wrap gap-2">
            <div
              className="px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold shadow-sm"
              style={{
                background: 'rgba(52,211,153,0.12)',
                color: '#34d399',
                border: '1px solid rgba(52,211,153,0.3)',
              }}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>ATS {current.atsBefore} → {current.atsAfter}</span>
            </div>
            <div
              className="px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold shadow-sm"
              style={{
                background: 'rgba(96,165,250,0.12)',
                color: '#60a5fa',
                border: '1px solid rgba(96,165,250,0.3)',
              }}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Trust: {current.trustScore}%</span>
            </div>
          </div>
        </div>

        {/* ── Studio Body ── */}
        <div className="relative p-5 sm:p-7 space-y-5 z-10">
          {/* Before Card */}
          <div
            className="group/before relative flex items-start gap-3.5 sm:gap-4 p-4 sm:p-5 rounded-2xl transition-all duration-300"
            style={{
              background: 'rgba(239,68,68,0.03)',
              border: '1px solid rgba(239,68,68,0.18)',
            }}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 bg-red-500/15 border border-red-500/30 text-red-400 shadow-sm">
              <XCircle className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-red-400">
                  Original Draft (Vague & Filtered Out)
                </span>
                <span className="text-[10px] text-red-400/80 font-bold bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                  ATS Score {current.atsBefore} · Rejection Risk
                </span>
              </div>
              <p className="text-xs sm:text-base text-slate-400 line-through leading-relaxed">
                &ldquo;{current.before}&rdquo;
              </p>
            </div>
          </div>

          {/* Transformation Connecting Bar */}
          <div className="flex items-center gap-3 px-3">
            <div className="w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Zap className="w-3 h-3" />
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/40 via-sky-500/30 to-transparent" />
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-emerald-400">
              XYZ Formula · Real Quantified Output
            </span>
          </div>

          {/* After Card (Upgraded 3D Glow) */}
          <div
            className="group/after relative flex items-start gap-3.5 sm:gap-4 p-4 sm:p-5 rounded-2xl transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, rgba(52,211,153,0.08), rgba(12,24,36,0.7))',
              border: '1px solid rgba(52,211,153,0.35)',
              boxShadow: '0 12px 30px -10px rgba(52,211,153,0.2)',
            }}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shadow-sm">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  HireWin Verified Rewrite (Recruiter Shortlist Ready)
                </span>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  ATS Score {current.atsAfter} · Interview Approved
                </span>
              </div>
              <p className="text-sm sm:text-base text-white font-semibold leading-relaxed mb-3">
                &ldquo;{current.after}&rdquo;
              </p>

              {/* Verified Impact Metrics Chips */}
              <div className="flex items-center flex-wrap gap-2 pt-2 border-t border-white/[0.08]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                  Verified Milestones:
                </span>
                {current.impactMetrics.map((m, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black transition-transform hover:scale-105"
                    style={{
                      background: `${m.color}15`,
                      color: m.color,
                      border: `1px solid ${m.color}30`,
                    }}
                  >
                    <span>✓</span>
                    <span>{m.label}:</span>
                    <span className="text-white">{m.value}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Studio Bottom Bar */}
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 sm:px-7 py-3.5 border-t"
          style={{ background: 'rgba(255,255,255,0.015)', borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-2 text-xs text-slate-400 text-center sm:text-left">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Calibrated against your real career achievements — zero false claims guaranteed.</span>
          </div>

          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-extrabold text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <span>Optimize my resume now</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
