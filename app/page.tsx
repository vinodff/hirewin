import Link from 'next/link';
import {
  ArrowRight, CheckCircle, Download, FileText,
  Zap, Target, TrendingUp, Shield, Clock, Inbox,
  MessageSquare, Sparkles, Filter, AlertTriangle, BarChart3,
  PenLine, Brain, Rocket, Star, Users, Award,
} from 'lucide-react';
import AppNav from '@/components/app-nav';
import LandingFAQ from '@/components/landing-faq';
import ScrollReveal from '@/components/scroll-reveal';
import AnimatedCounter from '@/components/animated-counter';
import AnimatedBar from '@/components/animated-bar';
import RotatingHeadline from '@/components/rotating-headline';
import TestimonialMarquee from '@/components/testimonial-marquee';
import HeroDemo from '@/components/hero-demo';
import BulletRewriter from '@/components/bullet-rewriter';
import TimeSaved from '@/components/time-saved';

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: '#080d1a' }}>

      {/* ── Dot-grid texture ── */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(148,163,184,0.08) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />

      {/* ── Ambient orbs ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full opacity-20 animate-float"
          style={{ background: 'radial-gradient(ellipse, rgba(124,58,237,0.8) 0%, transparent 65%)', animationDuration: '9s' }} />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full opacity-12 animate-float"
          style={{ background: 'radial-gradient(ellipse, rgba(59,130,246,0.9) 0%, transparent 65%)', animationDelay: '-3s', animationDuration: '12s' }} />
        <div className="absolute bottom-1/4 -left-32 w-[400px] h-[400px] rounded-full opacity-10 animate-float"
          style={{ background: 'radial-gradient(ellipse, rgba(52,211,153,0.6) 0%, transparent 65%)', animationDelay: '-6s', animationDuration: '15s' }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full opacity-30 animate-spin-slow conic-spot" />
      </div>

      <AppNav />

      {/* ══════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════ */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-20 pb-4 text-center">

        {/* Floating icon badges */}
        {([
          { icon: Target,      label: 'ATS-Ready',     color: '#a78bfa', pos: { top: '8%',   left: '0%'  }, delay: '0s',   dur: '5s'   },
          { icon: Zap,         label: 'AI-Powered',    color: '#60a5fa', pos: { top: '18%',  right: '0%' }, delay: '1.4s', dur: '6s'   },
          { icon: TrendingUp,  label: '+57 pts avg',   color: '#34d399', pos: { bottom:'40%', left: '0%'  }, delay: '0.7s', dur: '4.5s' },
          { icon: Shield,      label: 'Private',       color: '#fb923c', pos: { bottom:'26%', right: '0%' }, delay: '2s',   dur: '7s'   },
          { icon: Download,    label: 'PDF & DOCX',    color: '#f472b6', pos: { top: '58%',  right: '0%' }, delay: '0.3s', dur: '5.5s' },
          { icon: CheckCircle, label: 'Free to start', color: '#4ade80', pos: { top: '44%',  left: '0%'  }, delay: '1.1s', dur: '6.5s' },
        ] as const).map(({ icon: Icon, label, color, pos, delay, dur }) => (
          <div key={label}
            className="absolute hidden xl:flex items-center gap-2 px-3 py-2 rounded-xl animate-float"
            style={{
              ...pos, animationDelay: delay, animationDuration: dur,
              background: 'rgba(8,13,26,0.88)',
              border: `1px solid ${color}35`,
              boxShadow: `0 4px 20px ${color}15`,
              backdropFilter: 'blur(8px)',
              zIndex: 10,
            }}>
            <Icon className="w-4 h-4" style={{ color }} />
            <span className="text-xs font-semibold text-slate-300">{label}</span>
          </div>
        ))}

        {/* Live badge */}
        <div className="relative inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold mb-7 animate-slide-up-sm"
          style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.28)', color: '#c4b5fd' }}>
          <span className="relative flex w-2.5 h-2.5 shrink-0">
            <span className="absolute inset-0 rounded-full bg-purple-400 ripple-ring" />
            <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-purple-500" />
          </span>
          Free to preview · No credit card needed
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-white tracking-tight mb-5 leading-[1.07]">
          <span className="block animate-slide-up-sm" style={{ animationDelay: '0.06s' }}>Your resume deserves</span>
          <span className="block animate-slide-up-sm" style={{ animationDelay: '0.18s' }}>to get you</span>
          <span className="block animate-slide-up-sm gradient-text-animated" style={{ animationDelay: '0.3s' }}>
            <RotatingHeadline
              words={['interviews.', 'callbacks.', 'shortlisted.', 'hired.']}
              intervalMs={2300}
            />
          </span>
        </h1>

        <p className="text-base sm:text-xl text-slate-400 max-w-2xl mx-auto mb-8 leading-relaxed animate-slide-up-sm px-2"
          style={{ animationDelay: '0.44s' }}>
          75% of resumes never reach a human. ATS bots filter them silently.
          HireWin rewrites yours to match the exact job —
          keyword-perfect, impact-driven — in <span className="text-white font-bold">under 30 seconds</span>.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-7 animate-slide-up-sm px-2"
          style={{ animationDelay: '0.54s' }}>
          <Link href="/analyze"
            className="shimmer-btn animate-glow-pulse w-full sm:w-auto flex items-center justify-center gap-2 text-white font-bold px-8 py-4 rounded-xl text-lg transition-all hover:scale-[1.03] hover:brightness-110 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', minHeight: 56 }}>
            Improve My Resume — Free
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link href="/builder"
            className="w-full sm:w-auto flex items-center justify-center gap-2 text-slate-300 font-semibold px-6 py-4 rounded-xl text-base sm:text-lg border border-white/10 hover:border-purple-500/40 hover:text-white transition-all"
            style={{ minHeight: 56 }}>
            Build Resume from Scratch →
          </Link>
        </div>

        {/* Trust row */}
        <div className="flex items-center justify-center flex-wrap gap-4 sm:gap-8 text-xs sm:text-sm text-slate-500 mb-10 sm:mb-14 animate-slide-up-sm"
          style={{ animationDelay: '0.66s' }}>
          {[
            { icon: CheckCircle, text: 'No data sold', color: '#4ade80' },
            { icon: Zap,         text: '~20s results', color: '#a78bfa' },
            { icon: Shield,      text: 'Free to start', color: '#60a5fa' },
            { icon: Star,        text: '4,000+ users',  color: '#fbbf24' },
          ].map(({ icon: Icon, text, color }) => (
            <div key={text} className="flex items-center gap-1.5">
              <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
              {text}
            </div>
          ))}
        </div>

        {/* ── Animated Hero Demo ── */}
        <div className="animate-scale-in" style={{ animationDelay: '0.35s' }}>
          <HeroDemo />
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px mt-5 rounded-2xl overflow-hidden animate-scale-in"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', animationDelay: '0.8s' }}>
          {[
            { value: '30s',    label: 'Avg. processing time'   },
            { value: '+57pts', label: 'Avg. score improvement' },
            { value: '∞',      label: 'Free previews / month'  },
            { value: '4k+',    label: 'Indian job seekers'     },
          ].map(({ value, label }) => (
            <div key={label} className="py-4 sm:py-5 text-center group cursor-default transition-all hover:bg-white/[0.02]"
              style={{ background: '#08111f' }}>
              <div className="text-xl sm:text-2xl font-extrabold gradient-text mb-0.5 sm:mb-1 group-hover:scale-110 transition-transform duration-300">
                {value}
              </div>
              <div className="text-[10px] sm:text-xs text-slate-500 px-1">{label}</div>
            </div>
          ))}
        </div>
      </section>


      {/* ══════════════════════════════════════════════
          BULLET REWRITER — The "how" moment
      ══════════════════════════════════════════════ */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-24">
        <ScrollReveal className="text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-purple-400 mb-4"
            style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
            <Sparkles className="w-3.5 h-3.5" />
            Watch the AI work
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-5xl font-extrabold text-white mb-4 leading-tight">
            Same experience.<br className="hidden sm:block" />
            <span className="gradient-text"> Completely different story.</span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
            Your bullet points are holding you back. HireWin reads the job description,
            understands what the recruiter wants, and rewrites your experience to match —
            with real numbers, impact, and keywords.
          </p>
        </ScrollReveal>
        <BulletRewriter />
        <ScrollReveal delay={300} className="text-center mt-8">
          <Link href="/analyze"
            className="inline-flex items-center gap-2 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#3b82f6)' }}>
            Try it on my resume
            <ArrowRight className="w-4 h-4" />
          </Link>
        </ScrollReveal>
      </section>


      {/* ══════════════════════════════════════════════
          TIME SAVED
      ══════════════════════════════════════════════ */}
      <section className="py-14 sm:py-24"
        style={{ background: 'rgba(124,58,237,0.03)', borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <ScrollReveal className="text-center mb-10 sm:mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-yellow-400 mb-4"
              style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
              <Clock className="w-3.5 h-3.5" />
              Your time is worth more
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-5xl font-extrabold text-white mb-4 leading-tight">
              What took 2 hours<br className="hidden sm:block" />
              <span className="text-yellow-400"> now takes 30 seconds.</span>
            </h2>
            <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
              Stop spending your weekends rewriting bullets and second-guessing keywords.
              Apply to 5 jobs in the time it used to take to tailor one.
            </p>
          </ScrollReveal>
          <TimeSaved />
        </div>
      </section>


      {/* ══════════════════════════════════════════════
          THE HARD TRUTH — stats
      ══════════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-24">
        <ScrollReveal className="text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-4"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
            <AlertTriangle className="w-3.5 h-3.5" />
            The hard truth
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-5xl font-extrabold text-white mb-4 leading-tight">
            Job hunting in 2026<br className="hidden sm:block" /> is brutally unfair.
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
            You&apos;re not failing because you&apos;re unqualified.
            You&apos;re getting eliminated by algorithms before a human ever opens your resume.
          </p>
        </ScrollReveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {([
            { icon: Filter,   big: '75%',     title: 'Filtered by ATS bots',   desc: 'of resumes never reach a human. Silent keyword filters kill your shot.', color: '#ef4444' },
            { icon: Clock,    big: '7.4s',    title: 'Recruiter glance time',  desc: 'Average seconds a recruiter spends on your resume before deciding.',       color: '#f59e0b' },
            { icon: Inbox,    big: '1/250',   title: 'Generic callback rate',  desc: 'Average callbacks from non-tailored resume blasts on Indian job portals.', color: '#fb923c' },
            { icon: BarChart3,big: '3×',      title: 'Tailored advantage',     desc: 'Tailored resumes get 3× more callbacks. Every time. No exceptions.',       color: '#34d399' },
          ] as const).map(({ icon: Icon, big, title, desc, color }, i) => (
            <ScrollReveal key={title} delay={i * 90} direction="up">
              <div className="group relative rounded-2xl p-5 sm:p-6 h-full transition-all duration-300 hover:-translate-y-2 cursor-default"
                style={{ background: '#0c1220', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110"
                  style={{ background: `${color}18`, border: `1px solid ${color}28` }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold mb-1 tabular-nums" style={{ color }}>{big}</div>
                <div className="text-sm font-bold text-white mb-2">{title}</div>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
                <div className="absolute -bottom-px left-4 right-4 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: `linear-gradient(90deg,transparent,${color},transparent)` }} />
              </div>
            </ScrollReveal>
          ))}
        </div>
        <ScrollReveal delay={400}>
          <p className="text-center text-xs text-slate-700 mt-6 px-4">
            Sources: Jobscan ATS report · TheLadders eye-tracking study · HireWin internal data
          </p>
        </ScrollReveal>
      </section>


      {/* ══════════════════════════════════════════════
          SAME MONDAY — day in life
      ══════════════════════════════════════════════ */}
      <section className="py-14 sm:py-24"
        style={{ background: 'rgba(124,58,237,0.04)', borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <ScrollReveal className="text-center mb-10 sm:mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-purple-400 mb-4"
              style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
              Your next Monday
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-5xl font-extrabold text-white mb-4 leading-tight">
              Same day.<br className="hidden sm:block" />
              <span className="gradient-text">Two completely different lives.</span>
            </h2>
            <p className="text-slate-400 text-sm sm:text-base max-w-lg mx-auto">
              This isn&apos;t a productivity hack. It&apos;s a fundamentally different job search.
            </p>
          </ScrollReveal>

          <div className="grid lg:grid-cols-2 gap-5">
            {/* Without */}
            <ScrollReveal direction="left">
              <div className="rounded-2xl p-5 sm:p-7 h-full"
                style={{ background: '#0c1220', border: '1px solid rgba(239,68,68,0.18)' }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-red-400">Without HireWin</div>
                    <div className="text-sm font-semibold text-white mt-0.5">The application grind</div>
                  </div>
                </div>
                <div className="space-y-5">
                  {([
                    { time: '07:30', icon: Inbox,       text: '3 polite rejection emails before your chai is hot.' },
                    { time: '10:00', icon: PenLine,     text: 'Rewriting bullets for the 9th time. Guessing keywords.' },
                    { time: '13:00', icon: Filter,      text: 'Spamming the same generic resume across 25 portals.' },
                    { time: '17:00', icon: BarChart3,   text: 'ATS scan: 31% match. Resume quietly filtered out.' },
                    { time: '22:00', icon: Clock,       text: 'Inbox: empty. Self-doubt: rising. Repeat tomorrow.' },
                  ] as const).map((step, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center shrink-0">
                        <span className="text-[10px] font-mono font-bold text-red-400 mb-1.5 whitespace-nowrap">{step.time}</span>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center"
                          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                          <step.icon className="w-3.5 h-3.5 text-red-400" />
                        </div>
                        {i < 4 && <div className="w-px flex-1 mt-2 min-h-[16px]" style={{ background: 'rgba(239,68,68,0.15)' }} />}
                      </div>
                      <p className="text-sm text-slate-400 leading-relaxed pt-6">{step.text}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-5 flex items-center gap-2 text-sm font-semibold text-red-400"
                  style={{ borderTop: '1px solid rgba(239,68,68,0.1)' }}>
                  <Clock className="w-4 h-4" /> Hours wasted: 6+ · Callbacks: 0
                </div>
              </div>
            </ScrollReveal>

            {/* With HireWin */}
            <ScrollReveal direction="right" delay={120}>
              <div className="rounded-2xl p-5 sm:p-7 h-full relative overflow-hidden"
                style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.28)' }}>
                <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-15"
                  style={{ background: 'radial-gradient(circle,#7c3aed,transparent)' }} />
                <div className="flex items-center gap-3 mb-6 relative">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(124,58,237,0.16)', border: '1px solid rgba(124,58,237,0.35)' }}>
                    <Sparkles className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-purple-400">With HireWin</div>
                    <div className="text-sm font-semibold text-white mt-0.5">Land interviews on autopilot</div>
                  </div>
                </div>
                <div className="space-y-5 relative">
                  {([
                    { time: '07:30', icon: Brain,        text: 'Paste resume + JD. AI reads the job in seconds.' },
                    { time: '07:31', icon: Sparkles,     text: 'Bullets rewritten with quantified, recruiter-grade impact.' },
                    { time: '07:33', icon: Download,     text: 'Download polished PDF. Submit before your coffee cools.' },
                    { time: '11:00', icon: MessageSquare,text: '"Hi, are you free for a quick call?" — first recruiter ping.' },
                    { time: '18:00', icon: Rocket,       text: '3 interviews this week. You prep, not panic.' },
                  ] as const).map((step, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center shrink-0">
                        <span className="text-[10px] font-mono font-bold text-purple-300 mb-1.5 whitespace-nowrap">{step.time}</span>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center"
                          style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.4)' }}>
                          <step.icon className="w-3.5 h-3.5 text-purple-300" />
                        </div>
                        {i < 4 && <div className="w-px flex-1 mt-2 min-h-[16px]" style={{ background: 'rgba(124,58,237,0.2)' }} />}
                      </div>
                      <p className="text-sm text-slate-200 leading-relaxed pt-6">{step.text}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-5 flex items-center gap-2 text-sm font-semibold text-emerald-400"
                  style={{ borderTop: '1px solid rgba(124,58,237,0.12)' }}>
                  <CheckCircle className="w-4 h-4" /> Time spent: 30 seconds · Callbacks: 3 this week
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>


      {/* ══════════════════════════════════════════════
          REAL RESULTS — score comparison
      ══════════════════════════════════════════════ */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-24">
        <ScrollReveal className="text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-purple-400 mb-4"
            style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
            <Award className="w-3.5 h-3.5" />
            See the score jump
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-5xl font-extrabold text-white mb-4">
            One resume. Two versions.<br className="hidden sm:block" />
            <span className="gradient-text">The gap is everything.</span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">Real improvements. Not keyword stuffing — intelligent, context-aware tailoring.</p>
        </ScrollReveal>

        <div className="grid sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
          <ScrollReveal direction="left">
            <div className="rounded-2xl p-5 sm:p-7 h-full" style={{ background: '#0c1220', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-1">BEFORE</div>
                  <div className="text-sm text-slate-400">Generic, unoptimized resume</div>
                </div>
                <div className="text-5xl sm:text-6xl font-extrabold tabular-nums leading-none" style={{ color: '#ef4444' }}>34</div>
              </div>
              <div className="space-y-4 sm:space-y-5">
                {([
                  { label: 'ATS Score',     value: 34,  color: '#ef4444', delay: 0   },
                  { label: 'Keyword Match', value: 34,  color: '#ef4444', delay: 120 },
                  { label: 'Impact Bullets',value: 22,  color: '#ef4444', delay: 240 },
                  { label: 'Format Quality',value: 40,  color: '#ef4444', delay: 360 },
                ] as const).map(({ label, value, color, delay }) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-500">{label}</span>
                      <span style={{ color }}>{value}%</span>
                    </div>
                    <AnimatedBar value={value} color={color} delay={delay} />
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="right" delay={100}>
            <div className="rounded-2xl p-5 sm:p-7 h-full relative overflow-hidden"
              style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.25)' }}>
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-10"
                style={{ background: 'radial-gradient(circle,#7c3aed,transparent)' }} />
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-xs font-bold uppercase tracking-widest text-purple-400">AFTER</div>
                    <span className="text-xs font-black px-2 py-0.5 rounded-full animate-bounce-soft"
                      style={{ background: 'rgba(124,58,237,0.18)', color: '#a78bfa' }}>+57 pts</span>
                  </div>
                  <div className="text-sm text-slate-400">HireWin optimised</div>
                </div>
                <div className="text-5xl sm:text-6xl font-extrabold tabular-nums leading-none" style={{ color: '#4ade80' }}>91</div>
              </div>
              <div className="space-y-4 sm:space-y-5">
                {([
                  { label: 'ATS Score',     value: 91,  color: '#4ade80', delay: 0   },
                  { label: 'Keyword Match', value: 91,  color: '#4ade80', delay: 120 },
                  { label: 'Impact Bullets',value: 87,  color: '#4ade80', delay: 240 },
                  { label: 'Format Quality',value: 94,  color: '#4ade80', delay: 360 },
                ] as const).map(({ label, value, color, delay }) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-500">{label}</span>
                      <span style={{ color }}>{value}%</span>
                    </div>
                    <AnimatedBar value={value} color={color} delay={delay} />
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
        <ScrollReveal delay={200}>
          <p className="text-center text-xs text-slate-700 mt-5 px-4">
            Illustrative averages · Real results from Indian job seekers across IT, MBA & startup roles
          </p>
        </ScrollReveal>
      </section>


      {/* ══════════════════════════════════════════════
          HOW IT WORKS — 3 steps
      ══════════════════════════════════════════════ */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-24">
        <ScrollReveal className="text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-purple-400 mb-4"
            style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
            3 steps · ~30 seconds
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-5xl font-extrabold text-white mb-4">
            Dead simple.<br className="hidden sm:block" />
            <span className="gradient-text">Insanely effective.</span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">No forms. No questionnaires. No waiting. Just paste and watch.</p>
        </ScrollReveal>

        <div className="relative grid sm:grid-cols-3 gap-5 sm:gap-6">
          <div className="hidden sm:block absolute top-16 left-[calc(33.33%+20px)] right-[calc(33.33%+20px)] h-px z-0"
            style={{ background: 'linear-gradient(90deg,rgba(124,58,237,0.5),rgba(59,130,246,0.5))' }} />

          {([
            { num: '01', icon: FileText,  title: 'Paste Resume + Job',     desc: 'Drop your resume and the job description. Upload PDF or paste text. Takes 30 seconds.',                color: '#a78bfa', delay: 0   },
            { num: '02', icon: Zap,       title: 'AI Tailors in Real-time', desc: 'We find keyword gaps, rewrite weak bullets with strong verbs and numbers, inject missing skills.', color: '#60a5fa', delay: 130 },
            { num: '03', icon: Download,  title: 'Download and Apply',     desc: 'Get your improved resume as PDF or DOCX. Your score jumps. Apply with real confidence.',             color: '#34d399', delay: 260 },
          ] as const).map(({ num, icon: Icon, title, desc, color, delay }) => (
            <ScrollReveal key={num} delay={delay} direction="up">
              <div className="group relative gradient-border rounded-2xl p-6 sm:p-8 h-full transition-all duration-300 hover:-translate-y-2"
                style={{ background: '#0c1220' }}>
                <div className="text-7xl font-extrabold mb-3 leading-none select-none transition-all duration-500 group-hover:opacity-10"
                  style={{ color: `${color}18`, fontVariantNumeric: 'tabular-nums' }}>
                  {num}
                </div>
                <div className="relative w-11 h-11 flex items-center justify-center mb-4">
                  <div className="absolute inset-0 rounded-xl transition-all duration-300 group-hover:scale-110"
                    style={{ background: `${color}18` }} />
                  <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-glow-pulse"
                    style={{ border: `1px solid ${color}50` }} />
                  <Icon className="relative w-5 h-5 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6"
                    style={{ color }} />
                </div>
                <h3 className="font-bold text-white text-base sm:text-lg mb-2">{title}</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{desc}</p>
                <div className="absolute -bottom-px left-4 right-4 h-px opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: `linear-gradient(90deg,transparent,${color},transparent)` }} />
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>


      {/* ══════════════════════════════════════════════
          SOCIAL PROOF — numbers
      ══════════════════════════════════════════════ */}
      <section className="py-14 sm:py-24"
        style={{ background: 'rgba(124,58,237,0.04)', borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <ScrollReveal className="text-center mb-10 sm:mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-purple-400 mb-4"
              style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
              <Users className="w-3.5 h-3.5" />
              By the numbers
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-5xl font-extrabold text-white mb-4">
              Trusted by 4,000+ job seekers<br className="hidden sm:block" />
              <span className="gradient-text"> across India</span>
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              From Bengaluru startups to TCS / Infosys to IIM campus placements.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-3 gap-4 sm:gap-10 mb-12">
            {([
              { value: 7000, prefix: '',  suffix: '+',    label: 'Resumes optimized',   sub: 'by 4,000+ job seekers',          delay: 0   },
              { value: 57,   prefix: '+', suffix: ' pts', label: 'Avg. ATS score lift', sub: 'per optimization session',       delay: 200 },
              { value: 30,   prefix: '',  suffix: 's',   label: 'Time to results',      sub: 'from paste to optimized resume', delay: 400 },
            ] as const).map(({ value, prefix, suffix, label, sub, delay }) => (
              <ScrollReveal key={label} delay={delay} className="text-center">
                <div className="text-3xl sm:text-5xl font-extrabold gradient-text mb-2 tabular-nums">
                  <AnimatedCounter value={value} prefix={prefix} suffix={suffix} />
                </div>
                <div className="font-semibold text-white text-sm sm:text-base mb-1">{label}</div>
                <div className="text-xs text-slate-600 hidden sm:block">{sub}</div>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal delay={300}>
            <div className="flex flex-wrap justify-center gap-2">
              {['IIT · NIT · BITS Grads', 'TCS · Infosys · Wipro', 'IIM · ISB MBAs',
                'Freshers · Campus Drives', 'IT → Product Switch', 'Fintech · Startup Roles'].map((tag, i) => (
                <span key={tag}
                  className="text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full transition-all duration-300 hover:-translate-y-0.5 hover:text-slate-200 cursor-default"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', transitionDelay: `${i * 40}ms` }}>
                  {tag}
                </span>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>


      {/* ══════════════════════════════════════════════
          TESTIMONIALS — marquee
      ══════════════════════════════════════════════ */}
      <section className="py-14 sm:py-20">
        <ScrollReveal className="text-center mb-8 sm:mb-10 px-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-purple-400 mb-4"
            style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
            <MessageSquare className="w-3.5 h-3.5" />
            Voices from the trenches
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-5xl font-extrabold text-white mb-3">
            Real people.<br className="hidden sm:block" />
            <span className="gradient-text">Real callbacks.</span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
            Every word below is from someone who pasted, clicked, downloaded — and got hired.
          </p>
        </ScrollReveal>
        <TestimonialMarquee />
      </section>


      {/* ══════════════════════════════════════════════
          FEATURES
      ══════════════════════════════════════════════ */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-24">
        <ScrollReveal className="text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-purple-400 mb-4"
            style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
            Features
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-5xl font-extrabold text-white mb-4">
            Everything you need<br className="hidden sm:block" />
            <span className="gradient-text"> to get hired faster.</span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">Not just keyword stuffing — real, intelligent resume improvement.</p>
        </ScrollReveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {([
            { icon: Target,      title: 'ATS Keyword Matching',  color: '#a78bfa', desc: 'We extract role-critical keywords and weave them naturally into your resume so ATS filters stop rejecting you.',               extra: ['React', 'Project Mgmt', 'REST API', 'Agile'] as const },
            { icon: TrendingUp,  title: 'Impactful Bullet Points',color: '#60a5fa', desc: 'Every weak bullet gets rewritten with action verbs, quantified results, and clear impact. No more "helped with tasks".',     extra: null },
            { icon: CheckCircle, title: 'Real ATS Score',        color: '#34d399', desc: 'Genuine before/after score — never inflated. See exactly what ATS systems see when they scan your resume.',                  extra: null },
            { icon: Download,    title: 'PDF & DOCX Export',     color: '#fbbf24', desc: 'Professionally typeset PDF or editable Word file. Ready to send to any recruiter, ATS, or email.',                           extra: null },
            { icon: FileText,    title: 'Smart Page Length',     color: '#f472b6', desc: '1 page for early career, 2 pages for senior roles — automatically, based on experience and the role you\'re targeting.',     extra: null },
            { icon: Zap,         title: 'Free to Preview',       color: '#4ade80', desc: 'Run unlimited resume improvements and see your full score. Pay only when you download. No credit card required.',            extra: null },
          ] as const).map(({ icon: Icon, title, color, desc, extra }, i) => (
            <ScrollReveal key={title} delay={i * 70} direction="up">
              <div className="group gradient-border rounded-2xl p-5 sm:p-6 h-full transition-all duration-300 hover:-translate-y-2"
                style={{ background: '#0c1220' }}>
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6"
                  style={{ background: `${color}18` }}>
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color }} />
                </div>
                <h3 className="font-bold text-white mb-2 text-sm sm:text-base">{title}</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-3">{desc}</p>
                {extra && (
                  <div className="flex flex-wrap gap-1.5">
                    {extra.map(kw => (
                      <span key={kw} className="text-xs px-2 py-0.5 rounded-md"
                        style={{ background: `${color}18`, color }}>
                        {kw}
                      </span>
                    ))}
                    <span className="text-xs px-2 py-0.5 rounded-md text-slate-600"
                      style={{ background: 'rgba(255,255,255,0.04)' }}>+ yours</span>
                  </div>
                )}
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>


      {/* ══════════════════════════════════════════════
          CTA — final
      ══════════════════════════════════════════════ */}
      <ScrollReveal>
        <section className="py-20 sm:py-32 relative overflow-hidden">
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.18), rgba(59,130,246,0.12))' }} />
          <div className="absolute inset-0"
            style={{ background: 'radial-gradient(ellipse at center, rgba(124,58,237,0.25) 0%, transparent 70%)' }} />

          {/* Decorative dots */}
          {['top-8 left-8', 'top-8 right-8', 'bottom-8 left-8', 'bottom-8 right-8'].map((pos, i) => (
            <div key={pos} className={`absolute ${pos} w-2 h-2 rounded-full animate-bounce-soft`}
              style={{ background: i % 2 ? '#3b82f6' : '#7c3aed', opacity: 0.6, animationDelay: `${i * 0.5}s` }} />
          ))}

          <div className="relative max-w-3xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-purple-300 mb-6"
              style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)' }}>
              <Star className="w-3.5 h-3.5 text-yellow-400" />
              Trusted by 4,000+ Indian job seekers
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-6xl font-extrabold text-white mb-5 leading-tight">
              Your next interview<br />is one click away.
            </h2>
            <p className="text-slate-400 mb-10 text-sm sm:text-lg max-w-xl mx-auto leading-relaxed">
              Paste your resume. Paste the job. Let the AI do what takes hours in 30 seconds.
              Then apply — with real confidence.
            </p>
            <Link href="/analyze"
              className="shimmer-btn animate-glow-pulse inline-flex items-center gap-3 text-white font-bold px-8 sm:px-12 py-4 sm:py-5 rounded-xl text-base sm:text-xl transition-all hover:scale-[1.04] hover:brightness-110 active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}>
              Improve My Resume — Free
              <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </Link>
            <div className="flex items-center justify-center flex-wrap gap-4 sm:gap-8 mt-8 text-xs sm:text-sm text-slate-500">
              {['No credit card', 'Free to preview', 'Results in 30s', 'Cancel anytime'].map(t => (
                <div key={t} className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  {t}
                </div>
              ))}
            </div>
          </div>
        </section>
      </ScrollReveal>


      {/* ══════════════════════════════════════════════
          FAQ
      ══════════════════════════════════════════════ */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <ScrollReveal>
          <h2 className="text-xl sm:text-2xl font-bold text-white text-center mb-8 sm:mb-10">Common questions</h2>
        </ScrollReveal>
        <LandingFAQ />
      </section>


      {/* ══════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════ */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} className="py-10 sm:py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between mb-6 sm:mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center font-extrabold text-white text-sm animate-glow-pulse"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#3b82f6)' }}>H</div>
              <span className="font-bold text-white text-base sm:text-lg">
                Hire<span className="gradient-text">Win</span>
              </span>
            </div>
            <div className="flex flex-wrap justify-center gap-x-5 sm:gap-x-8 gap-y-2 text-xs sm:text-sm text-slate-500">
              {[
                { href: '/analyze', label: 'ATS Checker' },
                { href: '/analyze', label: 'Resume Optimizer' },
                { href: '/pricing', label: 'Pricing' },
                { href: '#',        label: 'Privacy' },
                { href: '#',        label: 'Terms' },
                { href: '#',        label: 'Refund' },
              ].map(({ href, label }) => (
                <Link key={label} href={href} className="hover:text-slate-300 transition-colors">{label}</Link>
              ))}
            </div>
          </div>
          <div className="text-center text-xs text-slate-700 pt-6 sm:pt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            © 2026 HireWin · Made for Indian job seekers · Powered by Razorpay
          </div>
        </div>
      </footer>
    </div>
  );
}
