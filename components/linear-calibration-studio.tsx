'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  FileText, 
  Terminal, 
  ShieldCheck, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Cpu,
  Layers,
  Copy,
  Check,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TrackData {
  id: string;
  role: string;
  badge: string;
  candidate: {
    name: string;
    headline: string;
    institution: string;
    location: string;
  };
  keywords: string[];
  metrics: {
    overallScore: number;
    rawScore: number;
    keywordMatch: number;
    rawKeywordMatch: number;
    experienceDepth: number;
    rawExperienceDepth: number;
    formattingClearance: number;
  };
  diffLines: {
    lineNum: number;
    oldText: string;
    newText: string;
    impactTag: string;
  }[];
  atsPill: string;
}

const TRACKS: TrackData[] = [
  {
    id: 'backend',
    role: 'Backend SDE',
    badge: '3+ YOE · High Throughput',
    candidate: {
      name: 'Alex Chen',
      headline: 'Senior Backend Engineer · Distributed Systems & API Infrastructure',
      institution: 'B.S. Computer Science · Ex-Fintech Infrastructure Intern',
      location: 'Bengaluru / Remote · alex.chen@dev.io'
    },
    keywords: ['Distributed Systems', 'Kafka', 'Redis Caching', 'p99 Latency', 'PostgreSQL', 'Kubernetes'],
    metrics: {
      overallScore: 88,
      rawScore: 52,
      keywordMatch: 88,
      rawKeywordMatch: 45,
      experienceDepth: 75,
      rawExperienceDepth: 38,
      formattingClearance: 100,
    },
    diffLines: [
      {
        lineNum: 14,
        oldText: 'Maintained and updated REST APIs for user management and payment microservices.',
        newText: 'Architected resilient REST & gRPC endpoints with Redis caching, slashing p99 latency by 42% across 120k DAU.',
        impactTag: 'Google X-Y-Z Metric'
      },
      {
        lineNum: 18,
        oldText: 'Worked on database queries and fixed slow loading reports.',
        newText: 'Refactored PostgreSQL indexing strategies and query joins, cutting database query compute spikes by 65%.',
        impactTag: '+65% Efficiency'
      },
      {
        lineNum: 22,
        oldText: 'Helped migrate existing monolith services to Docker and Kubernetes.',
        newText: 'Orchestrated zero-downtime AWS EKS migration of 8 core services, boosting deployment frequency from weekly to 4x/day.',
        impactTag: 'Zero-Downtime Proof'
      }
    ],
    atsPill: 'Greenhouse & Workday Pass'
  },
  {
    id: 'fresher',
    role: 'Full-Stack (0-1 YOE)',
    badge: 'Campus / Entry Level',
    candidate: {
      name: 'Rohan Sharma',
      headline: 'Software Engineer (Full-Stack) · Next.js, Node.js & TypeScript',
      institution: 'B.Tech Computer Science (2025 Graduate) · 8.9 CGPA',
      location: 'Hyderabad, India · rohan.dev@gmail.com'
    },
    keywords: ['Next.js 15', 'TypeScript', 'WebSockets', 'Tailwind CSS', 'Docker', 'REST API'],
    metrics: {
      overallScore: 91,
      rawScore: 48,
      keywordMatch: 94,
      rawKeywordMatch: 42,
      experienceDepth: 82,
      rawExperienceDepth: 35,
      formattingClearance: 100,
    },
    diffLines: [
      {
        lineNum: 8,
        oldText: 'Built a collaborative coding website using React, Node.js, and MongoDB.',
        newText: 'Engineered real-time collaborative IDE using Next.js 15 and WebSockets, supporting 1,800+ concurrent student sessions.',
        impactTag: 'Scalability Proof'
      },
      {
        lineNum: 12,
        oldText: 'Created user login system and secured database routes.',
        newText: 'Implemented secure JWT & OAuth2 auth flow with Upstash Redis rate-limiting, achieving 100% test coverage via Vitest.',
        impactTag: 'Production Ready'
      },
      {
        lineNum: 16,
        oldText: 'Learned full-stack development and participated in collegiate hackathon.',
        newText: 'Won 1st place among 120 teams in National Hackathon by designing a real-time disaster alert web application.',
        impactTag: 'Top 1% Achievement'
      }
    ],
    atsPill: 'Lever & SmartRecruiters Pass'
  },
  {
    id: 'data',
    role: 'Data & ML Engineer',
    badge: '2-4 YOE · PySpark & Pipelines',
    candidate: {
      name: 'Priya Nair',
      headline: 'Data Engineer · Distributed Pipelines, Snowflake & Airflow',
      institution: 'M.S. Data Science · Python, SQL, dbt, Apache Spark',
      location: 'Pune / Remote · priya.data@analytics.org'
    },
    keywords: ['PySpark', 'Snowflake', 'Apache Airflow', 'dbt', 'Data Modeling', 'AWS S3'],
    metrics: {
      overallScore: 94,
      rawScore: 56,
      keywordMatch: 95,
      rawKeywordMatch: 50,
      experienceDepth: 89,
      rawExperienceDepth: 44,
      formattingClearance: 100,
    },
    diffLines: [
      {
        lineNum: 11,
        oldText: 'Wrote python scripts to extract data from multiple APIs into database.',
        newText: 'Engineered distributed PySpark ETL pipelines ingesting 4.2TB daily clickstream data into Snowflake with 99.9% SLA.',
        impactTag: '4.2TB Daily Scale'
      },
      {
        lineNum: 15,
        oldText: 'Cleaned data and reduced execution times of dashboard queries.',
        newText: 'Optimized dbt incremental models and warehouse cluster sizing, cutting monthly Snowflake compute spend by 34% ($18k/yr).',
        impactTag: '$18k Annual Savings'
      },
      {
        lineNum: 19,
        oldText: 'Built scheduled pipelines using cron jobs and Airflow.',
        newText: 'Architected automated Airflow DAGs with automatic alerting and circuit-breaker retries, reducing pipeline downtime to zero.',
        impactTag: 'High Availability'
      }
    ],
    atsPill: 'Workday & Taleo Pass'
  }
];

