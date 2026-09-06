'use client';

import { UploadCloud, Cpu, Award, ArrowRight, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

const STEPS = [
  {
    step: '01',
    title: 'Drop Resume & Target Job',
    tag: 'Instant Ingestion',
    desc: 'Upload your current resume (PDF or DOCX) and paste the target job description or role requirements.',
    icon: UploadCloud,
    accent: '#60a5fa',
    features: [
      'Extracts 100% text accuracy without formatting distortion',
      'Parses core hard skills and recruiter requirements',
      'Works with single and multi-page documents',
    ],
  },
  {
    step: '02',
    title: 'Precision Audit & Trust Scoring',
    tag: 'Zero-Hallucination AI',
    desc: 'Our AI calculates your ATS match score, infuses quantified impact numbers, and verifies every claim against your actual experience.',
    icon: Cpu,
    accent: 'var(--accent-soft)',
    features: [
      'Cross-checks claims against your source background',
      'Flags interview risks before recruiters see them',
      'Optimizes keyword density for all top ATS algorithms',
    ],
  },
  {
    step: '03',
    title: 'Export & Interview With Confidence',
    tag: 'Guaranteed Readiness',
    desc: 'Download clean, recruiter-approved ATS formats, complete with strategic talking points for technical interview questions.',
    icon: Award,
    accent: '#34d399',
    features: [
      'One-click export to clean PDF and DOCX',
      'Full in-browser editor for manual adjustments',
      'Personalized interview risk talking points included',
    ],
  },
];

export default function HowItWorks() {
  return (
    <section className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
      {/* Section Header */}
      <div className="text-center mb-14 sm:mb-16">
        <div
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold text-accent-300 mb-4"
          style={{
            background: 'rgba(var(--accent-rgb), 0.1)',
            border: '1px solid rgba(var(--accent-rgb), 0.25)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-accent-400" />
          Seamless 3-Step Process
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4">
          How HireWin gets you <br className="hidden sm:block" />
          <span className="gradient-text">callbacks, not rejections.</span>
        </h2>
        <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          From an unoptimized resume to an ATS-clearing, interview-ready application in under 30 seconds.
        </p>
      </div>

      {/* 3 Step Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
        {STEPS.map((s) => {
          const Icon = s.icon;

          return (
            <div
              key={s.step}
              className="group relative flex flex-col justify-between rounded-3xl p-7 sm:p-8 transition-all duration-300 hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(145deg, #0d1428, #080d1a)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              }}
            >
              <div>
                {/* Step number badge & icon */}
                <div className="flex items-center justify-between mb-6">
                  <span
                    className="text-xs font-mono font-extrabold px-3 py-1 rounded-xl uppercase tracking-wider"
                    style={{ background: `${s.accent}15`, color: s.accent, border: `1px solid ${s.accent}30` }}
                  >
                    Step {s.step}
                  </span>
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110"
                    style={{ background: `${s.accent}15`, border: `1px solid ${s.accent}30` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: s.accent }} />
                  </div>
                </div>

                <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1.5">
                  {s.tag}
                </div>
                <h3 className="text-xl font-extrabold text-white mb-3 leading-snug">{s.title}</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-6">{s.desc}</p>
              </div>

              {/* Clean bullet features */}
              <div className="pt-5 border-t border-white/[0.06] space-y-2.5">
                {s.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: s.accent }} />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action CTA */}
      <div className="mt-12 text-center">
        <Link
          href="/analyze"
          className="inline-flex items-center gap-2.5 text-[var(--on-accent)] font-bold px-8 py-4 rounded-2xl text-base transition-all hover:scale-105 hover:brightness-110 active:scale-95 glow-breathe btn-accent"
          style={{ background: 'var(--accent-fill)' }}
        >
          <span>Start Step 01 — Free Scan</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
        <p className="text-xs text-slate-500 mt-3">Instant preview · No signup required</p>
      </div>
    </section>
  );
}
