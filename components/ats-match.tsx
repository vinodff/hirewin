'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Gauge, Search, X } from 'lucide-react';
import ScrollReveal from '@/components/scroll-reveal';

/**
 * AtsMatch — (b) ATS dial + JD keyword chips.
 * Original SVG dial, animated once on scroll into view (IntersectionObserver,
 * not GSAP, so this section works even if scroll code is disabled).
 * Illustrative JD example only: matched vs. missing keywords are shown as
 * an example diagnosis, not as a claim about the visitor's resume.
 * prefers-reduced-motion: dial jumps straight to its final value.
 */
const MATCHED = ['React', 'TypeScript', 'Spring Boot', 'AWS', 'CI/CD'];
const MISSING = ['Kubernetes', 'GraphQL'];

export default function AtsMatch() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setActive(true); io.disconnect(); }
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const shown = active || reduced ? 87 : 0;
  const r = 52;
  const circ = 2 * Math.PI * r;
  return (
    <section className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
      <ScrollReveal className="text-center mb-10">
        <p className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-purple-300 mb-5" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)' }}>
          <Gauge className="w-4 h-4" /> JD match check
        </p>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-[1.05] tracking-tight">
          See what the ATS sees,<br className="hidden sm:block" /> <span className="gradient-text">before the recruiter does.</span>
        </h2>
        <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
          A 100-point-style score is only useful if it tells you what to fix.
          HireWin shows the match, the missing keywords, and the evidence behind each one.
        </p>
      </ScrollReveal>

      <div ref={ref} className="grid md:grid-cols-[auto_1fr] gap-4 sm:gap-5 items-stretch">
        <ScrollReveal>
          <div className="rounded-2xl p-6 flex flex-col items-center justify-center h-full" style={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="relative" style={{ width: 132, height: 132 }}>
              <svg width={132} height={132} style={{ transform: 'rotate(-90deg)', position: 'absolute', inset: 0 }} aria-hidden="true">
                <circle cx={66} cy={66} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={6} />
                <circle cx={66} cy={66} r={r} fill="none" stroke="#34d399" strokeWidth={6} strokeLinecap="round" strokeDasharray={`${(shown / 100) * circ} ${circ}`} style={{ transition: reduced ? 'none' : 'stroke-dasharray 1.2s cubic-bezier(0.22,1,0.36,1)' }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-bold text-3xl text-white leading-none">{shown}</span>
                <span className="text-[10px] text-slate-500 mt-1 tracking-wide">ATS MATCH</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4 text-center">Illustrative example ·<br />Score from the example JD below</p>
          </div>
        </ScrollReveal>
        <ScrollReveal delay={120}>
          <div className="rounded-2xl p-6 h-full" style={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-sm font-bold text-white mb-1 flex items-center gap-2"><Search className="w-4 h-4 text-purple-300" /> Example job description — Software Engineer</p>
            <p className="text-xs text-slate-500 mb-5">Keywords found in the example resume vs. keywords to add or evidence.</p>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300 mb-2">Matched</p>
            <div className="flex flex-wrap gap-2 mb-5">
              {MATCHED.map((k) => (
                <span key={k} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full" style={{ background: 'rgba(52,211,153,0.10)', color: '#a7f3d0', border: '1px solid rgba(52,211,153,0.25)' }}><Check className="w-3.5 h-3.5" />{k}</span>
              ))}
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Missing or thin evidence</p>
            <div className="flex flex-wrap gap-2">
              {MISSING.map((k) => (
                <span key={k} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.03)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.10)' }}><X className="w-3.5 h-3.5 text-slate-400" />{k} <span className="text-slate-500">— add proof, don&apos;t invent it</span></span>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 mt-6">
              <Link href="/job-scan" className="inline-flex items-center gap-2 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors hover:brightness-110" style={{ background: 'linear-gradient(135deg,#7c3aed,#3b82f6)' }}>Scan a job <ArrowRight className="w-4 h-4" /></Link>
              <Link href="/analyze" className="inline-flex items-center gap-2 text-slate-200 font-semibold px-5 py-2.5 rounded-xl text-sm" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)' }}>Fix my match →</Link>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
