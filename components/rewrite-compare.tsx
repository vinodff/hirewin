import Link from 'next/link';
import { ArrowRight, Check, PenLine, X } from 'lucide-react';
import ScrollReveal from '@/components/scroll-reveal';

/**
 * RewriteCompare — (a) before / after rewrite, scroll-revealed cards.
 * Original illustrative copy only. No competitor design, no copied bullet.
 * Before is vague; after is specific, measured, and JD-matched.
 * Every claim is illustrative — the section is labelled as an example.
 */
export default function RewriteCompare() {
  return (
    <section className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
      <ScrollReveal className="text-center mb-10">
        <p className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-purple-300 mb-5" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)' }}>
          <PenLine className="w-3.5 h-3.5" /> Before / after
        </p>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-[1.05] tracking-tight">
          Same experience.<br className="hidden sm:block" /> <span className="gradient-text">A story a recruiter can trust.</span>
        </h2>
        <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
          Vague duties get skipped. Specific, measured work gets interviews.
          HireWin rewrites your bullets against the job description — and checks
          each claim against your original resume.
        </p>
      </ScrollReveal>

      <div className="grid md:grid-cols-2 gap-4 sm:gap-5">
        <ScrollReveal direction="left">
          <div className="rounded-2xl p-6 h-full" style={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2"><X className="w-4 h-4 text-slate-500" /> Before — what recruiters skip</p>
            <p className="text-slate-300 leading-relaxed text-base sm:text-lg">
              “Responsible for website development and maintenance, and worked
              with the team on new features.”
            </p>
            <ul className="mt-5 space-y-2 text-sm text-slate-500">
              <li className="flex gap-2"><X className="w-4 h-4 shrink-0" /> No result, no scale, no proof</li>
              <li className="flex gap-2"><X className="w-4 h-4 shrink-0" /> No keywords from the job description</li>
              <li className="flex gap-2"><X className="w-4 h-4 shrink-0" /> Could describe almost anyone</li>
            </ul>
          </div>
        </ScrollReveal>
        <ScrollReveal direction="right" delay={120}>
          <div className="rounded-2xl p-6 h-full" style={{ background: '#0f1629', border: '1px solid rgba(124,58,237,0.35)' }}>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-300 mb-4 flex items-center gap-2"><Check className="w-4 h-4" /> After — JD-matched, trust-checked</p>
            <p className="text-white leading-relaxed text-base sm:text-lg">
              “Built and shipped 4 customer-facing React features, cutting page
              load time by 38% and lifting sign-ups by 12%.”
            </p>
            <ul className="mt-5 space-y-2 text-sm text-slate-400">
              <li className="flex gap-2"><Check className="w-4 h-4 shrink-0 text-emerald-400" /> Measured outcome, clear scope</li>
              <li className="flex gap-2"><Check className="w-4 h-4 shrink-0 text-emerald-400" /> Keywords the JD actually asks for</li>
              <li className="flex gap-2"><Check className="w-4 h-4 shrink-0 text-emerald-400" /> Checked against your original resume</li>
            </ul>
          </div>
        </ScrollReveal>
      </div>

      <p className="text-center text-xs text-slate-500 mt-6">Illustrative example · Results vary by job and resume.</p>
      <div className="text-center mt-6">
        <Link href="/analyze" className="inline-flex items-center gap-2 text-white font-semibold px-7 py-3.5 rounded-xl text-base transition-colors hover:brightness-110" style={{ background: 'linear-gradient(135deg,#7c3aed,#3b82f6)' }}>
          Rewrite my bullets <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
