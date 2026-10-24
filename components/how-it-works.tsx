'use client';

import React from 'react';
import { motion } from 'motion/react';
import { UploadCloud, Cpu, Award, ArrowRight, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

const STEPS = [
  {
    step: '01',
    title: 'Drop Resume & Target Job',
    tag: 'Instant Ingestion',
    desc: 'Upload your current resume (PDF or DOCX) and paste the target job description or role requirements.',
    icon: UploadCloud,
    accent: '#38BDF8',
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
    accent: '#10B981',
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
    accent: '#34D399',
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
      <div className="text-center mb-12 sm:mb-16">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold text-emerald-400 mb-4 bg-emerald-500/10 border border-emerald-500/20 font-mono">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          Seamless 3-Step Process
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight mb-4 font-display">
          How HireWin gets you <br className="hidden sm:block" />
          <span className="text-emerald-400">callbacks, not rejections.</span>
        </h2>
        <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          From an unoptimized resume to an ATS-clearing, interview-ready application in under 30 seconds.
        </p>
      </div>

      {/* 3 Step Cards Grid with Staggered Motion */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
        {STEPS.map((s, i) => {
          const Icon = s.icon;

          return (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="group relative flex flex-col justify-between rounded-2xl p-6 sm:p-7 transition-all duration-300 hover:border-emerald-500/40 bg-[#0E151C] border border-white/[0.08] shadow-xl hover:-translate-y-1"
            >
              <div>
                {/* Step number badge & icon */}
                <div className="flex items-center justify-between mb-5">
                  <span
                    className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider"
                    style={{ background: `${s.accent}15`, color: s.accent, border: `1px solid ${s.accent}30` }}
                  >
                    Step {s.step}
                  </span>
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                    style={{ background: `${s.accent}15`, border: `1px solid ${s.accent}30` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: s.accent }} />
                  </div>
                </div>

                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 font-mono">
                  {s.tag}
                </div>
                <h3 className="text-lg font-bold text-white mb-2 leading-snug">{s.title}</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-5">{s.desc}</p>
              </div>

              {/* Clean bullet features */}
              <div className="pt-4 border-t border-white/[0.06] space-y-2">
                {s.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Action CTA */}
      <div className="mt-10 sm:mt-12 text-center">
        <Link
          href="/analyze"
          className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-7 py-3.5 rounded-xl text-sm transition-colors shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer"
        >
          <span>Start Step 01 — Free Scan</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
        <p className="text-xs text-slate-500 mt-2.5 font-mono">Instant preview · No signup required</p>
      </div>
    </section>
  );
}
