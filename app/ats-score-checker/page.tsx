import { Metadata } from 'next';
import Link from 'next/link';
import {
  ShieldCheck,
  CheckCircle2,
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
  Users,
} from 'lucide-react';
import AppNav from '@/components/app-nav';
import Footer from '@/components/footer';
import CinematicBackground from '@/components/cinematic-background';
import ScrollReveal from '@/components/scroll-reveal';
import AtsLiveTester from '@/components/ats-live-tester';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hirewin.live';

export const metadata: Metadata = {
  title: 'Free ATS Score Checker Online — Real ATS Compatibility Test (2026)',
  description:
    'Free online ATS score checker. Scan your resume against real applicant tracking systems (Workday, Taleo, Greenhouse), discover missing keywords, and score 90%+ instantly.',
  keywords: [
    'ats score checker',
    'free ats score checker',
    'ats resume checker',
    'check ats score online',
    'ats resume scanner',
    'ats compliance checker',
    'workday ats checker',
    'resume ats score calculator',
    'free resume scanner for ats',
  ],
  alternates: {
    canonical: `${siteUrl}/ats-score-checker`,
  },
  openGraph: {
    title: 'Free ATS Score Checker Online — Real ATS Compatibility Test | HireWin',
    description:
      'Test your resume against real ATS algorithms in 20 seconds. Get an honest compatibility score, missing keyword breakdown, and instant AI optimization.',
    url: `${siteUrl}/ats-score-checker`,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free ATS Score Checker Online — Real ATS Compatibility Test',
    description:
      'Test your resume against real ATS algorithms in 20 seconds. Get an honest compatibility score, missing keyword breakdown, and instant AI optimization.',
  },
};

