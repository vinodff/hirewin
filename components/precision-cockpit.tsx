'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  Terminal, 
  Upload, 
  FileText, 
  Cpu, 
  TrendingUp, 
  ChevronRight,
  Layers,
  Check,
  Zap,
  Sliders
} from 'lucide-react';

interface CockpitPreset {
  id: string;
  label: string;
  badge: string;
  targetRole: string;
  companyTarget: string;
  atsScore: number;
  atsScoreBefore: number;
  keywordsMatched: string[];
  keywordsFocus: string[];
  telemetry: {
    skillGap: number;
    experienceAlignment: number;
    roleFitment: number;
  };
  sampleBullet: {
    raw: string;
    optimized: string;
    metricTag: string;
  };
}

const PRESETS: CockpitPreset[] = [
  {
    id: 'backend',
    label: 'Backend SDE',
    badge: '3+ YOE · High Scale',
    targetRole: 'Senior Backend Engineer',
    companyTarget: 'Fintech / Microservices',
    atsScore: 94,
    atsScoreBefore: 54,
    keywordsMatched: ['Distributed Systems', 'Kafka', 'Redis Caching', 'PostgreSQL', 'Docker'],
    keywordsFocus: ['p99 Latency', 'gRPC', 'Kubernetes'],
    telemetry: {
      skillGap: 96,
      experienceAlignment: 92,
      roleFitment: 95,
    },
    sampleBullet: {
      raw: 'Built REST APIs for transaction handling and fixed slow queries.',
      optimized: 'Architected resilient gRPC & REST endpoints with Redis caching, reducing p99 latency by 42% across 120k DAU.',
      metricTag: 'Google X-Y-Z Proof · -42% Latency',
    },
  },
  {
    id: 'fresher',
    label: 'Campus / 0-1 YOE',
    badge: 'Fresher · Entry Level',
    targetRole: 'Software Engineer (Graduate)',
    companyTarget: 'Product Tier 1',
    atsScore: 89,
    atsScoreBefore: 46,
    keywordsMatched: ['Data Structures', 'Node.js', 'REST APIs', 'React', 'Git'],
    keywordsFocus: ['CI/CD Pipelines', 'System Design Basics'],
    telemetry: {
      skillGap: 90,
      experienceAlignment: 88,
      roleFitment: 91,
    },
    sampleBullet: {
      raw: 'Created a college event registration website using React and Node.',
      optimized: 'Engineered an end-to-end event platform with JWT auth & Redis queues, successfully scaling to 2,400 concurrent students without downtime.',
      metricTag: 'Verifiable Proof · 2,400 Users',
    },
  },
  {
    id: 'frontend',
    label: 'Frontend / Full-Stack',
    badge: '2-5 YOE · UI Craft',
    targetRole: 'Full-Stack Developer',
    companyTarget: 'High-Growth Tech',
    atsScore: 96,
    atsScoreBefore: 58,
    keywordsMatched: ['TypeScript', 'Next.js 15', 'Tailwind CSS', 'State Architecture', 'GraphQL'],
    keywordsFocus: ['Web Vitals (LCP < 1.2s)', 'Accessibility (WCAG AA)'],
    telemetry: {
      skillGap: 98,
      experienceAlignment: 94,
      roleFitment: 97,
    },
    sampleBullet: {
      raw: 'Designed frontend components and improved website loading times.',
      optimized: 'Spearheaded Next.js SSR migration with dynamic code splitting, improving Largest Contentful Paint (LCP) from 3.8s to 0.9s.',
      metricTag: 'LCP 0.9s · Top 5% Web Vitals',
    },
  },
];

