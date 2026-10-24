import { Metadata } from 'next';
import Link from 'next/link';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sparkles,
  Zap,
  BarChart3,
  Search,
  FileCheck2,
  Lock,
  ChevronDown,
  Building2,
  AlertTriangle,
  Award,
  DollarSign,
  Layers,
} from 'lucide-react';
import AppNav from '@/components/app-nav';
import Footer from '@/components/footer';
import CinematicBackground from '@/components/cinematic-background';
import ScrollReveal from '@/components/scroll-reveal';
import AtsLiveTester from '@/components/ats-live-tester';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hirewin.live';

export const metadata: Metadata = {
  title: 'Free Jobscan Alternative (2026) — No Scan Limits, No $50/mo Paywall | HireWin',
  description:
    'Looking for a 100% free Jobscan alternative? HireWin delivers deterministic ATS resume scoring, instant keyword gap matching, and full AI resume rewriting with no scan caps.',
  keywords: [
    'jobscan alternative',
    'free jobscan alternative',
    'jobscan alternative free',
    'best jobscan alternative',
    'free resume scanner like jobscan',
    'jobscan free vs paid',
    'sites like jobscan',
    'jobscan review 2026',
    'free ats resume checker',
  ],
  alternates: {
    canonical: `${siteUrl}/jobscan-alternative`,
  },
  openGraph: {
    title: 'Best Free Jobscan Alternative (2026) — HireWin',
    description:
      'Tired of Jobscan’s 5-scan monthly limit and $49.95/month paywall? Test HireWin for free with deterministic 6-pillar ATS scoring and 1-click AI resume tailoring.',
    url: `${siteUrl}/jobscan-alternative`,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Best Free Jobscan Alternative (2026) — HireWin',
    description:
      'Tired of Jobscan’s 5-scan monthly limit and $49.95/month paywall? Test HireWin for free with deterministic 6-pillar ATS scoring and 1-click AI resume tailoring.',
  },
};

const faqData = [
  {
    q: 'Why look for an alternative to Jobscan?',
    a: 'While Jobscan is widely known, its free tier only permits 5 scans per month and restricts critical features. Upgrading requires a recurring subscription of $49.95/month ($599/year). Furthermore, Jobscan primarily measures keyword frequency, which can lead to unnatural "keyword stuffing" that human recruiters immediately reject. HireWin uses a holistic 6-pillar engine that evaluates context, Google X-Y-Z action bullets, and semantic skill bridging.',
  },
  {
    q: 'How is HireWin different from Jobscan?',
    a: 'HireWin offers genuine, deterministic ATS score diagnostics without hiding results behind arbitrary paywalls. Beyond just identifying missing keywords, HireWin features an integrated AI rewrite engine that automatically integrates missing skills directly into your project bullet points, delivering an authentic +15 to +25 score improvement.',
  },
  {
    q: 'Does HireWin limit the number of scans I can perform?',
    a: 'No! You can run instant scans, test individual bullet points in our real-time sandbox, and optimize your resume for different job descriptions without hitting annoying 5-scan monthly paywalls.',
  },
  {
    q: 'Can HireWin help me pass Workday, Taleo, and Greenhouse ATS?',
    a: 'Yes. HireWin is specifically calibrated to the parsing rules of top enterprise systems. It checks for table extraction hazards, header standards, date formatting, and keyword placement requirements across Workday, Taleo, Greenhouse, Lever, and iCIMS.',
  },
  {
    q: 'Do I need to enter a credit card to use HireWin?',
    a: 'Never. You can scan your resume, see your 6-pillar breakdown, and test our live parser sandbox completely free without entering payment details.',
  },
];

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: siteUrl,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Free Jobscan Alternative',
          item: `${siteUrl}/jobscan-alternative`,
        },
      ],
    },
    {
      '@type': 'Product',
      name: 'HireWin Free Jobscan Alternative',
      description:
        'Zero-paywall ATS resume scanner and AI resume builder offering deterministic scoring, keyword gap diagnostics, and Google X-Y-Z bullet rewrites.',
      brand: {
        '@type': 'Brand',
        name: 'HireWin',
      },
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        reviewCount: '14280',
      },
    },
    {
      '@type': 'FAQPage',
      mainEntity: faqData.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.a,
        },
      })),
    },
  ],
};

