import Link from 'next/link';
import { CheckCircle, Zap, Target, TrendingUp, FileText, Download, ArrowRight } from 'lucide-react';
import AppNav from '@/components/app-nav';

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: '#080d1a' }}>
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ contain: 'strict' }} aria-hidden="true">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(ellipse, rgba(124,58,237,0.6) 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 -right-40 w-[600px] h-[600px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(ellipse, rgba(59,130,246,0.8) 0%, transparent 70%)' }} />
      </div>

      <AppNav />

      {/* Hero */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-20 text-center">
        <h1 className="text-5xl sm:text-7xl font-extrabold text-white tracking-tight mb-6 leading-[1.1]">
          Improve Your Resume{' '}
          <span className="gradient-text">for Any Job</span>
        </h1>
        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Paste your resume and the job you want. We improve it to match — automatically.
          Get 2 free resumes per month.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/analyze"
            className="flex items-center gap-2 text-white font-bold px-8 py-4 rounded-xl text-lg transition-all hover:opacity-90 glow-purple"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
          >
            Improve My Resume — free
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/pricing"
            className="flex items-center gap-2 text-slate-300 font-semibold px-8 py-4 rounded-xl text-lg border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all"
          >
            See pricing
          </Link>
        </div>
        <p className="text-xs text-slate-500 mt-5">No account required · 2 free analyses/month</p>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto">
          {[
            { value: '20s', label: 'Avg. analysis time' },
            { value: '5×', label: 'Company types' },
            { value: '100%', label: 'AI-powered' },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="text-3xl font-extrabold gradient-text mb-1">{value}</div>
              <div className="text-xs text-slate-500">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="text-2xl font-bold text-white text-center mb-10">
          Everything you need to <span className="gradient-text">land the role</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            {
              icon: Target,
              title: 'ATS Keyword Analysis',
              desc: 'See your score against the job description before you apply. Know exactly what keywords are missing.',
            },
            {
              icon: Zap,
              title: 'Smart Bullet Rewrites',
              desc: 'Startup? FAANG? Enterprise? Claude reads the culture and rewrites your resume in the right voice.',
            },
            {
              icon: TrendingUp,
              title: 'Before / After Scoring',
              desc: 'See exactly what changed and how your score improved — instantly.',
            },
            {
              icon: FileText,
              title: 'Skill Gap Analysis',
              desc: 'Ordered by importance: what you need to close before the interview.',
            },
            {
              icon: Download,
              title: 'PDF + DOCX Download',
              desc: 'Download your optimized resume in a clean, ATS-safe format ready to send.',
            },
            {
              icon: CheckCircle,
              title: 'Version History',
              desc: 'Track your 78% for Google vs 91% for Stripe. Compare across applications.',
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="gradient-border rounded-2xl p-6 hover:glow-sm transition-all"
              style={{ background: '#0f1629' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(124,58,237,0.15)' }}>
                <Icon className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 text-center">
        <h2 className="text-3xl font-bold text-white mb-3">Simple, honest pricing</h2>
        <p className="text-slate-400 mb-10">Start free. Pay only when you want to download your resume.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto mb-8">
          {[
            { plan: 'Free', price: '₹0', desc: '2 improvements/mo' },
            { plan: 'Starter', price: '₹49', desc: 'one-time + downloads' },
            { plan: 'Pro', price: '₹166/mo', desc: '20 improvements', highlight: true },
            { plan: 'Power', price: '₹332/mo', desc: '80 improvements' },
          ].map(({ plan, price, desc, highlight }) => (
            <div key={plan}
              className={`p-4 rounded-xl text-left ${highlight ? 'glow-sm' : ''}`}
              style={{
                background: highlight ? 'rgba(124,58,237,0.15)' : '#0f1629',
                border: highlight ? '1px solid rgba(124,58,237,0.4)' : '1px solid rgba(255,255,255,0.06)',
              }}>
              <div className="font-semibold text-slate-300 text-sm mb-1">{plan}</div>
              <div className="text-xl font-bold gradient-text">{price}</div>
              <div className="text-xs text-slate-500 mt-1">{desc}</div>
            </div>
          ))}
        </div>
        <Link href="/pricing" className="text-purple-400 font-medium hover:text-purple-300 transition-colors">
          View full pricing →
        </Link>
      </section>

      {/* CTA */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(59,130,246,0.15))' }} />
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-extrabold text-white mb-4">
            Your next job starts with the right resume
          </h2>
          <p className="text-slate-400 mb-8 text-lg">Free to try. Results in ~20 seconds.</p>
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 text-white font-bold px-10 py-4 rounded-xl text-lg transition-all hover:opacity-90 glow-purple"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
          >
            Get started free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-bold text-white">Hire<span className="gradient-text">Win</span></span>
          <div className="flex gap-6 text-sm text-slate-500">
            <Link href="/pricing" className="hover:text-slate-300 transition-colors">Pricing</Link>
            <Link href="/billing" className="hover:text-slate-300 transition-colors">Billing</Link>
            <Link href="/analyze" className="hover:text-slate-300 transition-colors">Optimize</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
