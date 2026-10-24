'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * ResumeStage — a restrained, professional 3D resume stage.
 *
 * - One clean resume card, one score card and keyword chips at different
 *   translateZ depths. No magnetic buttons, no parallax, no looping demo.
 * - The ATS dial animates exactly once, when the stage scrolls into view.
 * - Pointer tilt is fine-pointer only, clamped to ±4°, throttled with
 *   requestAnimationFrame, and reset on pointer leave.
 * - Touch devices get one gentle auto-tilt on first scroll into view,
 *   then return to flat and stay there.
 * - prefers-reduced-motion: static stage, dial at its final value, no tilt.
 * - Everything shown is an example: the stage is labelled "Demo".
 */
function ScoreDial({ active, reducedMotion }: { active: boolean; reducedMotion: boolean }) {
  const size = 96;
  const r = (size - 10) / 2;
  const circumference = 2 * Math.PI * r;
  const score = 87;
  const shown = active || reducedMotion ? score : 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', position: 'absolute', inset: 0 }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={5} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#34d399" strokeWidth={5} strokeLinecap="round"
          strokeDasharray={`${(shown / 100) * circumference} ${circumference}`}
          style={{ transition: reducedMotion ? 'none' : 'stroke-dasharray 1.2s cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-bold leading-none text-xl text-white">{shown}</span>
        <span className="text-[9px] text-slate-500 leading-none mt-1 tracking-wide">ATS MATCH</span>
      </div>
    </div>
  );
}

export default function ResumeStage() {
  const ref = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const [inView, setInView] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [finePointer, setFinePointer] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setReducedMotion(reduced);
    setFinePointer(window.matchMedia('(pointer: fine)').matches);

    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Touch / coarse pointer: one gentle auto-tilt on first view, then flat.
  useEffect(() => {
    if (!inView || reducedMotion || finePointer) return;
    setTilt({ x: 2, y: -2 });
    const t = setTimeout(() => setTilt({ x: 0, y: 0 }), 1200);
    return () => clearTimeout(t);
  }, [inView, reducedMotion, finePointer]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (reducedMotion || !finePointer) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setTilt({ x: Math.max(-4, Math.min(4, -py * 8)), y: Math.max(-4, Math.min(4, px * 8)) });
    });
  }

  function onPointerLeave() {
    if (reducedMotion || !finePointer) return;
    cancelAnimationFrame(rafRef.current);
    setTilt({ x: 0, y: 0 });
  }

  return (
    <div ref={ref} className="relative max-w-3xl mx-auto" style={{ perspective: '1200px' }}>
      <p className="text-center text-[11px] font-medium uppercase tracking-widest text-slate-500 mb-4">
        Demo — example resume
      </p>
      {/* Aspect ratio is reserved by the card itself; no layout shift from tilt. */}
      <div
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        className="resume-stage-card relative rounded-2xl overflow-hidden"
        style={{
          background: '#0d1526',
          border: '1px solid rgba(255,255,255,0.09)',
          boxShadow: '0 24px 60px -24px rgba(0,0,0,0.7)',
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transformStyle: 'preserve-3d',
          transition: 'transform 0.3s ease-out',
        }}
      >
        <div className="grid sm:grid-cols-[1fr_auto] gap-6 p-5 sm:p-7" style={{ transform: 'translateZ(0)' }}>
          {/* Resume document — front layer */}
          <div style={{ transform: 'translateZ(24px)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1">Resume</p>
            <p className="text-lg font-bold text-white leading-tight">Arjun Sharma</p>
            <p className="text-xs text-slate-400 mb-4">Software Engineer · 3 years experience</p>
            <div className="space-y-2.5 text-sm text-slate-300 leading-relaxed">
              <p>
                <span className="text-slate-500">• </span>
                Built 4 Spring Boot microservices, reducing API latency by 42%.
              </p>
              <p>
                <span className="text-slate-500">• </span>
                Led a 12-sprint release cadence with zero-downtime deployments.
              </p>
              <p>
                <span className="text-slate-500">• </span>
                Resolved 23 high-priority issues in under 48 hours.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-4" style={{ transform: 'translateZ(36px)' }}>
              {['React', 'TypeScript', 'Spring Boot', 'AWS', 'CI/CD'].map((k) => (
                <span
                  key={k}
                  className="text-[10px] px-2 py-1 rounded-full"
                  style={{ background: 'rgba(124,58,237,0.10)', color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.22)' }}
                >
                  {k}
                </span>
              ))}
            </div>
          </div>

          {/* Score card — raised layer */}
          <div
            className="flex sm:flex-col items-center gap-4 sm:gap-3 rounded-xl px-4 py-3 sm:py-4"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              transform: 'translateZ(48px)',
            }}
          >
            <ScoreDial active={inView} reducedMotion={reducedMotion} />
            <div className="text-left sm:text-center">
              <p className="text-xs font-semibold text-slate-200">Trust-scored</p>
              <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                Claims checked against
                <br className="hidden sm:block" /> the original resume.
              </p>
            </div>
          </div>
        </div>
        <div
          className="px-5 sm:px-7 py-3 text-[11px] text-slate-500"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: '#0a1223' }}
        >
          Illustrative example · Results vary by job and resume.
        </div>
      </div>
    </div>
  );
}