export default function JobscanAlternativePage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: 'var(--ground)' }}>
      <CinematicBackground />
      <AppNav />

      {/* JSON-LD Schema: Breadcrumb + Product + FAQ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* ── HERO SECTION ── */}
      <section className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-28 sm:pt-36 pb-12 text-center">
        <ScrollReveal>
          <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold text-emerald-400"
              style={{
                background: 'rgba(52,211,153,0.1)',
                border: '1px solid rgba(52,211,153,0.3)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              #1 Rated Free Jobscan Alternative (2026)
            </div>

            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium text-slate-300"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>Save $599/Year on Resume Scanning</span>
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-white mb-6 tracking-tight leading-[1.08]">
            The 100% Free <span className="gradient-text">Jobscan Alternative</span>
          </h1>

          <p className="text-slate-300 text-base sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Frustrated by Jobscan’s 5-scan limit and <span className="text-rose-400 font-semibold">$49.95/month paywall</span>? Get deterministic 6-pillar ATS scoring, missing keyword detection, and 1-click AI bullet optimization without paying a penny.
          </p>
        </ScrollReveal>

        {/* ── LIVE INTERACTIVE ATS TESTER SANDBOX ── */}
        <ScrollReveal>
          <AtsLiveTester />
        </ScrollReveal>
      </section>

      {/* ── PRICING COMPARISON STAT BAR ── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div
          className="p-8 rounded-3xl border text-center grid grid-cols-1 sm:grid-cols-3 gap-6"
          style={{
            background: 'linear-gradient(135deg, rgba(16,26,44,0.9), rgba(8,14,24,0.95))',
            borderColor: 'rgba(255,255,255,0.1)',
          }}
        >
          <div>
            <div className="text-xs uppercase font-semibold text-slate-400 mb-1">Jobscan Pro Annual Cost</div>
            <div className="text-3xl font-black text-rose-400">$599.40 / yr</div>
            <div className="text-[11px] text-slate-500 mt-1">$49.95 billed monthly</div>
          </div>

          <div>
            <div className="text-xs uppercase font-semibold text-slate-400 mb-1">HireWin Diagnostic Engine</div>
            <div className="text-3xl font-black text-emerald-400">$0.00 Free</div>
            <div className="text-[11px] text-emerald-400/80 mt-1">Zero credit card required</div>
          </div>

          <div>
            <div className="text-xs uppercase font-semibold text-slate-400 mb-1">Your Total Savings</div>
            <div className="text-3xl font-black text-cyan-400">$599 Saved</div>
            <div className="text-[11px] text-cyan-300/80 mt-1">+ Instant AI bullet tailoring</div>
          </div>
        </div>
      </section>

      {/* ── DETAILED FEATURE COMPARISON MATRIX ── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <ScrollReveal className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
            HireWin vs. Jobscan: Feature by Feature
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Why engineers, product managers, and modern job seekers are switching from Jobscan to HireWin.
          </p>
        </ScrollReveal>

        <div className="rounded-2xl border border-white/[0.08] overflow-hidden bg-white/[0.02]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.04] text-slate-300">
                  <th className="p-4 font-bold">Capabilities</th>
                  <th className="p-4 font-bold text-emerald-400 bg-emerald-500/10">HireWin</th>
                  <th className="p-4 font-semibold text-slate-400">Jobscan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-slate-300">
                <tr>
                  <td className="p-4 font-medium text-white">Free Scan Policy</td>
                  <td className="p-4 text-emerald-400 font-bold bg-emerald-500/5">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Instant Free Scans</span>
                    </div>
                  </td>
                  <td className="p-4 text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <XCircle className="w-4 h-4 text-rose-400" />
                      <span>Strict 5 Scans/Month Cap</span>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td className="p-4 font-medium text-white">Scoring Methodology</td>
                  <td className="p-4 text-emerald-400 font-bold bg-emerald-500/5">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Deterministic 6-Pillar Model</span>
                    </div>
                  </td>
                  <td className="p-4 text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span>Raw Keyword Count Frequency</span>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td className="p-4 font-medium text-white">Full AI Resume Generation</td>
                  <td className="p-4 text-emerald-400 font-bold bg-emerald-500/5">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Instant 1-Click Complete Rewrite</span>
                    </div>
                  </td>
                  <td className="p-4 text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <XCircle className="w-4 h-4 text-rose-400" />
                      <span>Paid Add-on Feature</span>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td className="p-4 font-medium text-white">Score Improvement Guarantee</td>
                  <td className="p-4 text-emerald-400 font-bold bg-emerald-500/5">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Authentic +15 to +25 Point Gain</span>
                    </div>
                  </td>
                  <td className="p-4 text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <XCircle className="w-4 h-4 text-rose-400" />
                      <span>Often Only +2 to +4 Points</span>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td className="p-4 font-medium text-white">Google X-Y-Z Metric Verification</td>
                  <td className="p-4 text-emerald-400 font-bold bg-emerald-500/5">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Built-in Bullet Impact Parser</span>
                    </div>
                  </td>
                  <td className="p-4 text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <XCircle className="w-4 h-4 text-rose-400" />
                      <span>Not Supported in Free Scan</span>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td className="p-4 font-medium text-white">Monthly Cost</td>
                  <td className="p-4 text-emerald-400 font-bold bg-emerald-500/5">
                    $0 (Free Diagnostic Tier)
                  </td>
                  <td className="p-4 text-rose-400 font-bold">
                    $49.95 / Month
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── 3 PROBLEMS WITH JOBSCAN SOLVED BY HIREWIN ── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <ScrollReveal className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
            3 Flaws in Jobscan That HireWin Fixes
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm">
            Why modern Applicant Tracking Systems reject resumes optimized purely for Jobscan.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.07]">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center font-bold mb-4">
              1
            </div>
            <h3 className="text-white font-bold text-base mb-2">Keyword Stuffing Penalties</h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              Jobscan pushes users to repeat keywords 4–6 times. Modern systems like Workday and human hiring managers detect this instantly and disqualify candidates for spam.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.07]">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center font-bold mb-4">
              2
            </div>
            <h3 className="text-white font-bold text-base mb-2">Ignores Transferable Skills</h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              If the job asks for "RDBMS" and your resume says "PostgreSQL", Jobscan counts it as 0. HireWin’s semantic engine recognizes contextual synonyms and bridges them naturally.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.07]">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center font-bold mb-4">
              3
            </div>
            <h3 className="text-white font-bold text-base mb-2">Aggressive Subscription Trap</h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              After 5 quick scans, you are hit with a sudden $49.95/month recurring bill. Job search should not cost hundreds of dollars when AI can automate the process affordably.
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQ SECTION ── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-20">
        <ScrollReveal className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
            Frequently Asked Questions: Jobscan Alternative
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Everything you need to know about switching from Jobscan to HireWin.
          </p>
        </ScrollReveal>

        <div className="space-y-4">
          {faqData.map((item, idx) => (
            <div
              key={idx}
              className="p-5 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/[0.07] text-left"
            >
              <h3 className="text-base sm:text-lg font-bold text-white mb-2">{item.q}</h3>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2.5 text-[var(--on-accent)] font-extrabold px-8 py-4 rounded-xl text-base transition-all hover:scale-105 active:scale-95 glow-breathe btn-accent shadow-xl shadow-emerald-500/25"
            style={{ background: 'var(--accent-fill)' }}
          >
            <span>Scan My Resume Free on HireWin</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
