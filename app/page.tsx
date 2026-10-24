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

import ScrollProgress from '@/components/scroll-progress';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: 'var(--ground)' }}>
      {/* ── Fixed Scroll Progress Indicator ──────────────── */}
      <ScrollProgress />

      {/* Animated background — ambient beams, radar sweep, cursor spotlight */}
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
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4 leading-[1.05] tracking-tight font-display">
            Same raw experience.
            <span className="text-emerald-400"> Irresistible recruiter impact.</span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Weak bullet points get rejected by automated filters. HireWin translates your milestones into quantifiable business impact without inventing false claims.
          </p>
        </ScrollReveal>

        <BulletRewriter />

        <ScrollReveal delay={300} className="text-center mt-10">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-8 py-3.5 rounded-xl text-sm transition-colors shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer"
          >
            <span>Try It On My Resume Now</span>
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
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-3 leading-tight tracking-tight font-display">
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
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 leading-tight font-display">
            Frequently Asked Questions
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">Everything you need to know about HireWin’s Trust Score and ATS optimizer.</p>
        </ScrollReveal>
        <LandingFAQ />
      </section>

      {/* ── 9 · GROUNDED ACTION SECTION ─────────────────────────────────── */}
      <section className="relative max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
        <div className="rounded-2xl p-8 sm:p-14 border border-white/[0.08] bg-[#0E151C] shadow-2xl">
          <h2 className="text-2xl sm:text-4xl font-black text-white mb-4 tracking-tight leading-tight font-display">
            Test Your Resume Against the Algorithm
          </h2>
          <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto mb-8 leading-relaxed">
            Upload your resume and paste a target job description. Get instant ATS clearance scoring, missing keyword detection, and verified Google X-Y-Z rewrites.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/analyze"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-7 py-3.5 rounded-xl text-sm transition-colors shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer"
            >
              <span>Start Free Optimization</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/builder"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/10 font-semibold px-6 py-3.5 rounded-xl text-sm transition-colors cursor-pointer"
            >
              <span>Build New Resume</span>
            </Link>
          </div>

          <div className="flex items-center justify-center flex-wrap gap-6 text-xs text-slate-400 mt-8 pt-6 border-t border-white/[0.06] font-mono">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Free to analyze and preview</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-sky-400" />
              <span>Data never shared with third parties</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>0% Hallucination guarantee</span>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
