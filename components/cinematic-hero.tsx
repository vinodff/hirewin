'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, ShieldCheck, Zap, Star, CheckCircle2, Lock } from 'lucide-react';
import RotatingHeadline from '@/components/rotating-headline';
import { motion } from 'motion/react';
import PrecisionCockpit from '@/components/precision-cockpit';

function MagneticButton({ children, href, primary }: { children: React.ReactNode; href: string; primary?: boolean }) {
  const ref = useRef<HTMLAnchorElement>(null);

  function onMove(e: React.MouseEvent<HTMLAnchorElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2;
    const y = e.clientY - r.top - r.height / 2;
    el.style.transform = `translate(${x * 0.18}px, ${y * 0.25}px)`;
  }

  function reset() {
    const el = ref.current;
    if (el) el.style.transform = 'translate(0, 0)';
  }

  return (
    <Link
      ref={ref}
      href={href}
      onMouseMove={onMove}
      onMouseLeave={reset}
      className={
        primary
          ? 'group relative w-full sm:w-auto flex items-center justify-center gap-2 text-slate-950 font-bold px-7 py-3.5 rounded-xl text-base transition-all duration-150 ease-out bg-emerald-500 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 active:scale-95'
          : 'w-full sm:w-auto flex items-center justify-center gap-2 text-slate-200 font-semibold px-6 py-3.5 rounded-xl text-base border border-white/10 hover:border-emerald-400/40 hover:text-white transition-all duration-150 ease-out bg-white/[0.03] hover:bg-white/[0.06]'
      }
    >
      <span className="relative flex items-center gap-2">{children}</span>
    </Link>
  );
}

export default function CinematicHero() {
  return (
    <section className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-20 pb-12 text-center">
      {/* Live trust pill */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-6 bg-white/[0.04] border border-white/10 text-slate-300 font-mono"
      >
        <span className="relative flex w-2 h-2">
          <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
          <span className="relative w-2 h-2 rounded-full bg-emerald-400" />
        </span>
        <span className="font-mono text-emerald-400 font-bold">14,200+</span>
        <span>resumes calibrated with 94%+ ATS pass rate</span>
      </motion.div>

      {/* Editorial Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.08] mb-4 max-w-4xl mx-auto font-display"
      >
        Stop getting filtered.<br className="hidden sm:inline" />
        <span className="text-emerald-400"> Optimize your resume</span> for real callbacks.
      </motion.h1>

      {/* Subhead */}
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto mb-8 leading-relaxed px-2 font-normal"
      >
        Upload your resume and target job description. Inspect exact ATS parser matches, identify missing competencies, and synthesize Google X-Y-Z evidence bullets in seconds.
      </motion.p>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-10 px-2"
      >
        <MagneticButton href="/analyze" primary>
          <span>Audit My Resume — Free</span>
          <ArrowRight className="w-4 h-4" />
        </MagneticButton>
        <MagneticButton href="/builder">
          <span>Resume Studio →</span>
        </MagneticButton>
      </motion.div>

      {/* Quick trust strip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="flex items-center justify-center flex-wrap gap-x-6 gap-y-2 text-xs text-slate-400 mb-12 font-mono"
      >
        {[
          { icon: ShieldCheck, text: 'Trust-scored output', color: '#34d399' },
          { icon: Zap, text: '~20s instant analysis', color: '#38bdf8' },
          { icon: Sparkles, text: 'No credit card required', color: '#10b981' },
          { icon: Star, text: '4.8★ average candidate rating', color: '#fbbf24' },
        ].map(({ icon: Icon, text, color }) => (
          <div key={text} className="flex items-center gap-1.5 font-medium">
            <Icon className="w-3.5 h-3.5" style={{ color }} />
            <span>{text}</span>
          </div>
        ))}
      </motion.div>

      {/* Approved Option 1: Precision Instrument Interactive Evaluation Cockpit */}
      <motion.div
        initial={{ opacity: 0, y: 32, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.8, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative mt-2"
      >
        <PrecisionCockpit />
      </motion.div>
    </section>
  );
}
