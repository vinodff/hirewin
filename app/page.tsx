import Link from 'next/link';
import { ArrowRight, CheckCircle, Download, FileText, Zap, Target, TrendingUp } from 'lucide-react';
import AppNav from '@/components/app-nav';
import LandingFAQ from '@/components/landing-faq';

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: '#080d1a' }}>
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(ellipse, rgba(124,58,237,0.6) 0%, transparent 70%)' }}
        />
        <div
          className="absolute top-1/3 -right-40 w-[600px] h-[600px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(ellipse, rgba(59,130,246,0.8) 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-1/4 -left-40 w-[500px] h-[500px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(ellipse, rgba(124,58,237,0.5) 0%, transparent 70%)' }}
        />
      </div>

      <AppNav />

      {/* ── HERO ── */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-8 text-center">
        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-8"
          style={{
            background: 'rgba(124,58,237,0.12)',
            border: '1px solid rgba(124,58,237,0.25)',
            color: '#a78bfa',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          2 Free Resumes · No Credit Card
        </div>

        <h1 className="text-5xl sm:text-7xl font-extrabold text-white tracking-tight mb-6 leading-[1.08]">
          Your resume<br />
          deserves a{' '}
          <span className="gradient-text">fighting chance.</span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          The AI resume builder that checks your ATS score and rewrites your resume
          with exact keyword matching — in under 30 seconds. Free for all job seekers.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
          <Link
            href="/analyze"
            className="flex items-center gap-2 text-white font-bold px-8 py-4 rounded-xl text-lg transition-all hover:opacity-90 hover:scale-105 glow-purple"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
          >
            Improve My Resume
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/analyze"
            className="flex items-center gap-2 text-slate-300 font-semibold px-6 py-4 rounded-xl text-lg hover:text-white transition-colors"
          >
            Try with Sample Resume →
          </Link>
        </div>

        {/* Trust pills */}
        <div className="flex items-center justify-center gap-6 text-sm text-slate-500 mb-16">
          {['No data sold', '~20s results', 'Free to start'].map((t) => (
            <div key={t} className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              {t}
            </div>
          ))}
        </div>

        {/* Before / After preview card */}
        <div
          className="relative max-w-3xl mx-auto rounded-2xl p-1"
          style={{
            background: 'rgba(15,22,41,0.8)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="grid grid-cols-2 gap-1">
            {/* Before */}
            <div className="rounded-xl p-5 text-left" style={{ background: '#0a0f1e' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Before</span>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-md"
                  style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}
                >
                  Score: 34
                </span>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="relative w-12 h-12 shrink-0">
                  <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#ef4444" strokeWidth="3"
                      strokeDasharray="34 66" strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-red-400">34</span>
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Alex Johnson</div>
                  <div className="text-xs text-slate-500">alex@email.com</div>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Experience</div>
                <div className="text-xs text-slate-500">Software Engineer — Acme Corp</div>
                <div className="text-xs text-slate-600">· Worked on backend systems</div>
                <div className="text-xs text-slate-600">· Helped with database tasks</div>
                <div className="text-xs text-slate-600">· Participated in code reviews</div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-2">Skills</div>
                <div className="text-xs text-slate-600">Python, SQL, Some cloud stuff, Git</div>
              </div>
            </div>

            {/* After */}
            <div
              className="rounded-xl p-5 text-left relative overflow-hidden"
              style={{
                background: 'rgba(124,58,237,0.08)',
                border: '1px solid rgba(124,58,237,0.2)',
              }}
            >
              <div
                className="absolute top-0 right-0 w-24 h-24 opacity-10 rounded-bl-full"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
              />
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">After</span>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-md"
                  style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80' }}
                >
                  Score: 91
                </span>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="relative w-12 h-12 shrink-0">
                  <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#4ade80" strokeWidth="3"
                      strokeDasharray="91 9" strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-green-400">91</span>
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Alex Johnson</div>
                  <div className="text-xs text-slate-500">alex@email.com</div>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Experience</div>
                <div className="text-xs text-slate-400">Software Engineer — Acme Corp</div>
                <div className="text-xs text-slate-300">· Architected 3 REST APIs, cut load time 40%</div>
                <div className="text-xs text-slate-300">· Optimised PostgreSQL queries, 60% faster</div>
                <div className="text-xs text-slate-300">· Led 5-engineer reviews, 0 regressions</div>
                <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider mt-2">Skills</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {['Python', 'PostgreSQL', 'AWS', 'Docker', 'CI/CD'].map((s) => (
                    <span
                      key={s}
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(124,58,237,0.2)', color: '#a78bfa' }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-px mt-6 rounded-2xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {[
            { value: '30s', label: 'Avg. processing time' },
            { value: '+57pts', label: 'Avg. score improvement' },
            { value: '2', label: 'Free resumes / month' },
            { value: '100%', label: 'Job-specific tailoring' },
          ].map(({ value, label }) => (
            <div key={label} className="py-5 text-center" style={{ background: '#0a0f1e' }}>
              <div className="text-2xl font-extrabold gradient-text mb-1">{value}</div>
              <div className="text-xs text-slate-500">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── REAL RESULTS ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-12">
          <div className="text-xs font-semibold text-purple-400 uppercase tracking-widest mb-3">Real Results</div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            See the difference instantly
          </h2>
          <p className="text-slate-400">One resume. Two versions. The gap is everything.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Before */}
          <div
            className="rounded-2xl p-6"
            style={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">BEFORE</div>
                <div className="text-sm text-slate-400">Generic resume</div>
              </div>
              <div className="text-4xl font-extrabold text-red-400">34</div>
            </div>
            <div className="space-y-4">
              {[
                { label: 'ATS Score', value: 34, color: '#ef4444' },
                { label: 'Keyword Match', value: 34, color: '#ef4444' },
                { label: 'Impact Bullets', value: 22, color: '#ef4444' },
                { label: 'Format Quality', value: 40, color: '#ef4444' },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400">{label}</span>
                    <span style={{ color }}>{value}%</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${value}%`, background: color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* After */}
          <div
            className="rounded-2xl p-6 relative overflow-hidden"
            style={{
              background: 'rgba(124,58,237,0.08)',
              border: '1px solid rgba(124,58,237,0.25)',
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider">AFTER</div>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(124,58,237,0.2)', color: '#a78bfa' }}
                  >
                    +57 pts
                  </span>
                </div>
                <div className="text-sm text-slate-400">HireWin optimised</div>
              </div>
              <div className="text-4xl font-extrabold text-green-400">91</div>
            </div>
            <div className="space-y-4">
              {[
                { label: 'ATS Score', value: 91, color: '#4ade80' },
                { label: 'Keyword Match', value: 91, color: '#4ade80' },
                { label: 'Impact Bullets', value: 87, color: '#4ade80' },
                { label: 'Format Quality', value: 94, color: '#4ade80' },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400">{label}</span>
                    <span style={{ color }}>{value}%</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${value}%`, background: color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-5">
          Illustrative average improvement · Actual results vary by resume and job
        </p>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-12">
          <div className="text-xs font-semibold text-purple-400 uppercase tracking-widest mb-3">3 steps</div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Dead simple. Effortlessly powerful.
          </h2>
          <p className="text-slate-400">No forms. No questionnaires. Paste and go.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              num: '01',
              icon: FileText,
              title: 'Paste Resume & Job',
              desc: 'Drop in your resume and the job description. Upload a PDF or paste plain text.',
            },
            {
              num: '02',
              icon: Zap,
              title: 'AI Runs the Tailoring',
              desc: 'We find the gaps, rewrite bullets with stronger verbs, inject keywords, and tailor your whole resume.',
            },
            {
              num: '03',
              icon: Download,
              title: 'Download & Apply',
              desc: 'Get your improved resume as PDF or DOCX. See your score jump. Apply with confidence.',
            },
          ].map(({ num, icon: Icon, title, desc }) => (
            <div
              key={num}
              className="relative gradient-border rounded-2xl p-7"
              style={{ background: '#0f1629' }}
            >
              <div
                className="text-6xl font-extrabold mb-4 leading-none select-none"
                style={{ color: 'rgba(124,58,237,0.12)' }}
              >
                {num}
              </div>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(124,58,237,0.15)' }}
              >
                <Icon className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="font-bold text-white text-lg mb-2">{title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SOCIAL PROOF ── */}
      <section
        className="py-20"
        style={{
          background: 'rgba(124,58,237,0.04)',
          borderTop: '1px solid rgba(255,255,255,0.04)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <div className="text-xs font-semibold text-purple-400 uppercase tracking-widest mb-3">By the numbers</div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
              Join 4,000+ job seekers already using HireWin
            </h2>
            <p className="text-slate-400">From engineering students to fintech professionals — worldwide.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-10 mb-12">
            {[
              { value: '7,000+', label: 'Resumes optimized', sub: 'by 4,000+ job seekers' },
              { value: '+57 pts', label: 'Avg. ATS score lift', sub: 'per optimization' },
              { value: '30s', label: 'Time to results', sub: 'from paste to optimized resume' },
            ].map(({ value, label, sub }) => (
              <div key={label} className="text-center">
                <div className="text-4xl font-extrabold gradient-text mb-2">{value}</div>
                <div className="font-semibold text-white mb-1">{label}</div>
                <div className="text-sm text-slate-500">{sub}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {[
              'Engineering students',
              'IT professionals',
              'MBA candidates',
              'Fintech & banking',
              'Freshers & campus placements',
              'Mid-career switchers',
            ].map((tag) => (
              <span
                key={tag}
                className="text-sm px-4 py-2 rounded-full"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#94a3b8',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-12">
          <div className="text-xs font-semibold text-purple-400 uppercase tracking-widest mb-3">Features</div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Everything you need to get hired
          </h2>
          <p className="text-slate-400">Not just keyword stuffing — real, intelligent resume improvement.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* ATS Keyword Matching */}
          <div className="gradient-border rounded-2xl p-6 md:col-span-2 lg:col-span-1" style={{ background: '#0f1629' }}>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(124,58,237,0.15)' }}
            >
              <Target className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="font-bold text-white mb-2">ATS Keyword Matching</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              We extract role-critical keywords from the job description and weave them naturally
              into your resume — so ATS filters stop rejecting you before a human ever reads your application.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {['React', 'Project Management', 'REST APIs', 'Agile', 'CI/CD'].map((kw) => (
                <span
                  key={kw}
                  className="text-xs px-2 py-1 rounded-md"
                  style={{ background: 'rgba(124,58,237,0.15)', color: '#a78bfa' }}
                >
                  {kw}
                </span>
              ))}
              <span
                className="text-xs px-2 py-1 rounded-md text-slate-500"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              >
                + your keywords
              </span>
            </div>
          </div>

          {/* Impactful Bullets */}
          <div className="gradient-border rounded-2xl p-6" style={{ background: '#0f1629' }}>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(124,58,237,0.15)' }}
            >
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="font-bold text-white mb-2">Impactful Bullets</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              Every weak bullet is rewritten with stronger action verbs, quantified results,
              and clearer impact language.
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-xs p-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.06)' }}>
                <span className="text-red-400 shrink-0">✗</span>
                <span className="text-slate-500 line-through">Worked on backend features</span>
              </div>
              <div className="flex items-start gap-2 text-xs p-2 rounded-lg" style={{ background: 'rgba(34,197,94,0.06)' }}>
                <span className="text-green-400 shrink-0">✓</span>
                <span className="text-slate-300">Delivered 3 REST APIs reducing load time by 40%</span>
              </div>
            </div>
          </div>

          {/* Genuine ATS Score */}
          <div className="gradient-border rounded-2xl p-6" style={{ background: '#0f1629' }}>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(124,58,237,0.15)' }}
            >
              <CheckCircle className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="font-bold text-white mb-2">Genuine ATS Score</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Real before/after score — no fake improvements, ever.
            </p>
          </div>

          {/* PDF & DOCX */}
          <div className="gradient-border rounded-2xl p-6" style={{ background: '#0f1629' }}>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(124,58,237,0.15)' }}
            >
              <Download className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="font-bold text-white mb-2">PDF & DOCX Export</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Professionally typeset PDF or editable Word file.
            </p>
          </div>

          {/* Smart Page Length */}
          <div className="gradient-border rounded-2xl p-6" style={{ background: '#0f1629' }}>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(124,58,237,0.15)' }}
            >
              <FileText className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="font-bold text-white mb-2">Smart Page Length</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              1 page for early career, 2 pages for senior roles.
            </p>
          </div>

          {/* Free to start */}
          <div className="gradient-border rounded-2xl p-6" style={{ background: '#0f1629' }}>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(34,197,94,0.12)' }}
            >
              <Zap className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="font-bold text-white mb-2">Free to start</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              2 full optimizations every month, completely free. No credit card required.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(59,130,246,0.1))' }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at center, rgba(124,58,237,0.2) 0%, transparent 70%)' }}
        />
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-4">
            Ready to land more interviews?
          </h2>
          <p className="text-slate-400 mb-8 text-lg max-w-xl mx-auto">
            Join 4,000+ job seekers already using HireWin to get past ATS filters and get noticed by recruiters.
          </p>
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 text-white font-bold px-10 py-4 rounded-xl text-lg transition-all hover:opacity-90 hover:scale-105 glow-purple"
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
          <div className="flex items-center justify-center gap-6 mt-6 text-sm text-slate-500">
            {['No credit card', '2 free/month', 'Results in 30s'].map((t) => (
              <div key={t} className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-20">
        <h2 className="text-2xl font-bold text-white text-center mb-10">Common questions</h2>
        <LandingFAQ />
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/[0.06] py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-8">
            <div className="flex items-center gap-2">
              <span
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-extrabold"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
              >
                H
              </span>
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
