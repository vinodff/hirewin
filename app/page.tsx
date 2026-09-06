import Link from 'next/link';
import { ArrowRight, Sparkles, ShieldCheck, CheckCircle2, Lock, Zap } from 'lucide-react';
import AppNav from '@/components/app-nav';
import Footer from '@/components/footer';
import ScrollReveal from '@/components/scroll-reveal';
import BulletRewriter from '@/components/bullet-rewriter';
import TestimonialMarquee from '@/components/testimonial-marquee';
import LandingFAQ from '@/components/landing-faq';
import CinematicBackground from '@/components/cinematic-background';
import CinematicHero from '@/components/cinematic-hero';
import FeatureShowcase from '@/components/feature-showcase';
import SocialProofBar from '@/components/social-proof-bar';
import HowItWorks from '@/components/how-it-works';
import TrustMatrix from '@/components/trust-matrix';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: 'var(--ground)' }}>
      {/* Animated background — aurora, grid, spotlight */}
      <CinematicBackground />

      <AppNav />

      {/* ── 1 · HERO ─────────────────────────────────────── */}
      <CinematicHero />

      {/* ── 2 · SOCIAL PROOF & METRICS STRIP ─────────────── */}
      <ScrollReveal>
        <SocialProofBar />
      </ScrollReveal>

      {/* ── 3 · HOW IT WORKS (3 Simple Steps) ────────────── */}
      <ScrollReveal>
        <HowItWorks />
      </ScrollReveal>

      {/* ── 4 · LIVE INTERACTIVE TRANSFORMATION PLAYGROUND ─ */}
      <section className="relative max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <ScrollReveal className="text-center mb-10 sm:mb-14">
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold text-accent-300 mb-4"
            style={{
              background: 'rgba(var(--accent-rgb), 0.1)',
              border: '1px solid rgba(var(--accent-rgb), 0.25)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Live AI Transformation
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4 leading-[1.05] tracking-tight">
            Same raw experience.
            <span className="gradient-text"> Irresistible recruiter impact.</span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Weak bullet points get rejected by automated filters. HireWin translates your milestones into quantifiable business impact without inventing false claims.
          </p>
        </ScrollReveal>

        <BulletRewriter />

        <ScrollReveal delay={300} className="text-center mt-10">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 text-[var(--on-accent)] font-bold px-8 py-4 rounded-xl text-base transition-all hover:scale-105 hover:brightness-110 active:scale-95 glow-breathe btn-accent"
            style={{ background: 'var(--accent-fill)' }}
          >
            Try It On My Resume Now
            <ArrowRight className="w-4 h-4" />
          </Link>
        </ScrollReveal>
      </section>

      {/* ── 5 · WHY HIREWIN IS DIFFERENT (Trust Matrix) ──── */}
      <ScrollReveal>
        <TrustMatrix />
      </ScrollReveal>

      {/* ── 6 · FEATURE SHOWCASE (Full Toolkit Bento Grid) ── */}
      <ScrollReveal>
        <FeatureShowcase />
      </ScrollReveal>

      {/* ── 7 · VERIFIED TESTIMONIALS (Social Proof) ──────── */}
      <section className="relative py-16 sm:py-24 overflow-hidden border-t border-white/[0.05]">
        <ScrollReveal className="text-center mb-12 px-4">
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold text-emerald-400 mb-4"
            style={{
              background: 'rgba(52,211,153,0.1)',
              border: '1px solid rgba(52,211,153,0.25)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Verified Success Stories
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-3 leading-tight tracking-tight">
            Loved by candidates who got hired.
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-lg mx-auto">
            14,000+ jobseekers · 4.8★ average candidate rating across engineering, product, and data.
          </p>
        </ScrollReveal>
        <TestimonialMarquee />
      </section>

      {/* ── 8 · FREQUENTLY ASKED QUESTIONS ────────────────── */}
      <section className="relative max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <ScrollReveal className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 leading-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">Everything you need to know about HireWin’s Trust Score and ATS optimizer.</p>
        </ScrollReveal>
        <LandingFAQ />
      </section>

      {/* ── 9 · FINAL CALL TO ACTION ──────────────────────── */}
      <section className="relative max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
        <ScrollReveal>
          <div
            className="relative rounded-3xl p-8 sm:p-14 text-center overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(var(--accent-rgb), 0.2), rgba(var(--accent-rgb), 0.1), rgba(52,211,153,0.08))',
              border: '1px solid rgba(var(--accent-rgb), 0.35)',
              boxShadow: '0 40px 100px -20px rgba(var(--accent-rgb), 0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            <div
              className="absolute -top-24 -left-24 w-80 h-80 rounded-full blur-3xl opacity-40 pointer-events-none"
              style={{ background: 'radial-gradient(circle, var(--accent-soft), transparent 70%)' }}
            />
            <div
              className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full blur-3xl opacity-30 pointer-events-none"
              style={{ background: 'radial-gradient(circle, var(--accent), transparent 70%)' }}
            />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold text-accent-300 mb-6 bg-white/[0.05] border border-white/10">
                <Zap className="w-3.5 h-3.5 text-accent-400" />
                Free to try · Instant Results
              </div>

              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-5 leading-[1.05] tracking-tight">
                Your next interview callback<br className="hidden sm:block" />
                <span className="gradient-text"> starts with one click.</span>
              </h2>
              <p className="text-slate-300 text-sm sm:text-lg max-w-xl mx-auto mb-8 leading-relaxed">
                Scan your resume against any job description in 20 seconds. Get an ATS score, evidence verification, and tailored interview battlecards.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/analyze"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-[var(--on-accent)] font-extrabold px-8 sm:px-10 py-4 rounded-2xl text-lg sm:text-xl transition-all hover:scale-105 hover:brightness-110 active:scale-95 glow-breathe btn-accent shadow-xl shadow-accent-500/25"
                  style={{ background: 'var(--accent-fill)', minHeight: 60 }}
                >
                  Start Free Optimization
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/builder"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-white font-semibold px-7 py-4 rounded-2xl text-base border border-white/15 hover:bg-white/10 transition-all"
                  style={{ minHeight: 60 }}
                >
                  Build New Resume
                </Link>
              </div>

              {/* Guarantees */}
              <div className="flex items-center justify-center flex-wrap gap-6 text-xs text-slate-400 mt-8 pt-6 border-t border-white/10">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-accent-400" />
                  <span>100% Data privacy guarantee</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                  <span>94%+ ATS verification standard</span>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      <Footer />
    </div>
  );
}