export default function PrecisionCockpit() {
  const [activePreset, setActivePreset] = useState<CockpitPreset>(PRESETS[0]);
  const [displayScore, setDisplayScore] = useState(activePreset.atsScore);

  // Smooth score count-up when preset changes
  useEffect(() => {
    let start = activePreset.atsScoreBefore;
    const target = activePreset.atsScore;
    const duration = 800; // ms
    const stepTime = 16;
    const steps = duration / stepTime;
    const increment = (target - start) / steps;
    let current = start;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setDisplayScore(target);
        clearInterval(timer);
      } else {
        setDisplayScore(Math.round(current));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [activePreset]);

  // SVG Circular Meter Math
  const radius = 80;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  return (
    <div className="w-full max-w-6xl mx-auto mt-6 text-left">
      {/* Outer Cockpit Container with Linear-style hairline border & deep obsidian surface */}
      <div 
        className="relative rounded-2xl border border-white/[0.08] bg-[#0A0F14]/90 backdrop-blur-xl shadow-2xl shadow-emerald-500/[0.03] overflow-hidden"
        style={{
          boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 20px 50px -10px rgba(0,0,0,0.8), 0 0 40px rgba(16,185,129,0.04)',
        }}
      >
        {/* Top Cockpit Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-white/[0.06] bg-[#080C0F]/60">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>INSTRUMENT COCKPIT V4.2</span>
            </div>
            <span className="text-xs text-slate-500 hidden sm:inline font-mono">
              Deterministic ATS Parser & Evidence Verification
            </span>
          </div>

          {/* Preset Track Selector Tabs */}
          <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-lg border border-white/[0.06]">
            {PRESETS.map((p) => {
              const isSelected = p.id === activePreset.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setActivePreset(p)}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-all cursor-pointer font-mono ${
                    isSelected
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Grid: Input / Telemetry / Radar Gauge */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 sm:p-7">
          
          {/* Left Column: Command Input & Candidate Target (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-wider font-mono text-slate-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  Target Specification
                </span>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
                  {activePreset.badge}
                </span>
              </div>

              {/* Mock Command Bar Input Box */}
              <div className="p-3.5 rounded-xl border border-white/[0.08] bg-[#0E151C] space-y-2.5">
                <div className="flex justify-between items-center text-xs text-slate-300">
                  <span className="text-slate-500 font-mono">Role Target:</span>
                  <span className="font-semibold text-white">{activePreset.targetRole}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-300">
                  <span className="text-slate-500 font-mono">Domain Track:</span>
                  <span className="font-mono text-slate-300">{activePreset.companyTarget}</span>
                </div>
                <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-mono">Parser Compliance:</span>
                  <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-400" /> Greenhouse · Workday · Lever
                  </span>
                </div>
              </div>
            </div>

            {/* Live Bullet Point Before/After Diff Box */}
            <div className="p-3.5 rounded-xl border border-white/[0.08] bg-[#0E151C] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider font-mono text-slate-400">
                  Live Bullet Calibration
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {activePreset.sampleBullet.metricTag}
                </span>
              </div>

              {/* Raw bullet (rejected) */}
              <div className="p-2 rounded bg-red-950/20 border border-red-500/20 text-xs text-slate-400 font-mono line-through opacity-75">
                <span className="text-red-400 mr-1.5">-</span>
                {activePreset.sampleBullet.raw}
              </div>

              {/* Calibrated bullet (accepted) */}
              <div className="p-2 rounded bg-emerald-950/20 border border-emerald-500/30 text-xs text-emerald-200 font-mono">
                <span className="text-emerald-400 mr-1.5 font-bold">+</span>
                {activePreset.sampleBullet.optimized}
              </div>
            </div>

            {/* Quick Action Upload Prompt */}
            <div className="pt-1">
              <Link
                href="/analyze"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Upload My Resume for Instant Audit</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          </div>

          {/* Center Column: High-Precision Circular Radar Gauge (4 cols) */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center p-4 rounded-xl border border-white/[0.06] bg-[#0E151C]/60 text-center relative overflow-hidden">
            {/* Ambient emerald backlight glow */}
            <div className="absolute inset-0 bg-emerald-500/[0.03] blur-2xl pointer-events-none" />

            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
              Algorithm Clearance Score
            </span>

            {/* Circular Gauge */}
            <div className="relative w-44 h-44 my-2 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                {/* Background Track */}
                <circle
                  cx="88"
                  cy="88"
                  r={radius}
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                />
                {/* Animated Value Ring */}
                <circle
                  cx="88"
                  cy="88"
                  r={radius}
                  stroke="url(#emerald-gradient)"
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-700 ease-out"
                />
                <defs>
                  <linearGradient id="emerald-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="100%" stopColor="#34D399" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Inner Meter Readout */}
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-4xl font-extrabold text-white font-mono tracking-tight tabular-nums">
                  {displayScore}%
                </span>
                <span className="text-[11px] font-mono text-emerald-400 font-semibold uppercase tracking-wider mt-0.5">
                  Optimal Match
                </span>
                <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                  was {activePreset.atsScoreBefore}% raw
                </span>
              </div>
            </div>

            {/* Trust Seals */}
            <div className="flex flex-col gap-1.5 w-full max-w-xs mt-3 pt-3 border-t border-white/[0.06] text-left">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  0% Hallucination Proof
                </span>
                <span className="text-emerald-400 font-bold">Guaranteed</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Recruiter Probe Defense
                </span>
                <span className="text-slate-300 font-bold">100% Verifiable</span>
              </div>
            </div>
          </div>

          {/* Right Column: Telemetry Sliders & Keyword Matrix (3 cols) */}
          <div className="lg:col-span-3 flex flex-col justify-between space-y-4">
            {/* Real-time Telemetry Metrics */}
            <div className="p-3.5 rounded-xl border border-white/[0.08] bg-[#0E151C] space-y-3">
              <div className="flex items-center justify-between text-xs uppercase font-mono text-slate-400">
                <span className="flex items-center gap-1">
                  <Sliders className="w-3 h-3 text-emerald-400" />
                  Candidate Telemetry
                </span>
                <span className="text-emerald-400 font-mono font-bold">Active</span>
              </div>

              {/* Slider 1: Skill Gap */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Skill Coverage</span>
                  <span className="text-white font-bold">{activePreset.telemetry.skillGap}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <motion.div
                    className="h-full bg-emerald-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${activePreset.telemetry.skillGap}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
              </div>

              {/* Slider 2: Experience Alignment */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Depth Alignment</span>
                  <span className="text-white font-bold">{activePreset.telemetry.experienceAlignment}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <motion.div
                    className="h-full bg-emerald-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${activePreset.telemetry.experienceAlignment}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
              </div>

              {/* Slider 3: Role Fitment */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Role Fitment</span>
                  <span className="text-white font-bold">{activePreset.telemetry.roleFitment}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <motion.div
                    className="h-full bg-emerald-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${activePreset.telemetry.roleFitment}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
              </div>
            </div>

            {/* Keyword Extraction Mesh */}
            <div className="p-3.5 rounded-xl border border-white/[0.08] bg-[#0E151C] space-y-2">
              <span className="text-xs uppercase font-mono text-slate-400 block">
                Extracted Keyword Tokens
              </span>
              <div className="flex flex-wrap gap-1.5">
                {activePreset.keywordsMatched.map((k) => (
                  <span
                    key={k}
                    className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 flex items-center gap-1"
                  >
                    <Check className="w-2.5 h-2.5 text-emerald-400" />
                    {k}
                  </span>
                ))}
                {activePreset.keywordsFocus.map((k) => (
                  <span
                    key={k}
                    className="px-2 py-0.5 rounded text-[11px] font-mono bg-white/[0.04] text-slate-400 border border-white/[0.08]"
                  >
                    +{k}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Cockpit Footer Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-2.5 bg-[#080C0F] border-t border-white/[0.06] text-xs font-mono text-slate-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Engine: Sonnet 4.5 & Gemini 3.8 Flash
            </span>
            <span className="hidden sm:inline">|</span>
            <span className="hidden sm:inline">Latency: ~800ms</span>
          </div>
          <Link
            href="/analyze"
            className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold transition-colors"
          >
            <span>Launch Dedicated Scanner</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
