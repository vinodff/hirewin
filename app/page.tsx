import Link from 'next/link';
import { ArrowRight, Sparkles, ShieldCheck, Zap } from 'lucide-react';
import AppNav from '@/components/app-nav';
import Footer from '@/components/footer';
import ScrollReveal from '@/components/scroll-reveal';
import BulletRewriter from '@/components/bullet-rewriter';
import LandingFAQ from '@/components/landing-faq';
import CalmDepth from '@/components/calm-depth';
import ScrollStoryLazy from '@/components/scroll-story-lazy';
import WhyDifferent from '@/components/why-different';
import FeatureShowcase from '@/components/feature-showcase';
import PricingStrip from '@/components/pricing-strip';
import HowItWorks from '@/components/how-it-works';
import RewriteCompare from '@/components/rewrite-compare';
import AtsMatch from '@/components/ats-match';
import TemplateGallery from '@/components/template-gallery';
import TrackerPreview from '@/components/tracker-preview';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: '#080d1a' }}>

      {/* Static, calm depth — no animation loop, no cursor spotlight */}
      <CalmDepth />

      <AppNav />

      {/* ── 1 · HERO — server-rendered headline, subhead and CTAs ── */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-20 pb-12 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold mb-8"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.12)',
          }}>
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-slate-300">AI resume optimizer · Trust-scored output</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.05] mb-6">
          The resume that proves
          <br />
          <span className="gradient-text">you&apos;re ready.</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-9 leading-relaxed px-2">
          Every claim verified. Every skill traced to proof. HireWin scores your resume
          for trust — so you walk into interviews confident, not caught out.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-8 px-2">
          <Link href="/analyze"
            className="w-full sm:w-auto flex items-center justify-center gap-2 text-white font-semibold px-8 py-3.5 rounded-xl text-base transition-colors hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', minHeight: 52 }}>
            Optimize My Resume — Free
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link href="/builder"
            className="w-full sm:w-auto flex items-center justify-center gap-2 text-slate-200 font-semibold px-7 py-3.5 rounded-xl text-base transition-colors hover:text-white hover:border-white/25"
            style={{ minHeight: 52, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)' }}>
            Build From Scratch →
          </Link>
        </div>

        <div className="flex items-center justify-center flex-wrap gap-x-6 gap-y-2 text-xs sm:text-sm text-slate-500 mb-12">
          {[
            { icon: ShieldCheck, text: 'Trust-scored output' },
            { icon: Zap, text: '~20 seconds' },
            { icon: Sparkles, text: 'No credit card' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-1.5">
              <Icon className="w-3.5 h-3.5 text-slate-400" />
              {text}
            </div>
          ))}
          <span>2 free optimizations/month</span>
        </div>

      </section>

      {/* ── 1b · 3D SCROLL STORY — pinned stage, lazy-loaded, labelled Demo, static without JS / on small screens / with reduced motion ── */}
      <ScrollStoryLazy />

      {/* ── 2 · FEATURE SHOWCASE (bento grid) ────────────── */}
      <FeatureShowcase />

      {/* ── 3 · WHY DIFFERENT (4 trust pillars) ─────────── */}
      <WhyDifferent />

      {/* ── 3b · BEFORE / AFTER REWRITE ─────────────────── */}
      <RewriteCompare />

      {/* ── 3c · ATS DIAL + JD KEYWORDS ─────────────────── */}
      <AtsMatch />

      {/* ── 3d · TEMPLATE GALLERY ───────────────────────── */}
      <TemplateGallery />

      {/* ── 3e · JOB-TRACKER PREVIEW ────────────────────── */}
      <TrackerPreview />

      {/* ── 4 · LIVE REWRITER (the "wow" moment) ─────────── */}
      <section className="relative max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <ScrollReveal className="text-center mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-purple-300 mb-5"
            style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)' }}>
            <Sparkles className="w-3.5 h-3.5" />
            Watch the AI work
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-[1.05] tracking-tight">
            Same experience.
            <span className="gradient-text"> Completely different story.</span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Your bullet points are holding you back. HireWin reads the JD, understands what the recruiter wants,
            and rewrites your experience with real numbers, impact, and keywords.
          </p>
        </ScrollReveal>

        <BulletRewriter />
        <p className="text-center text-xs text-slate-500 mt-6">Examples shown are illustrative.</p>

        <ScrollReveal delay={300} className="text-center mt-8">
          <Link href="/analyze"
            className="inline-flex items-center gap-2 text-white font-semibold px-7 py-3.5 rounded-xl text-base transition-colors hover:brightness-110"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#3b82f6)' }}>
            Try it on my resume
            <ArrowRight className="w-4 h-4" />
          </Link>
        </ScrollReveal>
      </section>

      {/* ── 5 · HOW IT WORKS (replaces unsourced testimonials) ── */}
      <HowItWorks />

      {/* ── 6 · PRICING STRIP (new — previously absent from homepage) ── */}
      <PricingStrip />

      {/* ── 7 · FAQ ───────────────────────────────────────── */}
      <section className="relative max-w-2xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <ScrollReveal className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 leading-tight">
            Common questions.
          </h2>
          <p className="text-slate-500 text-sm">Everything you need to know before you start.</p>
        </ScrollReveal>
        <LandingFAQ />
      </section>

      {/* ── 8 · FINAL CTA ─────────────────────────────────── */}
      <section className="relative max-w-4xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
        <ScrollReveal>
          <div className="relative rounded-3xl p-8 sm:p-14 text-center overflow-hidden"
            style={{
              background: '#0f1629',
              border: '1px solid rgba(124,58,237,0.30)',
            }}>
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-[1.05] tracking-tight">
                Your next interview<br className="hidden sm:block" />
                <span className="gradient-text"> starts with this click.</span>
              </h2>
              <p className="text-slate-300 text-sm sm:text-lg max-w-lg mx-auto mb-8 leading-relaxed">
                Free to optimize. No credit card. ~20 seconds to your trust-scored resume.
              </p>
              <Link href="/analyze"
                className="inline-flex items-center gap-2 text-white font-semibold px-8 sm:px-10 py-4 rounded-xl text-lg sm:text-xl transition-colors hover:brightness-110"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#3b82f6)', minHeight: 60 }}>
                Start free now
                <ArrowRight className="w-5 h-5" />
              </Link>
              <p className="text-xs text-slate-500 mt-5">Free to optimize · No credit card · 2 free optimizations/month</p>
            </div>
          </div>
        </ScrollReveal>
      </section>

      <Footer />
    </div>
  );
}
