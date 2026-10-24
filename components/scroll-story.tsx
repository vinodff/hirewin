'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Lenis from 'lenis';
import { Check, FileText, Search, ShieldCheck } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * ScrollStory — pinned 3D scroll story for the homepage hero.
 *
 * Native scroll drives the scrub (no scroll-jacking: Lenis only smooths
 * the native wheel, ScrollTrigger still reads native scroll position).
 * Transform / opacity only, so no layout work is done during scroll.
 *
 * Fallbacks, by design:
 * - prefers-reduced-motion: static stage, no GSAP, no Lenis.
 * - viewport < 768px or slow device (hardwareConcurrency < 4): static stage.
 * - JS disabled / GSAP fails to load: the page still shows the server
 *   hero text and CTAs; this component is dynamically imported ssr:false
 *   with a reserved-height placeholder, so there is no layout shift.
 * - Animation pauses when off-screen: ScrollTrigger only runs while its
 *   trigger is in the scroll range, and Lenis is destroyed on unmount.
 */

function StageCard({ label }: { label?: string }) {
  return (
    <div
      className="stage-card relative rounded-2xl overflow-hidden mx-auto w-full max-w-3xl"
      style={{
        background: '#0d1526',
        border: '1px solid rgba(255,255,255,0.09)',
        boxShadow: '0 32px 80px -32px rgba(0,0,0,0.75)',
        transformStyle: 'preserve-3d',
        willChange: 'transform, opacity',
      }}
    >
      <div className="grid sm:grid-cols-[1fr_auto] gap-6 p-5 sm:p-7">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1">Resume — example</p>
          <p className="text-lg font-bold text-white leading-tight">Arjun Sharma</p>
          <p className="text-xs text-slate-400 mb-4">Software Engineer · 3 years experience</p>
          <div className="space-y-2.5 text-sm text-slate-300 leading-relaxed">
            <p><span className="text-slate-500">• </span>Built 4 Spring Boot microservices, reducing API latency by 42%.</p>
            <p><span className="text-slate-500">• </span>Led a 12-sprint release cadence with zero-downtime deployments.</p>
            <p><span className="text-slate-500">• </span>Resolved 23 high-priority issues in under 48 hours.</p>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-4">
            {['React', 'TypeScript', 'Spring Boot', 'AWS', 'CI/CD'].map((k) => (
              <span key={k} className="text-[10px] px-2 py-1 rounded-full" style={{ background: 'rgba(124,58,237,0.10)', color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.22)' }}>{k}</span>
            ))}
          </div>
        </div>
        <div className="flex sm:flex-col items-center gap-4 rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {/* Original SVG dial — illustrative example only */}
          <div className="relative shrink-0" style={{ width: 96, height: 96 }}>
            <svg width={96} height={96} style={{ transform: 'rotate(-90deg)', position: 'absolute', inset: 0 }} aria-hidden="true">
              <circle cx={48} cy={48} r={43} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={5} />
              <circle cx={48} cy={48} r={43} fill="none" stroke="#34d399" strokeWidth={5} strokeLinecap="round" strokeDasharray={`${0.87 * 2 * Math.PI * 43} ${2 * Math.PI * 43}`} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-bold leading-none text-xl text-white">87</span>
              <span className="text-[9px] text-slate-500 leading-none mt-1 tracking-wide">ATS MATCH</span>
            </div>
          </div>
          <div className="text-left sm:text-center">
            <p className="text-xs font-semibold text-slate-200 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Trust-scored</p>
            <p className="text-[11px] text-slate-500 leading-snug mt-0.5">Claims checked against<br className="hidden sm:block" /> the original resume.</p>
          </div>
        </div>
      </div>
      <div className="px-5 sm:px-7 py-3 text-[11px] text-slate-500" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: '#0a1223' }}>
        {label ?? 'Illustrative example · Results vary by job and resume.'}
      </div>
    </div>
  );
}

function FloatingLayer({ className }: { className: string }) {
  return (
    <div className={`float-layer absolute hidden md:flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium text-slate-200 ${className}`} style={{ background: 'rgba(15,22,41,0.9)', border: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 16px 40px -16px rgba(0,0,0,0.7)', willChange: 'transform, opacity' }} aria-hidden="true">
      <span className="w-6 h-6 rounded-full grid place-items-center" style={{ background: 'rgba(124,58,237,0.15)' }}>
        <Search className="w-3.5 h-3.5 text-purple-300" />
      </span>
      JD keywords matched
      <span className="text-emerald-400 font-bold">✓</span>
    </div>
  );
}

function AnimatedPinnedStage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);

  // Lenis smooth scroll, wired to ScrollTrigger. Destroyed on unmount.
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  useGSAP(() => {
    const ctx = gsap.context(() => {
      // Pinned stage: rotate / zoom / parallax, transform + opacity only.
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: pinRef.current,
          start: 'top top',
          end: '+=110%',
          scrub: 1,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });
      tl.fromTo('.stage-card',
        { rotateY: -14, rotateX: 9, scale: 0.92, y: 36, opacity: 0.85 },
        { rotateY: 0, rotateX: 0, scale: 1, y: 0, opacity: 1, ease: 'none', duration: 0.55 },
        0,
      );
      tl.fromTo('.float-layer',
        { y: 48, opacity: 0 },
        { y: 0, opacity: 1, ease: 'none', duration: 0.5, stagger: 0.08 },
        0.1,
      );
      tl.to('.stage-card',
        { rotateY: 5, scale: 1.04, ease: 'none', duration: 0.45 },
        0.55,
      );
      tl.to('.float-layer',
        { y: -28, ease: 'none', duration: 0.45, stagger: 0.05 },
        0.55,
      );
    }, rootRef);
    return () => ctx.revert();
  }, { scope: rootRef });

  return (
    <div ref={rootRef}>
      <div ref={pinRef} className="relative flex flex-col items-center justify-center px-4 sm:px-6 py-10" style={{ minHeight: '92vh', perspective: '1200px' }}>
        <p className="text-center text-[11px] font-medium uppercase tracking-widest text-slate-500 mb-5">Demo — example resume · Scroll to see it turn</p>
        <div className="relative w-full max-w-4xl" style={{ transformStyle: 'preserve-3d' }}>
          <FloatingLayer className="float-layer left-0 top-6 -translate-x-2" />
          <div className="float-layer absolute hidden md:flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium text-slate-200 right-0 bottom-8" style={{ background: 'rgba(15,22,41,0.9)', border: '1px solid rgba(255,255,255,0.10)', willChange: 'transform, opacity' }} aria-hidden="true">
            <FileText className="w-3.5 h-3.5 text-blue-300" /> Verified claims <Check className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <StageCard label="Scroll story · Illustrative example · Results vary by job and resume." />
        </div>
        <p className="text-center text-xs text-slate-500 mt-6">Keep scrolling — the rewrite, ATS check, templates and tracker follow.</p>
      </div>
    </div>
  );
}

export default function ScrollStory() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    const slow = typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency < 4;
    setEnabled(!reduced && !saveData && !slow && window.innerWidth >= 768);
  }, []);

  if (!enabled) {
    // Static fallback: same content, no pin, no animation, no layout shift.
    return (
      <div className="relative px-4 sm:px-6 py-8">
        <p className="text-center text-[11px] font-medium uppercase tracking-widest text-slate-500 mb-4">Demo — example resume</p>
        <StageCard />
      </div>
    );
  }
  return <AnimatedPinnedStage />;
}