/** Custom hook for buttery-smooth count-up animation */
function useAnimatedCounter(startValue: number, endValue: number, triggerKey: any, duration = 1100) {
  const [val, setVal] = useState(startValue);

  useEffect(() => {
    let startTimestamp: number | null = null;
    let raf: number;

    function step(timestamp: number) {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);
      // Smooth quartic ease-out
      const ease = 1 - Math.pow(1 - progress, 4);
      const current = Math.round(startValue + (endValue - startValue) * ease);
      setVal(current);

      if (progress < 1) {
        raf = requestAnimationFrame(step);
      }
    }

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [startValue, endValue, triggerKey, duration]);

  return val;
}

export default function LinearCalibrationStudio() {
  const [activeTrack, setActiveTrack] = useState<string>('backend');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [selectedLine, setSelectedLine] = useState<number>(0);
  const [replayCount, setReplayCount] = useState<number>(0);
  const [mobileTab, setMobileTab] = useState<'inspector' | 'resume'>('inspector');
  const studioRef = useRef<HTMLDivElement>(null);

  const track = TRACKS.find(t => t.id === activeTrack) || TRACKS[0];

  // Dynamic animated score that starts from rawScore and smoothly counts up to overallScore
  const animatedScore = useAnimatedCounter(
    track.metrics.rawScore,
    track.metrics.overallScore,
    `${activeTrack}-${replayCount}`
  );

  const animatedKeyword = useAnimatedCounter(
    track.metrics.rawKeywordMatch,
    track.metrics.keywordMatch,
    `${activeTrack}-${replayCount}`
  );

  const animatedImpact = useAnimatedCounter(
    track.metrics.rawExperienceDepth,
    track.metrics.experienceDepth,
    `${activeTrack}-${replayCount}`
  );

  function handleTriggerCalibration() {
    setReplayCount(c => c + 1);
    try {
      confetti({
        particleCount: 50,
        spread: 65,
        origin: { y: 0.72 },
        colors: ['#10B981', '#34D399', '#6EE7B7', '#059669', '#38BDF8']
      });
    } catch {
      // safe fallback
    }
  }

  function handleCopy(text: string, index: number) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  }

  // Dynamic color for score gauge: rose (<55), amber (55-75), emerald (>=75)
  const scoreColor = animatedScore >= 75 ? '#10B981' : animatedScore >= 55 ? '#FBBF24' : '#F87171';

  return (
    <div ref={studioRef} className="relative w-full max-w-6xl mx-auto px-3 sm:px-6">
      {/* ── Studio Header & Role Switcher Bar ────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-[11px] sm:text-xs font-semibold tracking-wider uppercase text-slate-300 font-mono truncate">
            Real-Time ATS Diff Engine · Live Telemetry
          </span>
        </div>

        {/* Role Switcher Pills (Horizontal scrollable on mobile) */}
        <div className="flex items-center p-1 rounded-xl bg-slate-900/90 border border-white/[0.08] shadow-inner overflow-x-auto no-scrollbar scroll-smooth">
          {TRACKS.map(t => {
            const isSelected = t.id === activeTrack;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setActiveTrack(t.id);
                  setSelectedLine(0);
                  setReplayCount(c => c + 1);
                }}
                className={`relative px-3 sm:px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer select-none whitespace-nowrap shrink-0 ${
                  isSelected ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="active-track-pill"
                    className="absolute inset-0 rounded-lg bg-emerald-500/20 border border-emerald-500/40 shadow-sm"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <span>{t.role}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Mobile View Toggle (Visible only on mobile < lg) ──────────────── */}
      <div className="flex lg:hidden items-center p-1 rounded-xl bg-slate-900/80 border border-white/[0.06] mb-4">
        <button
          type="button"
          onClick={() => setMobileTab('inspector')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === 'inspector' 
              ? 'bg-emerald-500 text-slate-950 shadow-md font-black' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>ATS Diagnostic & Diff ({animatedScore}%)</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('resume')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === 'resume' 
              ? 'bg-white text-slate-950 shadow-md font-black' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Resume Source (PDF)</span>
        </button>
      </div>

      {/* ── Main Dual-Column Workbench ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ── LEFT COLUMN: Authentic Resume Document Preview (5 cols) ─────── */}
        <div className={`lg:col-span-5 flex-col gap-3 ${mobileTab === 'resume' ? 'flex' : 'hidden lg:flex'}`}>
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Applicant Resume Source (PDF View)
            </span>
            <span className="text-[10px] text-emerald-400 font-mono font-medium">
              Single-Column Compliant
            </span>
          </div>

          {/* Crisp Paper Resume Card */}
          <div 
            className="w-full bg-[#FFFFFF] text-slate-900 rounded-2xl shadow-2xl p-4 sm:p-6 border border-slate-200/80 transition-all duration-200 select-none relative overflow-hidden"
            style={{ minHeight: '480px' }}
          >
            {/* Top binder line */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />

            {/* Resume Header */}
            <div className="border-b border-slate-200 pb-3 mb-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-slate-950 tracking-tight leading-tight">
                    {track.candidate.name}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-600 font-medium mt-0.5">
                    {track.candidate.headline}
                  </p>
                </div>
                <div className="px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                  ATS Ready
                </div>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-2 font-mono">
                <span className="truncate">{track.candidate.location}</span>
              </div>
            </div>

            {/* Keyword Match Tags Ribbon */}
            <div className="mb-3.5">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 flex items-center justify-between">
                <span>Target Keywords Detected</span>
                <span className="text-emerald-700 font-bold">{track.keywords.length}/{track.keywords.length} Matched</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {track.keywords.map(kw => (
                  <span 
                    key={kw}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                  >
                    <Check className="w-2.5 h-2.5 text-emerald-600" />
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            {/* Experience Section in Resume */}
            <div className="space-y-2.5">
              <div className="text-[11px] uppercase font-bold text-slate-900 tracking-wider border-b border-slate-200 pb-1">
                Professional Experience
              </div>

              {track.diffLines.map((item, idx) => {
                const isItemActive = selectedLine === idx;
                return (
                  <div
                    key={item.lineNum}
                    onClick={() => {
                      setSelectedLine(idx);
                      if (window.innerWidth < 1024) setMobileTab('inspector');
                    }}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all duration-150 ${
                      isItemActive 
                        ? 'bg-emerald-50/80 border-emerald-400 shadow-sm ring-1 ring-emerald-300' 
                        : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono text-slate-500 font-semibold">
                        Bullet #{idx + 1}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-mono ${
                        isItemActive ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {item.impactTag}
                      </span>
                    </div>

                    <p className="text-slate-800 text-[11px] leading-relaxed line-clamp-3">
                      {item.newText}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Resume Bottom Watermark Note */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>Standard 1-Page Format</span>
              <span className="text-emerald-700 font-medium">0 Parse Warnings</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Diagnostic Inspector & GitHub-Style Diff (7 cols) ─ */}
        <div className={`lg:col-span-7 flex-col gap-4 ${mobileTab === 'inspector' ? 'flex' : 'hidden lg:flex'}`}>
          {/* ── Panel 1: ATS Diagnostic Inspector ────────────────────────── */}
          <div className="rounded-2xl p-4 sm:p-6 bg-[#0E141B] border border-white/[0.08] shadow-xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 sm:mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white tracking-tight">
                    ATS Diagnostic Inspector
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    Live Telemetry
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Parser clearance measured against Workday, Greenhouse & Lever algorithms
                </p>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-slate-300 self-start sm:self-auto">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{track.atsPill}</span>
              </div>
            </div>

            {/* Score Metric Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              {/* Dial Card (5 cols) with ANIMATED SCORE */}
              <div className="sm:col-span-5 p-3.5 sm:p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center gap-3.5 sm:gap-4">
                {/* Visual Circular Gauge with drop-shadow glow and animated stroke */}
                <div className="relative w-16 h-16 sm:w-18 sm:h-18 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9155"
                      fill="none"
                      stroke="rgba(255,255,255,0.06)"
                      strokeWidth="3.2"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9155"
                      fill="none"
                      stroke={scoreColor}
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      strokeDasharray={`${animatedScore}, 100`}
                      style={{
                        transition: 'stroke 0.4s ease, stroke-dasharray 0.05s linear',
                        filter: `drop-shadow(0 0 6px ${scoreColor}60)`
                      }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span 
                      className="font-mono font-black text-base sm:text-lg tracking-tight leading-none"
                      style={{ color: scoreColor, transition: 'color 0.4s ease' }}
                    >
                      {animatedScore}%
                    </span>
                    <span className="text-[8px] font-mono text-slate-400 leading-none mt-0.5">
                      CLEARANCE
                    </span>
                  </div>
                </div>

                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    ATS Match Score
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs font-bold" style={{ color: scoreColor }}>
                      {animatedScore >= 80 ? 'High Clearance' : animatedScore >= 60 ? 'Calibrating...' : 'Review Needed'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 mt-0.5 block truncate">
                    Raw: <span className="line-through text-rose-400">{track.metrics.rawScore}%</span> → <span className="text-emerald-400 font-bold font-mono">+{track.metrics.overallScore - track.metrics.rawScore} Pts</span>
                  </span>
                </div>
              </div>

              {/* Dynamic Progress Meters (7 cols) */}
              <div className="sm:col-span-7 space-y-2.5">
                {/* Meter 1: Keyword Match */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-300 font-medium">Keyword Match</span>
                    <span className="font-mono text-emerald-400 font-semibold">{animatedKeyword}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-emerald-500 transition-all duration-300" 
                      style={{ width: `${animatedKeyword}%` }}
                    />
                  </div>
                </div>

                {/* Meter 2: Quantifiable Impact */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-300 font-medium">Quantifiable Impact (X-Y-Z)</span>
                    <span className="font-mono text-teal-400 font-semibold">{animatedImpact}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-teal-500 transition-all duration-300" 
                      style={{ width: `${animatedImpact}%` }}
                    />
                  </div>
                </div>

                {/* Meter 3: Formatting Clearance */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-300 font-medium">Single-Column Parse Clearance</span>
                    <span className="font-mono text-emerald-400 font-semibold">{track.metrics.formattingClearance}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-emerald-500 transition-all duration-700" 
                      style={{ width: `${track.metrics.formattingClearance}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Panel 2: GitHub-Style Bullet Diff Inspector ────────────── */}
          <div className="rounded-2xl bg-[#0B0F14] border border-white/[0.08] shadow-2xl overflow-hidden flex flex-col">
            {/* Terminal Top Window Bar */}
            <div className="px-3.5 sm:px-4 py-2.5 bg-slate-900/90 border-b border-white/[0.08] flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-mono text-slate-400 truncate ml-1 sm:ml-2">
                  calibration_diff/bullet_{selectedLine + 1}.md
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopy(track.diffLines[selectedLine].newText, selectedLine)}
                  className="px-2.5 py-1 rounded text-[11px] font-mono font-medium text-slate-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] flex items-center gap-1 transition-colors cursor-pointer"
                  title="Copy calibrated bullet point"
                >
                  {copiedIndex === selectedLine ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-slate-400" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Code Diff Body (Mobile-friendly, no overflow breaking) */}
            <div className="p-3.5 sm:p-4 font-mono text-xs leading-relaxed space-y-2.5 sm:space-y-3">
              <div className="text-[10px] sm:text-[11px] text-slate-500 select-none pb-0.5 truncate">
                @@ -line {track.diffLines[selectedLine].lineNum}, unoptimized raw submission vs calibrated evidence @@
              </div>

              {/* Raw Line (Red Removal) */}
              <div className="flex items-start gap-2 sm:gap-2.5 p-2.5 sm:p-3 rounded-lg bg-rose-950/20 border-l-2 border-rose-500 text-rose-200/90">
                <span className="text-rose-400 font-bold select-none shrink-0 text-sm leading-none mt-0.5">-</span>
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold text-rose-400 block tracking-wider mb-0.5">
                    Raw Submission (Vague · Lacks Metrics)
                  </span>
                  <p className="text-slate-300 text-[11px] sm:text-xs leading-relaxed break-words">
                    {track.diffLines[selectedLine].oldText}
                  </p>
                </div>
              </div>

              {/* Calibrated Line (Green Addition) */}
              <div className="flex items-start gap-2 sm:gap-2.5 p-2.5 sm:p-3 rounded-lg bg-emerald-950/25 border-l-2 border-emerald-400 text-emerald-100">
                <span className="text-emerald-400 font-bold select-none shrink-0 text-sm leading-none mt-0.5">+</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-0.5">
                    <span className="text-[9px] sm:text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                      Google X-Y-Z Rewrite (Verified Metric Proof)
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                      {track.diffLines[selectedLine].impactTag}
                    </span>
                  </div>
                  <p className="text-emerald-200/95 text-[11px] sm:text-xs font-semibold leading-relaxed break-words">
                    {track.diffLines[selectedLine].newText}
                  </p>
                </div>
              </div>
            </div>

            {/* Interactive Bottom Bar */}
            <div className="p-3 bg-white/[0.02] border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
              <div className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span className="truncate">Select bullet on left to inspect diff</span>
              </div>

              <button
                type="button"
                onClick={handleTriggerCalibration}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 ml-auto"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Re-calibrate Live ({animatedScore}%)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Telemetry & Navigation Actions ───────────────────────── */}
      <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Telemetry Numbers Grid (2x2 on mobile, row on desktop) */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-4 sm:gap-6 text-xs text-slate-400 font-mono w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold">14,200+</span>
            <span className="truncate">Resumes Calibrated</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold">94%+</span>
            <span className="truncate">ATS Pass Rate</span>
          </div>
          <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
            <span className="text-emerald-400 font-bold">0%</span>
            <span className="truncate">Hallucination Guarantee</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <Link
            href="/analyze"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 sm:px-5 py-2.5 rounded-xl text-xs transition-colors shadow-lg shadow-emerald-500/20 cursor-pointer min-h-[44px]"
          >
            <span>Scan My Resume Now</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/builder"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/10 font-semibold px-4 py-2.5 rounded-xl text-xs transition-colors cursor-pointer min-h-[44px]"
          >
            <span>Resume Studio</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
