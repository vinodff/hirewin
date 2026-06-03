'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Mic, User, Mail, Briefcase, FileText, BarChart2, ArrowRight, Volume2, Sparkles } from 'lucide-react';

/* ─── Mini preview components ────────────────────────────── */

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-[10px] text-slate-500">{label}</span>
        <span className="text-[10px] font-bold" style={{ color }}>{value}</span>
      </div>
      <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

function OptimizerPreview() {
  return (
    <div className="mt-5 space-y-2.5">
      <Bar label="ATS Match" value={87} color="#a78bfa" />
      <Bar label="Trust Score" value={94} color="#34d399" />
      <Bar label="Job Fit" value={91} color="#60a5fa" />
      <div className="pt-2 flex flex-wrap gap-1.5">
        {['React', 'TypeScript', 'CI/CD', '+8 matched'].map(k => (
          <span key={k} className="text-[9px] px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(167,139,250,0.1)', color: '#c4b5fd', border: '1px solid rgba(167,139,250,0.2)' }}>
            ✓ {k}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-slate-600 pt-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
        Tailored for Senior Frontend · FAANG
      </div>
    </div>
  );
}

function VoicePreview() {
  return (
    <div className="mt-4 space-y-2.5">
      <div className="rounded-xl p-3" style={{ background: 'rgba(96,165,250,0.07)', border: '1px solid rgba(96,165,250,0.14)' }}>
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-sm">👤</span>
          <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider">Recruiter</span>
          <span className="text-[9px] text-slate-600 ml-auto flex items-center gap-0.5">
            <Volume2 className="w-2.5 h-2.5" /> speaking
          </span>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          &ldquo;Tell me about a time you made a difficult technical trade-off under pressure…&rdquo;
        </p>
      </div>
      <div className="flex items-center gap-2 rounded-xl px-3 py-2"
        style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)' }}>
        <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse shrink-0" />
        <span className="text-[10px] font-semibold text-red-400">Recording…</span>
        <div className="flex items-end gap-[2px] ml-auto h-4">
          {[4, 8, 5, 10, 7, 9, 4, 7].map((h, i) => (
            <div key={i} className="w-[2px] rounded-full" style={{ height: `${h}px`, background: 'rgba(239,68,68,0.55)' }} />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[10px] text-slate-600">Question 2 of 6</span>
        <div className="flex gap-1">
          {[1, 1, 0, 0, 0, 0].map((done, i) => (
            <div key={i} className="h-1 w-4 rounded-full"
              style={{ background: done ? '#60a5fa' : 'rgba(255,255,255,0.07)' }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SelfIntroPreview() {
  return (
    <div className="mt-3 space-y-2">
      <div className="flex gap-1.5">
        {[{ l: '⚡ Brief', a: true }, { l: '🎯 Full', a: false }, { l: '😊 Casual', a: false }].map(t => (
          <div key={t.l} className="text-[9px] px-2 py-1 rounded-lg"
            style={t.a
              ? { background: 'rgba(167,139,250,0.15)', color: '#c4b5fd', border: '1px solid rgba(167,139,250,0.25)' }
              : { background: 'rgba(255,255,255,0.04)', color: '#475569', border: '1px solid rgba(255,255,255,0.06)' }}>
            {t.l}
          </div>
        ))}
      </div>
      <div className="rounded-lg p-3 text-[11px] text-slate-300 leading-relaxed"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        &ldquo;With 4 years in full-stack development, I&apos;ve shipped products used by 100k+ users — and I&apos;m excited about this role because…&rdquo;
      </div>
      <div className="text-[10px] text-purple-400 flex items-center gap-1">
        <Sparkles className="w-2.5 h-2.5" /> Tailored to your JD + resume
      </div>
    </div>
  );
}

function OutreachPreview() {
  return (
    <div className="mt-3 space-y-2">
      <div className="rounded-lg p-2.5" style={{ background: 'rgba(234,67,53,0.07)', border: '1px solid rgba(234,67,53,0.15)' }}>
        <div className="text-[9px] text-slate-500 mb-1">Subject: Senior Frontend Eng · Arjun Sharma</div>
        <p className="text-[10px] text-slate-300 leading-relaxed line-clamp-2">
          Hi Sarah, I came across the role at Notion and it aligns with my React performance work at TCS where I improved LCP by 43%…
        </p>
      </div>
      <div className="rounded-lg px-2.5 py-2 flex items-center gap-2"
        style={{ background: 'rgba(10,102,194,0.07)', border: '1px solid rgba(10,102,194,0.15)' }}>
        <span className="text-[10px] font-semibold text-blue-400">LinkedIn note ready</span>
        <span className="ml-auto text-[9px] text-slate-600">128 chars</span>
      </div>
    </div>
  );
}

function TrackerPreview() {
  const rows = [
    { co: 'Notion', stage: 2 },
    { co: 'Razorpay', stage: 1 },
    { co: 'CRED', stage: 3 },
  ];
  const stages = ['Applied', 'Interview', 'Offer'];
  return (
    <div className="mt-3">
      {rows.map((r, ri) => (
        <div key={r.co}
          className="flex items-center gap-3 py-2"
          style={{ borderBottom: ri < rows.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
          <span className="text-[11px] font-semibold text-slate-200 w-16 shrink-0">{r.co}</span>
          <div className="flex gap-1 flex-1">
            {stages.map((s, i) => (
              <span key={s} className="text-[8px] px-1.5 py-0.5 rounded font-medium flex-1 text-center"
                style={i < r.stage
                  ? { background: i === 2 ? 'rgba(52,211,153,0.15)' : 'rgba(124,58,237,0.12)', color: i === 2 ? '#34d399' : '#a78bfa' }
                  : { background: 'rgba(255,255,255,0.04)', color: '#334155' }}>
                {s}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Feature data ───────────────────────────────────────── */

type Feature = {
  id: string;
  large?: boolean;
  icon: React.ElementType;
  tag: string;
  title: string;
  desc: string;
  color: string;
  href: string;
  cta: string;
  preview: React.ReactNode;
};

const FEATURES: Feature[] = [
  {
    id: 'optimize', large: true,
    icon: BarChart2, tag: 'Core tool',
    title: 'Resume Optimizer',
    desc: 'ATS match, trust score, and recruiter-ready rewrites — tailored to any job in ~20 seconds. Free to preview.',
    color: '#a78bfa', href: '/analyze', cta: 'Optimize free',
    preview: <OptimizerPreview />,
  },
  {
    id: 'interview',
    icon: Mic, tag: 'NEW',
    title: 'Voice Mock Interview',
    desc: 'An AI recruiter asks adaptive questions, listens to your voice, and gives you a full performance report.',
    color: '#60a5fa', href: '/analyze', cta: 'Start interview',
    preview: <VoicePreview />,
  },
  {
    id: 'selfintro',
    icon: User, tag: 'Interview prep',
    title: 'Self-Introduction',
    desc: '3 tailored versions of your intro — brief pitch, full 2-min answer, casual — written in your voice.',
    color: '#c4b5fd', href: '/analyze', cta: 'Generate intro',
    preview: <SelfIntroPreview />,
  },
  {
    id: 'outreach',
    icon: Mail, tag: 'Apply smarter',
    title: 'Cold Outreach',
    desc: 'Personalised cold email + LinkedIn note written from your optimised resume — send in one click.',
    color: '#f87171', href: '/analyze', cta: 'Write outreach',
    preview: <OutreachPreview />,
  },
  {
    id: 'tracker',
    icon: Briefcase, tag: 'Stay organised',
    title: 'Job Tracker',
    desc: 'Track every application, interview stage, and offer in one clean dashboard. Never lose track again.',
    color: '#34d399', href: '/history', cta: 'Track jobs',
    preview: <TrackerPreview />,
  },
];

/* ─── Feature card ───────────────────────────────────────── */

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0, rootMargin: '0px 0px -4% 0px' }
    );
    io.observe(el);
    const t = setTimeout(() => setVisible(true), 1200);
    return () => { io.disconnect(); clearTimeout(t); };
  }, []);

  const Icon = feature.icon;

  return (
    <div ref={wrapRef} className="h-full will-change-transform"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(36px)',
        transition: `opacity 0.65s cubic-bezier(0.22,1,0.36,1) ${index * 90}ms, transform 0.65s cubic-bezier(0.22,1,0.36,1) ${index * 90}ms`,
      }}>
      <Link href={feature.href}
        className="group relative flex flex-col h-full rounded-2xl sm:rounded-3xl overflow-hidden transition-[transform,box-shadow] duration-300 hover:scale-[1.02]"
        style={{
          background: 'linear-gradient(145deg, #0e1530, #0a1020)',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
        }}>

        {/* Coloured top bar */}
        <div className="absolute top-0 inset-x-0 h-px transition-opacity duration-300 opacity-50 group-hover:opacity-100"
          style={{ background: `linear-gradient(90deg, transparent, ${feature.color}, transparent)` }} />

        {/* Hover glow */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 20% 0%, ${feature.color}0c, transparent 60%)` }} />

        <div className="relative p-5 sm:p-6 flex flex-col h-full">
          {/* Icon + tag row */}
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${feature.color}14`, border: `1px solid ${feature.color}25` }}>
              <Icon className="w-4 h-4" style={{ color: feature.color }} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md"
              style={{ background: `${feature.color}10`, color: feature.color, border: `1px solid ${feature.color}20` }}>
              {feature.tag}
            </span>
          </div>

          {/* Title + desc */}
          <h3 className="text-base sm:text-lg font-extrabold text-white mb-1.5 leading-tight">{feature.title}</h3>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{feature.desc}</p>

          {/* Preview area */}
          <div className="flex-1 min-h-0">{feature.preview}</div>

          {/* CTA */}
          <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center gap-1.5 text-xs font-bold group-hover:gap-2.5 transition-all duration-200"
            style={{ color: feature.color }}>
            {feature.cta}
            <ArrowRight className="w-3 h-3 transition-transform duration-200 group-hover:translate-x-0.5" />
          </div>
        </div>
      </Link>
    </div>
  );
}

/* ─── Section ────────────────────────────────────────────── */

export default function FeatureShowcase() {
  return (
    <section className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">

      {/* Heading */}
      <div className="text-center mb-12 sm:mb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-purple-300 mb-5"
          style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)', backdropFilter: 'blur(8px)' }}>
          <Sparkles className="w-3.5 h-3.5" />
          5 tools. One complete kit.
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-6xl font-extrabold text-white mb-5 leading-[1.05] tracking-tight">
          Everything you need<br className="hidden sm:block" />
          <span className="gradient-text"> to get hired faster.</span>
        </h2>
        <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
          Resume optimization, voice interview practice, self-introduction, cold outreach, and job tracking — all AI-powered, all in one place.
        </p>
      </div>

      {/* Bento grid
          Desktop: [Optimizer 2-col] [Interview 1-col]
                   [SelfIntro 1-col] [Outreach 1-col] [Tracker 1-col]
      */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {FEATURES.map((f, i) => (
          <div key={f.id} className={f.large ? 'sm:col-span-2' : ''}>
            <FeatureCard feature={f} index={i} />
          </div>
        ))}
      </div>

      {/* Resume Builder — full-width banner card */}
      <div className="mt-4 sm:mt-5">
        <Link href="/builder"
          className="group relative flex items-center justify-between gap-4 rounded-2xl sm:rounded-3xl overflow-hidden px-5 sm:px-8 py-4 sm:py-5 transition-all duration-300 hover:scale-[1.01]"
          style={{
            background: 'linear-gradient(135deg, rgba(52,211,153,0.07), rgba(59,130,246,0.05))',
            border: '1px solid rgba(52,211,153,0.18)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          }}>
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
            style={{ background: 'linear-gradient(135deg, rgba(52,211,153,0.05), rgba(59,130,246,0.04))' }} />

          <div className="relative flex items-center gap-4 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-white">Resume Builder</span>
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}>
                  Free
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate">Start from scratch with AI-guided professional templates.</p>
            </div>
          </div>

          <div className="relative flex items-center gap-1.5 text-sm font-bold text-emerald-400 shrink-0 group-hover:gap-2.5 transition-all duration-200">
            Build free
            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </div>
        </Link>
      </div>
    </section>
  );
}
