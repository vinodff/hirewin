'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, X, Sparkles } from 'lucide-react';

type Row = {
  feature: string;
  hirewin: boolean;
  others: boolean;
  detail: string;
};

const ROWS: Row[] = [
  { feature: 'ATS keyword optimization',         hirewin: true,  others: true,  detail: 'Both pass the bot filter.' },
  { feature: 'Honest trust score (0–100)',       hirewin: true,  others: false, detail: 'We grade truthfulness, not just keywords.' },
  { feature: 'Skill evidence map',               hirewin: true,  others: false, detail: 'Every skill linked to project/coursework proof.' },
  { feature: 'Interview risk warnings',          hirewin: true,  others: false, detail: 'We flag what a recruiter could probe.' },
  { feature: 'No fabricated metrics',            hirewin: true,  others: false, detail: 'No "improved X by 40%" if it wasn\'t in your resume.' },
  { feature: 'Job-fit + ATS dual score',         hirewin: true,  others: false, detail: 'Two axes, not one inflated number.' },
  { feature: 'Tone tuned to company type',       hirewin: true,  others: false, detail: 'Startup, FAANG, agency, nonprofit — each different.' },
  { feature: 'Cold email + LinkedIn outreach',   hirewin: true,  others: false, detail: 'Resume isn\'t enough. We write the message too.' },
  { feature: 'Free unlimited optimizations',     hirewin: true,  others: false, detail: 'No paywall on the rewrite. Pay only to download.' },
];

export default function CompetitorGrid() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setVisible(true),
      { threshold: 0, rootMargin: '0px 0px -10% 0px' }
    );
    io.observe(el);
    // Safety: if observer never fires (very tall element, certain browsers),
    // reveal after 800ms so the section is never permanently invisible.
    const fallback = setTimeout(() => setVisible(true), 800);
    return () => { io.disconnect(); clearTimeout(fallback); };
  }, []);

  return (
    <section className="relative py-16 sm:py-28" style={{ background: 'rgba(124,58,237,0.025)', borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6">

        {/* Heading */}
        <div className="text-center mb-12 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-5"
            style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', color: '#6ee7b7' }}>
            <Sparkles className="w-3.5 h-3.5" />
            Feature comparison
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4 leading-tight tracking-tight">
            What you get with HireWin<br className="hidden sm:block" />
            <span className="gradient-text">that no other tool gives you.</span>
          </h2>
        </div>

        {/* 3D table card */}
        <div ref={ref} className="relative"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(40px)',
            transition: 'opacity 0.8s cubic-bezier(0.22,1,0.36,1), transform 0.8s cubic-bezier(0.22,1,0.36,1)',
          }}>

          {/* Glow */}
          <div className="absolute -inset-4 rounded-3xl opacity-50 blur-3xl pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at center, rgba(124,58,237,0.25), transparent 70%)' }} />

          <div className="relative rounded-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, #0e1530, #0a1020)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 40px 80px -20px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}>

            {/* Header row */}
            <div className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[2fr_auto_auto] gap-3 sm:gap-8 px-4 sm:px-8 py-4 sm:py-5"
              style={{ background: 'rgba(255,255,255,0.025)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-slate-500">Feature</span>
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-center w-16 sm:w-20"
                style={{ color: '#c4b5fd' }}>HireWin</span>
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-center w-16 sm:w-20 text-slate-500">Others</span>
            </div>

            {/* Rows */}
            {ROWS.map((row, i) => (
              <div key={row.feature}
                className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[2fr_auto_auto] gap-3 sm:gap-8 px-4 sm:px-8 py-4 sm:py-5 transition-colors hover:bg-white/[0.015]"
                style={{
                  borderBottom: i < ROWS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateX(0)' : 'translateX(-20px)',
                  transition: `opacity 0.5s cubic-bezier(0.22,1,0.36,1) ${i * 60}ms, transform 0.5s cubic-bezier(0.22,1,0.36,1) ${i * 60}ms, background 0.2s`,
                }}>
                <div className="min-w-0">
                  <div className="text-sm sm:text-base font-semibold text-white">{row.feature}</div>
                  <div className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-snug">{row.detail}</div>
                </div>
                <div className="flex items-center justify-center w-16 sm:w-20">
                  {row.hirewin ? (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(59,130,246,0.25))',
                        border: '1px solid rgba(124,58,237,0.5)',
                        boxShadow: '0 0 14px rgba(124,58,237,0.35)',
                      }}>
                      <Check className="w-4 h-4 text-purple-300" strokeWidth={3} />
                    </div>
                  ) : (
                    <X className="w-5 h-5 text-slate-700" />
                  )}
                </div>
                <div className="flex items-center justify-center w-16 sm:w-20">
                  {row.others ? (
                    <Check className="w-5 h-5 text-slate-500" strokeWidth={2.5} />
                  ) : (
                    <X className="w-5 h-5 text-slate-700" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
