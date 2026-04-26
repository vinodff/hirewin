import Link from 'next/link';
import {
  ArrowRight, CheckCircle, Download, FileText,
  Zap, Target, TrendingUp, Shield,
} from 'lucide-react';
import AppNav from '@/components/app-nav';
import LandingFAQ from '@/components/landing-faq';
import ScrollReveal from '@/components/scroll-reveal';
import AnimatedCounter from '@/components/animated-counter';
import AnimatedBar from '@/components/animated-bar';

/* ─────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: '#080d1a' }}>

      {/* ── Dot-grid texture ── */}
      <div
        className="fixed inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(148,163,184,0.1) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* ── Animated gradient orbs ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full opacity-25 animate-float"
          style={{ background: 'radial-gradient(ellipse, rgba(124,58,237,0.65) 0%, transparent 70%)', animationDuration: '9s' }} />
        <div className="absolute top-1/3 -right-40 w-[520px] h-[520px] rounded-full opacity-15 animate-float"
          style={{ background: 'radial-gradient(ellipse, rgba(59,130,246,0.8) 0%, transparent 70%)', animationDelay: '-3s', animationDuration: '11s' }} />
        <div className="absolute bottom-1/3 -left-40 w-[420px] h-[420px] rounded-full opacity-15 animate-float"
          style={{ background: 'radial-gradient(ellipse, rgba(124,58,237,0.5) 0%, transparent 70%)', animationDelay: '-6s', animationDuration: '14s' }} />
        <div className="absolute bottom-10 right-1/3 w-[280px] h-[280px] rounded-full opacity-10 animate-float"
          style={{ background: 'radial-gradient(ellipse, rgba(59,130,246,0.6) 0%, transparent 70%)', animationDelay: '-2s', animationDuration: '8s' }} />
      </div>

      <AppNav />

      {/* ══════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════ */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-8 text-center">

        {/* Floating icon badges — xl screens only */}
        {([
          { icon: Target,     label: 'ATS Score',     color: '#a78bfa', pos: { top: '10%',  left: '1%'  }, delay: '0s',    dur: '5s'  },
          { icon: Zap,        label: 'AI-Powered',    color: '#60a5fa', pos: { top: '22%',  right: '1%' }, delay: '1.5s',  dur: '6s'  },
          { icon: TrendingUp, label: '+57 pts avg',   color: '#34d399', pos: { bottom: '38%', left: '0%' }, delay: '0.8s',  dur: '4.5s' },
          { icon: Shield,     label: 'Private & Safe',color: '#fb923c', pos: { bottom: '24%', right: '1%'}, delay: '2s',    dur: '7s'  },
          { icon: Download,   label: 'PDF & DOCX',    color: '#f472b6', pos: { top: '60%',  right: '0%' }, delay: '0.4s',  dur: '5.5s' },
          { icon: CheckCircle,label: 'Free to start', color: '#4ade80', pos: { top: '45%',  left: '0%'  }, delay: '1.2s',  dur: '6.5s' },
        ] as const).map(({ icon: Icon, label, color, pos, delay, dur }) => (
          <div
            key={label}
            className="absolute hidden xl:flex items-center gap-2 px-3 py-2 rounded-xl animate-float"
            style={{
              ...pos,
              animationDelay: delay,
              animationDuration: dur,
              background: 'rgba(8,13,26,0.85)',
              border: `1px solid ${color}38`,
              boxShadow: `0 4px 24px ${color}18`,
              backdropFilter: 'blur(8px)',
              zIndex: 10,
            }}
          >
            <Icon className="w-4 h-4" style={{ color }} />
            <span className="text-xs font-semibold" style={{ color: '#cbd5e1' }}>{label}</span>
          </div>
        ))}

        {/* Badge with pulse ring */}
        <div
          className="relative inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-sm font-medium mb-8 animate-slide-up-sm"
          style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa' }}
        >
          <span className="relative flex w-2.5 h-2.5">
            <span
              className="absolute inset-0 rounded-full bg-purple-400"
              style={{ animation: 'pulseRing 1.6s cubic-bezier(0,0,0.2,1) infinite' }}
            />
            <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-purple-500" />
          </span>
          2 Free Resumes · No Credit Card
        </div>

        {/* Headline — staggered lines */}
        <h1 className="text-5xl sm:text-7xl font-extrabold text-white tracking-tight mb-6 leading-[1.08]">
          <span className="block animate-slide-up-sm" style={{ animationDelay: '0.08s' }}>Your resume</span>
          <span className="block animate-slide-up-sm" style={{ animationDelay: '0.2s'  }}>deserves a</span>
          <span className="block gradient-text-animated animate-slide-up-sm" style={{ animationDelay: '0.32s' }}>
            fighting chance.
          </span>
        </h1>

        <p
          className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed animate-slide-up-sm"
          style={{ animationDelay: '0.48s' }}
        >
          The AI resume builder that checks your ATS score and rewrites your resume
          with exact keyword matching — in under 30 seconds. Free for all job seekers.
        </p>

        {/* CTAs */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6 animate-slide-up-sm"
          style={{ animationDelay: '0.62s' }}
        >
          <Link
            href="/analyze"
            className="shimmer-btn animate-glow-pulse flex items-center gap-2 text-white font-bold px-8 py-4 rounded-xl text-lg transition-all hover:scale-105 hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
          >
            Improve My Resume
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/analyze"
            className="flex items-center gap-2 text-slate-300 font-semibold px-6 py-4 rounded-xl text-lg border border-white/10 hover:border-purple-500/40 hover:text-white transition-all"
          >
            Try with Sample Resume →
          </Link>
        </div>

        {/* Trust pills */}
        <div
          className="flex items-center justify-center gap-6 text-sm text-slate-500 mb-16 animate-slide-up-sm"
          style={{ animationDelay: '0.76s' }}
        >
          {['No data sold', '~20s results', 'Free to start'].map((t) => (
            <div key={t} className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              {t}
            </div>
          ))}
        </div>

        {/* ── Before / After card ── */}
        <div
          className="relative max-w-3xl mx-auto rounded-2xl p-1 animate-scale-in"
          style={{
            background: 'rgba(15,22,41,0.85)',
            border: '1px solid rgba(255,255,255,0.08)',
            animationDelay: '0.4s',
            boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
          }}
        >
          {/* Glow edge on the after side */}
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, transparent 50%, rgba(124,58,237,0.06) 100%)',
            }}
          />

          <div className="grid grid-cols-2 gap-1">
            {/* Before */}
            <div className="rounded-xl p-5 text-left" style={{ background: '#08111f' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Before</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md"
                  style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>Score: 34</span>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="relative w-12 h-12 shrink-0">
                  <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                    <circle className="score-circle-34" cx="18" cy="18" r="15.9" fill="none"
                      stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-red-400">34</span>
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Arjun Sharma</div>
                  <div className="text-xs text-slate-500">arjun.sharma@gmail.com</div>
                </div>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="font-semibold text-slate-600 uppercase tracking-wider text-[10px]">Experience</div>
                <div className="text-slate-500">Software Engineer — Wipro Technologies</div>
                <div className="text-slate-700">· Worked on Java modules</div>
                <div className="text-slate-700">· Attended daily scrum meetings</div>
                <div className="text-slate-700">· Fixed bugs in existing code</div>
                <div className="font-semibold text-slate-600 uppercase tracking-wider text-[10px] mt-2">Skills</div>
                <div className="text-slate-700">Java, MySQL, HTML, "some scripting"</div>
              </div>
            </div>

            {/* After */}
            <div
              className="rounded-xl p-5 text-left relative overflow-hidden"
              style={{ background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.18)' }}
            >
              <div className="absolute top-0 right-0 w-28 h-28 opacity-10 rounded-bl-full"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }} />
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">After</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md"
                  style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80' }}>Score: 91</span>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="relative w-12 h-12 shrink-0">
                  <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                    <circle className="score-circle-91" cx="18" cy="18" r="15.9" fill="none"
                      stroke="#4ade80" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-green-400">91</span>
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Arjun Sharma</div>
                  <div className="text-xs text-slate-500">arjun.sharma@gmail.com</div>
                </div>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="font-semibold text-purple-400 uppercase tracking-wider text-[10px]">Experience</div>
                <div className="text-slate-400">Software Engineer — Wipro Technologies</div>
                <div className="text-slate-300">· Built 4 Spring Boot microservices, cut latency 42%</div>
                <div className="text-slate-300">· Automated 200+ tests, QA cycle 5 days → 1 day</div>
                <div className="text-slate-300">· Led 8 prod releases on AWS, 99.9% uptime</div>
                <div className="font-semibold text-purple-400 uppercase tracking-wider text-[10px] mt-2">Skills</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {['Java', 'Spring Boot', 'AWS', 'MySQL', 'Docker'].map((s) => (
                    <span key={s} className="px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(124,58,237,0.2)', color: '#a78bfa' }}>{s}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-px mt-6 rounded-2xl overflow-hidden animate-scale-in"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
            animationDelay: '0.85s',
          }}
        >
          {[
            { value: '30s',   label: 'Avg. processing time' },
            { value: '+57pts',label: 'Avg. score improvement' },
            { value: '2',     label: 'Free resumes / month' },
            { value: '100%',  label: 'Job-specific tailoring' },
          ].map(({ value, label }) => (
            <div key={label} className="py-5 text-center group cursor-default transition-all hover:bg-white/[0.02]"
              style={{ background: '#08111f' }}>
              <div className="text-2xl font-extrabold gradient-text mb-1 group-hover:scale-110 transition-transform duration-300">
                {value}
              </div>
              <div className="text-xs text-slate-500">{label}</div>
            </div>
          ))}
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════
          REAL RESULTS
      ══════════════════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
        <ScrollReveal className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-purple-400 mb-4"
            style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
            Real Results
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            See the difference instantly
          </h2>
          <p className="text-slate-400">One resume. Two versions. The gap is everything.</p>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Before card */}
          <ScrollReveal direction="left">
            <div className="rounded-2xl p-7 h-full" style={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between mb-7">
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">BEFORE</div>
                  <div className="text-sm text-slate-400">Generic resume</div>
                </div>
                <div className="text-5xl font-extrabold tabular-nums" style={{ color: '#ef4444' }}>34</div>
              </div>
              <div className="space-y-5">
                {([
                  { label: 'ATS Score',     value: 34,  color: '#ef4444', delay: 0   },
                  { label: 'Keyword Match', value: 34,  color: '#ef4444', delay: 120 },
                  { label: 'Impact Bullets',value: 22,  color: '#ef4444', delay: 240 },
                  { label: 'Format Quality',value: 40,  color: '#ef4444', delay: 360 },
                ] as const).map(({ label, value, color, delay }) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-400">{label}</span>
                      <span style={{ color }}>{value}%</span>
                    </div>
                    <AnimatedBar value={value} color={color} delay={delay} />
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* After card */}
          <ScrollReveal direction="right" delay={100}>
            <div className="rounded-2xl p-7 h-full relative overflow-hidden"
              style={{ background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.25)' }}>
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-10"
                style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />
              <div className="flex items-center justify-between mb-7">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-xs font-semibold text-purple-400 uppercase tracking-widest">AFTER</div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full animate-bounce-soft"
                      style={{ background: 'rgba(124,58,237,0.2)', color: '#a78bfa' }}>+57 pts</span>
                  </div>
                  <div className="text-sm text-slate-400">HireWin optimised</div>
                </div>
                <div className="text-5xl font-extrabold tabular-nums" style={{ color: '#4ade80' }}>91</div>
              </div>
              <div className="space-y-5">
                {([
                  { label: 'ATS Score',     value: 91,  color: '#4ade80', delay: 0   },
                  { label: 'Keyword Match', value: 91,  color: '#4ade80', delay: 120 },
                  { label: 'Impact Bullets',value: 87,  color: '#4ade80', delay: 240 },
                  { label: 'Format Quality',value: 94,  color: '#4ade80', delay: 360 },
                ] as const).map(({ label, value, color, delay }) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-400">{label}</span>
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
          <p className="text-center text-xs text-slate-600 mt-5">
            Illustrative average · Real results from Indian job seekers across IT, MBA & startup roles
          </p>
        </ScrollReveal>
      </section>


      {/* ══════════════════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
        <ScrollReveal className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-purple-400 mb-4"
            style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
            3 steps
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Dead simple. Effortlessly powerful.
          </h2>
          <p className="text-slate-400">No forms. No questionnaires. Paste and go.</p>
        </ScrollReveal>

        <div className="relative grid md:grid-cols-3 gap-6">
          {/* Connector line (desktop) */}
          <div className="hidden md:block absolute top-16 left-[calc(33.33%+12px)] right-[calc(33.33%+12px)] h-px z-0"
            style={{ background: 'linear-gradient(90deg, rgba(124,58,237,0.4), rgba(59,130,246,0.4))' }} />

          {([
            { num: '01', icon: FileText,  title: 'Paste Resume & Job',
              desc: 'Drop in your resume and the job description. Upload a PDF or paste plain text.',   delay: 0   },
            { num: '02', icon: Zap,       title: 'AI Runs the Tailoring',
              desc: 'We find the gaps, rewrite bullets with stronger verbs, inject keywords, and tailor your whole resume.', delay: 130 },
            { num: '03', icon: Download,  title: 'Download & Apply',
              desc: 'Get your improved resume as PDF or DOCX. See your score jump. Apply with confidence.', delay: 260 },
          ] as const).map(({ num, icon: Icon, title, desc, delay }) => (
            <ScrollReveal key={num} delay={delay} direction="up">
              <div
                className="group relative gradient-border rounded-2xl p-7 h-full transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
                style={{ background: '#0f1629' }}
              >
                {/* Number watermark */}
                <div
                  className="text-7xl font-extrabold mb-3 leading-none select-none transition-all duration-500 group-hover:opacity-20"
                  style={{ color: 'rgba(124,58,237,0.13)', fontVariantNumeric: 'tabular-nums' }}
                >
                  {num}
                </div>

                {/* Icon with ring */}
                <div className="relative w-12 h-12 flex items-center justify-center mb-5">
                  <div
                    className="absolute inset-0 rounded-xl transition-all duration-300 group-hover:scale-110"
                    style={{ background: 'rgba(124,58,237,0.15)' }}
                  />
                  <div
                    className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-glow-pulse"
                    style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.4)' }}
                  />
                  <Icon className="relative w-5 h-5 text-purple-400 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6" />
                </div>

                <h3 className="font-bold text-white text-lg mb-2">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════
          SOCIAL PROOF
      ══════════════════════════════════════════════════════ */}
      <section
        className="py-24"
        style={{
          background: 'rgba(124,58,237,0.04)',
          borderTop: '1px solid rgba(255,255,255,0.04)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <ScrollReveal className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-purple-400 mb-4"
              style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
              By the numbers
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
              Trusted by 4,000+ job seekers across India
            </h2>
            <p className="text-slate-400">From Bengaluru startups to TCS/Infosys to IIM campus placements — we've got you.</p>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-10 mb-14">
            {([
              { value: 7000,  prefix: '',  suffix: '+',   label: 'Resumes optimized',  sub: 'by 4,000+ job seekers',          delay: 0   },
              { value: 57,    prefix: '+', suffix: ' pts', label: 'Avg. ATS score lift', sub: 'per optimization',               delay: 200 },
              { value: 30,    prefix: '',  suffix: 's',   label: 'Time to results',     sub: 'from paste to optimized resume',  delay: 400 },
            ] as const).map(({ value, prefix, suffix, label, sub, delay }) => (
              <ScrollReveal key={label} delay={delay} className="text-center">
                <div className="text-5xl font-extrabold gradient-text mb-2 tabular-nums">
                  <AnimatedCounter value={value} prefix={prefix} suffix={suffix} />
                </div>
                <div className="font-semibold text-white mb-1">{label}</div>
                <div className="text-sm text-slate-500">{sub}</div>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal delay={300}>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                'IIT / NIT / BITS Grads', 'TCS · Infosys · Wipro', 'IIM / ISB MBAs',
                'Freshers — Campus Drives', 'IT → Product Switch', 'Fintech & Startup Roles',
              ].map((tag, i) => (
                <span
                  key={tag}
                  className="text-sm px-4 py-2 rounded-full transition-all duration-300 hover:-translate-y-0.5 hover:border-purple-500/40 hover:text-slate-200 cursor-default"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#94a3b8',
                    transitionDelay: `${i * 40}ms`,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════
          FEATURES
      ══════════════════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
        <ScrollReveal className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-purple-400 mb-4"
            style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
            Features
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Everything you need to get hired
          </h2>
          <p className="text-slate-400">Not just keyword stuffing — real, intelligent resume improvement.</p>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* ATS Keyword Matching */}
          <ScrollReveal delay={0} direction="up">
            <div className="group gradient-border rounded-2xl p-6 h-full transition-all duration-300 hover:-translate-y-2 hover:shadow-xl md:col-span-2 lg:col-span-1"
              style={{ background: '#0f1629' }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6"
                style={{ background: 'rgba(124,58,237,0.15)' }}>
                <Target className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="font-bold text-white mb-2">ATS Keyword Matching</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                We extract role-critical keywords and weave them naturally into your resume — so ATS filters stop rejecting you before a human reads it.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {['React', 'Project Management', 'REST APIs', 'Agile', 'CI/CD'].map((kw, i) => (
                  <span
                    key={kw}
                    className="text-xs px-2 py-1 rounded-md transition-all duration-200 hover:scale-105"
                    style={{
                      background: 'rgba(124,58,237,0.15)',
                      color: '#a78bfa',
                      animationDelay: `${i * 80}ms`,
                    }}
                  >
                    {kw}
                  </span>
                ))}
                <span className="text-xs px-2 py-1 rounded-md text-slate-500"
                  style={{ background: 'rgba(255,255,255,0.04)' }}>+ your keywords</span>
              </div>
            </div>
          </ScrollReveal>

          {/* Impactful Bullets */}
          <ScrollReveal delay={80} direction="up">
            <div className="group gradient-border rounded-2xl p-6 h-full transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
              style={{ background: '#0f1629' }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6"
                style={{ background: 'rgba(124,58,237,0.15)' }}>
                <TrendingUp className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="font-bold text-white mb-2">Impactful Bullets</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                Every weak bullet is rewritten with stronger action verbs, quantified results, and clearer impact language.
              </p>
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-xs p-2.5 rounded-lg transition-all"
                  style={{ background: 'rgba(239,68,68,0.07)' }}>
                  <span className="text-red-400 mt-0.5 shrink-0">✗</span>
                  <span className="text-slate-500 line-through">Worked on Java modules in Wipro project</span>
                </div>
                <div className="flex items-start gap-2 text-xs p-2.5 rounded-lg"
                  style={{ background: 'rgba(34,197,94,0.07)' }}>
                  <span className="text-green-400 mt-0.5 shrink-0">✓</span>
                  <span className="text-slate-300">Built 4 Spring Boot microservices, cut API latency 42%</span>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Genuine ATS Score */}
          <ScrollReveal delay={160} direction="up">
            <div className="group gradient-border rounded-2xl p-6 h-full transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
              style={{ background: '#0f1629' }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6"
                style={{ background: 'rgba(124,58,237,0.15)' }}>
                <CheckCircle className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="font-bold text-white mb-2">Genuine ATS Score</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Real before/after score — no fake improvements, ever.
              </p>
            </div>
          </ScrollReveal>

          {/* PDF & DOCX */}
          <ScrollReveal delay={240} direction="up">
            <div className="group gradient-border rounded-2xl p-6 h-full transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
              style={{ background: '#0f1629' }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6"
                style={{ background: 'rgba(124,58,237,0.15)' }}>
                <Download className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="font-bold text-white mb-2">PDF & DOCX Export</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Professionally typeset PDF or editable Word file, ready to send.
              </p>
            </div>
          </ScrollReveal>

          {/* Smart Page Length */}
          <ScrollReveal delay={320} direction="up">
            <div className="group gradient-border rounded-2xl p-6 h-full transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
              style={{ background: '#0f1629' }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6"
                style={{ background: 'rgba(124,58,237,0.15)' }}>
                <FileText className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="font-bold text-white mb-2">Smart Page Length</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                1 page for early career, 2 pages for senior roles. Automatically.
              </p>
            </div>
          </ScrollReveal>

          {/* Free to start */}
          <ScrollReveal delay={400} direction="up">
            <div className="group gradient-border rounded-2xl p-6 h-full transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
              style={{ background: '#0f1629' }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6"
                style={{ background: 'rgba(34,197,94,0.12)' }}>
                <Zap className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="font-bold text-white mb-2">Free to start</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                2 full optimizations every month, no credit card required.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════
          CTA
      ══════════════════════════════════════════════════════ */}
      <ScrollReveal>
        <section className="py-28 relative overflow-hidden">
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.16), rgba(59,130,246,0.1))' }} />
          <div className="absolute inset-0"
            style={{ background: 'radial-gradient(ellipse at center, rgba(124,58,237,0.22) 0%, transparent 70%)' }} />
          {/* Corner glow dots */}
          <div className="absolute top-8 left-8 w-2 h-2 rounded-full bg-purple-500 opacity-60 animate-bounce-soft" />
          <div className="absolute top-8 right-8 w-2 h-2 rounded-full bg-blue-500 opacity-60 animate-bounce-soft" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-8 left-8 w-2 h-2 rounded-full bg-blue-500 opacity-60 animate-bounce-soft" style={{ animationDelay: '0.5s' }} />
          <div className="absolute bottom-8 right-8 w-2 h-2 rounded-full bg-purple-500 opacity-60 animate-bounce-soft" style={{ animationDelay: '1.5s' }} />

          <div className="relative max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-5">
              Ready to land more interviews?
            </h2>
            <p className="text-slate-400 mb-10 text-lg max-w-xl mx-auto">
              Join 4,000+ job seekers across India — from campus freshers to IT veterans — getting past ATS filters and landing better roles.
            </p>
            <Link
              href="/analyze"
              className="shimmer-btn animate-glow-pulse inline-flex items-center gap-2 text-white font-bold px-10 py-4 rounded-xl text-lg transition-all hover:scale-105 hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
            >
              Claim Your 2 Free Resumes
              <ArrowRight className="w-5 h-5" />
            </Link>
            <div className="mt-5">
              <Link href="/pricing" className="text-purple-400 text-sm hover:text-purple-300 transition-colors">
                See pricing →
              </Link>
            </div>
            <div className="flex items-center justify-center gap-6 mt-8 text-sm text-slate-500">
              {['No credit card', '2 free/month', 'Results in 30s'].map((t) => (
                <div key={t} className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                  {t}
                </div>
              ))}
            </div>
          </div>
        </section>
      </ScrollReveal>


      {/* ══════════════════════════════════════════════════════
          FAQ
      ══════════════════════════════════════════════════════ */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-20">
        <ScrollReveal>
          <h2 className="text-2xl font-bold text-white text-center mb-10">Common questions</h2>
        </ScrollReveal>
        <LandingFAQ />
      </section>


      {/* ══════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════ */}
      <footer className="border-t border-white/[0.06] py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-8">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="HireWin Logo" className="w-8 h-8 object-contain animate-glow-pulse" />
              <span className="font-bold text-white text-lg">
                Hire<span className="gradient-text">Win</span>
              </span>
            </div>
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-slate-500">
              <Link href="/analyze" className="hover:text-slate-300 transition-colors">ATS Checker</Link>
              <Link href="/analyze" className="hover:text-slate-300 transition-colors">ATS Resume Checker</Link>
              <Link href="/pricing" className="hover:text-slate-300 transition-colors">Pricing</Link>
              <Link href="#" className="hover:text-slate-300 transition-colors">Privacy</Link>
              <Link href="#" className="hover:text-slate-300 transition-colors">Terms</Link>
              <Link href="#" className="hover:text-slate-300 transition-colors">Refund</Link>
            </div>
          </div>
          <div className="text-center text-xs text-slate-600 border-t border-white/[0.04] pt-8">
            © 2026 HireWin · Powered by Razorpay
          </div>
        </div>
      </footer>
    </div>
  );
}
