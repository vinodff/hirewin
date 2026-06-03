import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import AppNav from '@/components/app-nav';
import ScrollReveal from '@/components/scroll-reveal';
import BulletRewriter from '@/components/bullet-rewriter';
import TestimonialMarquee from '@/components/testimonial-marquee';
import LandingFAQ from '@/components/landing-faq';
import CinematicBackground from '@/components/cinematic-background';
import CinematicHero from '@/components/cinematic-hero';
import WhyDifferent from '@/components/why-different';
import FeatureShowcase from '@/components/feature-showcase';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: '#080d1a' }}>

      {/* Animated background — aurora, grid, spotlight */}
      <CinematicBackground />

      <AppNav />

      {/* ── 1 · HERO ─────────────────────────────────────── */}
      <CinematicHero />

      {/* ── 2 · FEATURE SHOWCASE (bento grid) ────────────── */}
      <FeatureShowcase />

      {/* ── 3 · WHY DIFFERENT (4 trust pillars) ─────────── */}
      <WhyDifferent />

      {/* ── 4 · LIVE REWRITER (the "wow" moment) ─────────── */}
      <section className="relative max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <ScrollReveal className="text-center mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-purple-300 mb-5"
            style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)', backdropFilter: 'blur(8px)' }}>
            <Sparkles className="w-3.5 h-3.5" />
            Watch the AI work
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4 leading-[1.05] tracking-tight">
            Same experience.
            <span className="gradient-text"> Completely different story.</span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Your bullet points are holding you back. HireWin reads the JD, understands what the recruiter wants,
            and rewrites your experience with real numbers, impact, and keywords.
          </p>
        </ScrollReveal>

        <BulletRewriter />

        <ScrollReveal delay={300} className="text-center mt-8">
          <Link href="/analyze"
            className="inline-flex items-center gap-2 text-white font-bold px-7 py-3.5 rounded-xl text-base transition-all hover:scale-105 hover:brightness-110 active:scale-95 glow-breathe"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#3b82f6)' }}>
            Try it on my resume
            <ArrowRight className="w-4 h-4" />
          </Link>
        </ScrollReveal>
      </section>

      {/* ── 5 · TESTIMONIALS ──────────────────────────────── */}
      <section className="relative py-16 sm:py-20 overflow-hidden">
        <ScrollReveal className="text-center mb-10 px-4">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white mb-2 leading-tight tracking-tight">
            Loved by people who got hired.
          </h2>
          <p className="text-slate-500 text-sm">4,000+ jobseekers · 4.8★ average</p>
        </ScrollReveal>
        <TestimonialMarquee />
      </section>

      {/* ── 6 · FAQ ───────────────────────────────────────── */}
      <section className="relative max-w-2xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <ScrollReveal className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 leading-tight">
            Common questions.
          </h2>
          <p className="text-slate-500 text-sm">Everything you need to know before you start.</p>
        </ScrollReveal>
        <LandingFAQ />
      </section>

      {/* ── 7 · FINAL CTA ─────────────────────────────────── */}
      <section className="relative max-w-4xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
        <ScrollReveal>
          <div className="relative rounded-3xl p-8 sm:p-14 text-center overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(124,58,237,0.18), rgba(59,130,246,0.12), rgba(52,211,153,0.08))',
              border: '1px solid rgba(124,58,237,0.3)',
              boxShadow: '0 40px 100px -20px rgba(124,58,237,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}>

            <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full blur-3xl opacity-40 pointer-events-none"
              style={{ background: 'radial-gradient(circle, #a78bfa, transparent 70%)' }} />
            <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full blur-3xl opacity-30 pointer-events-none"
              style={{ background: 'radial-gradient(circle, #3b82f6, transparent 70%)' }} />

            <div className="relative">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4 leading-[1.05] tracking-tight">
                Your next interview<br className="hidden sm:block" />
                <span className="gradient-text"> starts with this click.</span>
              </h2>
              <p className="text-slate-300 text-sm sm:text-lg max-w-lg mx-auto mb-8 leading-relaxed">
                Free to optimize. No credit card. ~20 seconds to your trust-scored resume.
              </p>
              <Link href="/analyze"
                className="inline-flex items-center gap-2 text-white font-bold px-8 sm:px-10 py-4 rounded-2xl text-lg sm:text-xl transition-all hover:scale-105 hover:brightness-110 active:scale-95 glow-breathe"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#3b82f6)', minHeight: 60 }}>
                Start free now
                <ArrowRight className="w-5 h-5" />
              </Link>
              <p className="text-xs text-slate-500 mt-5">No sign-up wall · Free unlimited optimizations</p>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ── FOOTER ────────────────────────────────────────── */}
      <footer className="relative max-w-6xl mx-auto px-4 sm:px-6 py-8 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          <span>© 2026 HireWin · Built for jobseekers</span>
          <div className="flex items-center gap-5">
            <Link href="/pricing" className="hover:text-slate-300 transition-colors">Pricing</Link>
            <Link href="/auth/login" className="hover:text-slate-300 transition-colors">Sign in</Link>
            <a href="mailto:hello@hirewin.live" className="hover:text-slate-300 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
