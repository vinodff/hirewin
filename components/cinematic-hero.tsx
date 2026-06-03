'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, ShieldCheck, Zap, Star } from 'lucide-react';
import RotatingHeadline from '@/components/rotating-headline';
import HeroDemo from '@/components/hero-demo';

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
          ? 'group relative w-full sm:w-auto flex items-center justify-center gap-2 text-white font-bold px-8 py-4 rounded-2xl text-lg overflow-hidden glow-breathe transition-[transform] duration-150 ease-out'
          : 'w-full sm:w-auto flex items-center justify-center gap-2 text-slate-200 font-semibold px-7 py-4 rounded-2xl text-base sm:text-lg border border-white/10 hover:border-purple-400/50 hover:text-white transition-[transform,border-color] duration-150 ease-out'
      }
      style={primary ? { background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', minHeight: 60 } : { minHeight: 60, background: 'rgba(255,255,255,0.025)', backdropFilter: 'blur(8px)' }}
    >
      {primary && (
        <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
            backgroundSize: '200% 100%',
            animation: 'shimmer-x 1.5s linear infinite',
          }} />
      )}
      <span className="relative flex items-center gap-2">{children}</span>
    </Link>
  );
}

/** Letter-by-letter character reveal */
function CharReveal({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <>
      {text.split('').map((ch, i) => (
        <span
          key={i}
          className="char-pop"
          style={{ animationDelay: `${delay + i * 25}ms`, whiteSpace: ch === ' ' ? 'pre' : 'normal' }}
        >
          {ch}
        </span>
      ))}
    </>
  );
}

export default function CinematicHero() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    let raf = 0;
    function onScroll() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setScrollY(window.scrollY));
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, []);

  const parallax = Math.min(scrollY * 0.25, 100);

  return (
    <section className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-12 text-center">

      {/* Live trust pill */}
      <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold mb-8 reveal-up"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(124,58,237,0.3)',
          backdropFilter: 'blur(12px)',
          animationDelay: '0.05s',
        }}>
        <span className="relative flex w-2 h-2">
          <span className="absolute inset-0 rounded-full bg-emerald-400" style={{ animation: 'pulse-ring 2s ease-out infinite' }} />
          <span className="relative w-2 h-2 rounded-full bg-emerald-400" />
        </span>
        <span className="text-slate-300">4,000+ jobseekers using HireWin right now</span>
      </div>

      {/* Headline with character reveal */}
      <h1 className="text-5xl sm:text-6xl lg:text-8xl font-extrabold text-white tracking-tight leading-[0.95] mb-7"
        style={{ transform: `translateY(${-parallax * 0.3}px)`, transition: 'transform 0.1s linear' }}>
        <div className="block reveal-up">
          <CharReveal text="The resume" delay={300} />
        </div>
        <div className="block reveal-up" style={{ animationDelay: '0.2s' }}>
          <CharReveal text="that proves" delay={600} />
        </div>
        <div className="block shimmer-text mt-1 reveal-up" style={{ animationDelay: '0.4s' }}>
          <RotatingHeadline
            words={['you\'re ready.', 'you\'re hireable.', 'you\'re the one.', 'you belong here.']}
            intervalMs={2600}
          />
        </div>
      </h1>

      {/* Subhead */}
      <p className="text-base sm:text-xl text-slate-400 max-w-2xl mx-auto mb-9 leading-relaxed reveal-up px-2"
        style={{ animationDelay: '0.7s' }}>
        Every claim verified. Every skill traced to proof.
        <span className="text-white font-semibold"> The only AI resume tool with a trust score</span> — so you walk into interviews confident, not caught out.
      </p>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-10 reveal-up px-2"
        style={{ animationDelay: '0.85s' }}>
        <MagneticButton href="/analyze" primary>
          Optimize My Resume — Free
          <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
        </MagneticButton>
        <MagneticButton href="/builder">
          Build From Scratch →
        </MagneticButton>
      </div>

      {/* Quick trust strip */}
      <div className="flex items-center justify-center flex-wrap gap-x-6 gap-y-2 text-xs sm:text-sm text-slate-500 mb-12 reveal-up"
        style={{ animationDelay: '1s' }}>
        {[
          { icon: ShieldCheck, text: 'Trust-scored output', color: '#a78bfa' },
          { icon: Zap,         text: '~20s results',        color: '#60a5fa' },
          { icon: Sparkles,    text: 'No credit card',      color: '#34d399' },
          { icon: Star,        text: '4.8★ avg rating',     color: '#fbbf24' },
        ].map(({ icon: Icon, text, color }) => (
          <div key={text} className="flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5" style={{ color }} />
            {text}
          </div>
        ))}
      </div>

      {/* Live demo card with parallax + tilt */}
      <div className="relative reveal-up tilt-3d"
        style={{
          animationDelay: '1.15s',
          transform: `translateY(${parallax * 0.15}px)`,
        }}>
        <HeroDemo />

        {/* Premium glow ring around demo */}
        <div className="absolute -inset-4 rounded-3xl blur-2xl opacity-40 pointer-events-none -z-10"
          style={{ background: 'radial-gradient(ellipse at center, rgba(124,58,237,0.4), transparent 70%)' }} />
      </div>
    </section>
  );
}