const faqData = [
  {
    q: 'What is an ATS score checker?',
    a: 'An ATS score checker is an automated diagnostic tool that analyzes your resume using the exact algorithms and parsing rules used by enterprise Applicant Tracking Systems (like Workday, Taleo, Greenhouse, and Lever). It checks keyword frequency, action verbs, section hierarchy, contact information, and formatting cleanliness to calculate your resume’s probability of passing the automated screening.',
  },
  {
    q: 'How does HireWin calculate the ATS score?',
    a: 'Unlike generic tools that output arbitrary random numbers, HireWin computes an honest, deterministic ATS score based on six critical pillars: 1) Job Description Keyword Match (60%), 2) Action Verbs & Measurable Impact (15%), 3) Section Architecture (10%), 4) Contact Information Completeness (5%), 5) Parsing Hazards & Encoding Cleanliness (5%), and 6) Length & Brevity (5%).',
  },
  {
    q: 'What is a good ATS resume score?',
    a: 'Most corporate ATS systems consider a score of 75% or higher as a "Strong Match" that qualifies for human recruiter review. Top 5% candidates typically achieve an ATS score of 88% to 96% after tailoring their skills and project bullets to the target job description.',
  },
  {
    q: 'Why do other resume checkers only increase scores by 2 to 3 points?',
    a: 'Many tools rely on basic keyword counting without properly bridging your transferable skills into the job description’s exact terminology. HireWin’s intelligence engine translates your real project capabilities (e.g. Next.js, state management, database query optimization) into the target job description’s required keywords, delivering an authentic 15 to 25 point score improvement.',
  },
  {
    q: 'Is this ATS score checker really 100% free?',
    a: 'Yes! You can scan your resume, receive a comprehensive breakdown of matched vs. missing keywords, and get your genuine ATS score for free without entering any credit card.',
  },
  {
    q: 'Which ATS systems does HireWin test against?',
    a: 'HireWin is calibrated against the parsing engines and keyword indexing filters of all major enterprise ATS platforms including Workday, Oracle Taleo, Greenhouse, Lever, iCIMS, BambooHR, and SmartRecruiters.',
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
          name: 'Free ATS Score Checker',
          item: `${siteUrl}/ats-score-checker`,
        },
      ],
    },
    {
      '@type': 'HowTo',
      name: 'How to Check and Optimize Your Resume ATS Score Online for Free',
      description:
        'Step-by-step method to test your resume against enterprise Applicant Tracking Systems and boost keyword match score to 90%+ in 20 seconds.',
      totalTime: 'PT1M',
      estimatedCost: {
        '@type': 'MonetaryAmount',
        currency: 'USD',
        value: '0',
      },
      step: [
        {
          '@type': 'HowToStep',
          position: 1,
          name: 'Input Resume and Target Job Description',
          text: 'Upload your PDF/DOCX resume or paste your text alongside the employer job description into the scanner.',
          url: `${siteUrl}/analyze`,
        },
        {
          '@type': 'HowToStep',
          position: 2,
          name: 'Run Deterministic 6-Pillar Diagnostic',
          text: 'The algorithmic ATS engine checks keyword overlap (60%), action verb impact (15%), section taxonomy (10%), contact data (5%), and format cleanliness (10%).',
          url: `${siteUrl}/analyze`,
        },
        {
          '@type': 'HowToStep',
          position: 3,
          name: 'Review Missing Hard Keywords & Passive Phrasing',
          text: 'Examine exact missing technical skills, tools, and weak bullet points flagged by the parser.',
          url: `${siteUrl}/analyze`,
        },
        {
          '@type': 'HowToStep',
          position: 4,
          name: 'Generate Tailored Resume with 1-Click AI Export',
          text: 'Apply contextual keyword bridges into your existing bullet points to gain an honest +15 to +25 score increase and export clean ATS-ready PDF/DOCX.',
          url: `${siteUrl}/builder`,
        },
      ],
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

export default function AtsScoreCheckerPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: 'var(--ground)' }}>
      <CinematicBackground />
      <AppNav />

      {/* JSON-LD Schema: Breadcrumb + HowTo + FAQ */}
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
              2026 Enterprise ATS Diagnostic Algorithm
            </div>

            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium text-slate-300"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Reviewed by CPRW Certified Recruiters</span>
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-white mb-6 tracking-tight leading-[1.08]">
            Free Online <span className="text-emerald-400 font-extrabold">ATS Score Checker</span>
          </h1>

          <p className="text-slate-300 text-base sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Over 75% of resumes are filtered out before reaching a human recruiter. Scan your resume against real Workday, Taleo & Greenhouse filters, find critical missing keywords, and score <span className="text-emerald-400 font-semibold">90%+</span> in 20 seconds.
          </p>
        </ScrollReveal>

        {/* ── LIVE INTERACTIVE ATS TESTER WIDGET (ON-PAGE UTILITY FOR MAXIMUM ENGAGEMENT) ── */}
        <ScrollReveal>
          <AtsLiveTester />
        </ScrollReveal>
      </section>

      {/* ── ATS SYSTEMS TESTED ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12 border-y border-white/[0.06]">
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400">
            Validated Against 8 Major Enterprise Applicant Tracking Systems
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {['Workday ATS', 'Oracle Taleo', 'Greenhouse', 'Lever', 'iCIMS', 'SmartRecruiters', 'BambooHR', 'SAP SuccessFactors'].map((ats) => (
            <div
              key={ats}
              className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-slate-300 text-xs sm:text-sm font-medium flex items-center justify-center gap-2"
            >
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{ats}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── 6-PILLAR ATS SCORING BREAKDOWN ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
        <ScrollReveal className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            How ATS Algorithms Actually Score Your Resume
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
            Real ATS scanners do not guess. They run algorithmic keyword indexing, structure verification, and impact parsing. Here is exactly how HireWin calculates your score:
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.07] relative overflow-hidden">
            <div className="text-3xl font-mono font-bold tracking-tight text-emerald-400 mb-2">60%</div>
            <h3 className="text-white font-bold text-lg mb-2">Job Description Keyword Match</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Detects core technical tools, programming languages, and domain methodologies required by the employer. Evaluates presence across both Skills and Experience sections.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
            <div className="text-3xl font-mono font-bold tracking-tight text-blue-400 mb-2">15%</div>
            <h3 className="text-white font-bold text-lg mb-2">Action Verbs & Impact Structure</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Verifies that experience bullets open with verified executive action verbs (Architected, Engineered, Formulated) and adhere to the Google X-Y-Z quantifiable metric standard.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
            <div className="text-3xl font-mono font-bold tracking-tight text-sky-400 mb-2">10%</div>
            <h3 className="text-white font-bold text-lg mb-2">Section Architecture</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Checks for standardized section headers that ATS parsers rely on: Professional Summary, Technical Skills, Experience/Projects, and Education.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
            <div className="text-3xl font-mono font-bold tracking-tight text-amber-400 mb-2">5%</div>
            <h3 className="text-white font-bold text-lg mb-2">Contact Completeness</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Verifies RFC-compliant email formatting, phone number presence, and clickable professional links (LinkedIn & GitHub).
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
            <div className="text-3xl font-mono font-bold tracking-tight text-cyan-400 mb-2">5%</div>
            <h3 className="text-white font-bold text-lg mb-2">Encoding & Parse Hygiene</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Screens for non-breaking spaces (nbsp), multi-column tables, text boxes, and special glyphs that crash or mangle ATS document parsers.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
            <div className="text-3xl font-mono font-bold tracking-tight text-rose-400 mb-2">5%</div>
            <h3 className="text-white font-bold text-lg mb-2">Word Count & Density</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Validates optimal length (350–500 words for 1-page freshers, 600–900 words for mid/senior candidates) to avoid ATS density penalties.
            </p>
          </div>
        </div>
      </section>

      {/* ── STEP-BY-STEP HOW-TO GUIDE (MATCHES SCHEMA) ── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <ScrollReveal className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
            How to Check Your ATS Score in 4 Easy Steps
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            From upload to recruiter-ready resume in under 60 seconds.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.07] flex gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-sm">
              1
            </div>
            <div>
              <h3 className="text-white font-bold text-base mb-1">Paste Resume & Job Description</h3>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                Add your resume text or upload your document alongside the exact job listing you want to target.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.07] flex gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-sm">
              2
            </div>
            <div>
              <h3 className="text-white font-bold text-base mb-1">Run 6-Pillar ATS Diagnostic</h3>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                The engine extracts hard skills, action verbs, section taxonomy, and format compliance in real-time.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.07] flex gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-sm">
              3
            </div>
            <div>
              <h3 className="text-white font-bold text-base mb-1">Inspect Missing Keywords</h3>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                See exact high-priority keywords that recruiters are searching for that are currently missing from your resume.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.07] flex gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-sm">
              4
            </div>
            <div>
              <h3 className="text-white font-bold text-base mb-1">Apply 1-Click AI Tailoring</h3>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                Regenerate your bullets with contextual keyword bridges for an authentic +15 to +25 score improvement.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── COMPETITIVE COMPARISON TABLE ── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <ScrollReveal className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
            Why Jobseekers Choose HireWin Over Legacy Checkers
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            See how HireWin compares to traditional resume checkers like Jobscan, Teal, and ResumeWorded.
          </p>
        </ScrollReveal>

        <div className="rounded-2xl border border-white/[0.08] overflow-hidden bg-white/[0.02]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.03] text-slate-300">
                  <th className="p-4 font-bold">Feature</th>
                  <th className="p-4 font-bold text-emerald-400">HireWin</th>
                  <th className="p-4 font-semibold text-slate-400">Jobscan</th>
                  <th className="p-4 font-semibold text-slate-400">ResumeWorded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-slate-300">
                <tr>
                  <td className="p-4 font-medium text-white">ATS Score Accuracy</td>
                  <td className="p-4 text-emerald-400 font-bold">Deterministic 6-Pillar Engine</td>
                  <td className="p-4 text-slate-400">Keyword Count Only</td>
                  <td className="p-4 text-slate-400">Generic Formula</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-white">Full AI Resume Rewrite</td>
                  <td className="p-4 text-emerald-400 font-bold">Included Free in 20s</td>
                  <td className="p-4 text-slate-400">Paid Add-on ($49/mo)</td>
                  <td className="p-4 text-slate-400">Manual Bullet Suggestions</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-white">Score Improvement Delta</td>
                  <td className="p-4 text-emerald-400 font-bold">+15 to +25 Earned Points</td>
                  <td className="p-4 text-slate-400">+2 to +5 Points</td>
                  <td className="p-4 text-slate-400">Static Rating</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-white">Zero Paywall Scan</td>
                  <td className="p-4 text-emerald-400 font-bold">Yes (Instant Preview)</td>
                  <td className="p-4 text-slate-400">Requires Signup & Limits</td>
                  <td className="p-4 text-slate-400">Heavily Paywalled</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── FAQ SECTION (RICH SNIPPETS) ── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-20">
        <ScrollReveal className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
            ATS Score Checker: Frequently Asked Questions
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Everything you need to know about passing applicant tracking systems.
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
            <span>Check My ATS Score Free</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
