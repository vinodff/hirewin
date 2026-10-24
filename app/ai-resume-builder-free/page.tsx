import { Metadata } from 'next';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  FileText,
  Download,
  Zap,
  ShieldCheck,
  Layout,
  Cpu,
  Lock,
  Star,
  Users,
  Award,
} from 'lucide-react';
import AppNav from '@/components/app-nav';
import Footer from '@/components/footer';
import CinematicBackground from '@/components/cinematic-background';
import ScrollReveal from '@/components/scroll-reveal';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hirewin.live';

export const metadata: Metadata = {
  title: 'Free AI Resume Builder (100% Free, No Paywalls) — HireWin (2026)',
  description:
    'Build an ATS-optimized, professional resume in under 5 minutes with our free AI resume builder. No credit card, no paywall tricks, instant PDF & DOCX download.',
  keywords: [
    'ai resume builder free',
    'free ai resume builder',
    'best free ai resume maker',
    'free ai resume generator',
    'ats friendly ai resume builder free',
    'create resume with ai free',
    'free resume maker without paying',
    'ai resume writer free online',
    'no paywall resume builder',
  ],
  alternates: {
    canonical: `${siteUrl}/ai-resume-builder-free`,
  },
  openGraph: {
    title: 'Free AI Resume Builder (100% Free, No Paywalls) | HireWin',
    description:
      'Generate an interview-winning, ATS-compliant resume with AI for free. Professional templates, automatic bullet writer, instant PDF export.',
    url: `${siteUrl}/ai-resume-builder-free`,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free AI Resume Builder (100% Free, No Paywalls) | HireWin',
    description:
      'Generate an interview-winning, ATS-compliant resume with AI for free. Professional templates, automatic bullet writer, instant PDF export.',
  },
};

const builderFaq = [
  {
    q: 'Is this AI resume builder really 100% free?',
    a: 'Yes! Unlike competitors who let you build a resume only to charge you $20–$40 to download the PDF, HireWin gives you full access to create, format, and download your ATS-compliant resume without hidden fees or forced credit card subscriptions.',
  },
  {
    q: 'How does the AI write my resume bullets?',
    a: 'HireWin uses advanced AI models trained on top 1% executive resumes. When you input your basic experience or title, the AI formulates strong Google X-Y-Z bullets ([Action Verb] + [Context/Technologies] + [Quantified Outcome]) designed to pass automated ATS filters.',
  },
  {
    q: 'Are the resume templates ATS-friendly?',
    a: 'Every template in HireWin is built according to strict ATS parsing standards: single-column and clean dual-column layouts, standard ASCII typography, no corrupting graphics or hidden text boxes, and standard section headers recognized by Workday, Taleo, and Greenhouse.',
  },
  {
    q: 'Can I download my resume in PDF and DOCX format?',
    a: 'Yes, HireWin allows one-click instant downloads in both clean, high-resolution PDF format and editable Word DOCX format.',
  },
  {
    q: 'Do I need to sign up or enter a credit card to try it?',
    a: 'No credit card is required. You can launch the builder immediately, customize your skills and projects, and preview your ATS-optimized resume in real-time.',
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
          name: 'Free AI Resume Builder',
          item: `${siteUrl}/ai-resume-builder-free`,
        },
      ],
    },
    {
      '@type': 'HowTo',
      name: 'How to Build an ATS-Friendly Resume for Free with AI',
      description:
        'Follow this 3-step guide to generate a professional, ATS-compliant resume with AI-enhanced quantifiable bullets and zero paywall download fees.',
      totalTime: 'PT5M',
      estimatedCost: {
        '@type': 'MonetaryAmount',
        currency: 'USD',
        value: '0',
      },
      step: [
        {
          '@type': 'HowToStep',
          position: 1,
          name: 'Select an ATS-Approved Layout',
          text: 'Choose an ATS-compliant template structured for machine parsers (Workday, Greenhouse, Taleo) with standardized section hierarchies.',
          url: `${siteUrl}/builder`,
        },
        {
          '@type': 'HowToStep',
          position: 2,
          name: 'Generate Measurable Google X-Y-Z Experience Bullets',
          text: 'Enter your job title and responsibilities; let AI rewrite them with verified executive action verbs and quantifiable metrics.',
          url: `${siteUrl}/builder`,
        },
        {
          '@type': 'HowToStep',
          position: 3,
          name: 'Export Free High-Resolution PDF or Word DOCX',
          text: 'Download your interview-ready resume with zero watermarks and zero credit card prompts.',
          url: `${siteUrl}/builder`,
        },
      ],
    },
    {
      '@type': 'FAQPage',
      mainEntity: builderFaq.map((item) => ({
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

export default function FreeAiResumeBuilderPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: 'var(--ground)' }}>
      <CinematicBackground />
      <AppNav />

      {/* JSON-LD Rich Snippet for Breadcrumbs + HowTo + FAQ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* ── HERO ── */}
      <section className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-28 sm:pt-36 pb-16 text-center">
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
              100% Free · No Paywall Traps · Instant PDF Download
            </div>

            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium text-slate-300"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Certified ATS-Compliant Layouts</span>
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-white mb-6 tracking-tight leading-[1.08]">
            The <span className="gradient-text">Free AI Resume Builder</span> That Actually Works
          </h1>

          <p className="text-slate-300 text-base sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Stop wasting hours on resume builders that demand your credit card at the final download screen. HireWin builds recruiter-approved, ATS-friendly resumes in minutes with intelligent AI bullet rewriting.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            <Link
              href="/builder"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-[var(--on-accent)] font-extrabold px-8 sm:px-10 py-4 rounded-2xl text-lg transition-all hover:scale-105 active:scale-95 glow-breathe btn-accent shadow-xl shadow-emerald-500/25"
              style={{ background: 'var(--accent-fill)' }}
            >
              <span>Build My Resume Now (Free)</span>
              <ArrowRight className="w-5 h-5" />
            </Link>

            <Link
              href="/analyze"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-white font-semibold px-7 py-4 rounded-2xl text-base border border-white/15 hover:bg-white/10 transition-all"
            >
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>Or Check ATS Score First</span>
            </Link>
          </div>

          {/* Trust Metrics Bar */}
          <div className="flex items-center justify-center flex-wrap gap-8 text-xs sm:text-sm text-slate-400 pt-6 border-t border-white/[0.08]">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="text-white font-bold">4.9 / 5 Rating</span>
              <span>(14,280+ Jobseekers)</span>
            </div>
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-400" />
              <span className="text-white font-bold">Free PDF & Word Export</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span className="text-white font-bold">100% ATS Verified</span>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ── 3-STEP WORKFLOW ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
        <ScrollReveal className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
            Build Your Dream Resume in 3 Simple Steps
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
            From blank page to interview-ready in 5 minutes without writing boilerplate.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-7 rounded-2xl bg-white/[0.02] border border-white/[0.07] relative">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 font-extrabold text-lg mb-4">
              01
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Select an ATS Template</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Choose from minimalist, modern, or technical templates designed specifically to pass automated applicant tracking systems.
            </p>
          </div>

          <div className="p-7 rounded-2xl bg-white/[0.02] border border-white/[0.07] relative">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400 font-extrabold text-lg mb-4">
              02
            </div>
            <h3 className="text-white font-bold text-lg mb-2">AI-Powered Bullet Writing</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Type your job title and responsibilities; our AI turns them into high-impact Google X-Y-Z bullet points with action verbs and metrics.
            </p>
          </div>

          <div className="p-7 rounded-2xl bg-white/[0.02] border border-white/[0.07] relative">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 font-extrabold text-lg mb-4">
              03
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Download Free PDF / DOCX</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Export your resume instantly in clean PDF or Word format with zero watermarks and zero credit card prompts.
            </p>
          </div>
        </div>
      </section>

      {/* ── WHY HIREWIN IS DIFFERENT (NO BAIT-AND-SWITCH) ── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <div
          className="p-8 sm:p-12 rounded-3xl border text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(16,28,48,0.85), rgba(8,16,28,0.95))',
            borderColor: 'rgba(52,211,153,0.3)',
          }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-emerald-400 bg-emerald-500/10 mb-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            Our Anti-Paywall Promise
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white mb-4">
            Tired of &quot;Free&quot; Builders Holding Your Resume Hostage?
          </h2>
          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto mb-8 leading-relaxed">
            Most online resume tools let you design a resume for an hour, only to surprise you with a $29.99 subscription before you can download. HireWin is committed to transparent, fair jobseeker empowerment: you can build and export your resume for free.
          </p>
          <Link
            href="/builder"
            className="inline-flex items-center gap-2 text-[var(--on-accent)] font-extrabold px-8 py-4 rounded-xl text-base transition-all hover:scale-105 active:scale-95 glow-breathe btn-accent shadow-lg shadow-emerald-500/25"
            style={{ background: 'var(--accent-fill)' }}
          >
            <span>Start Building for Free</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── FAQ SECTION ── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-20">
        <ScrollReveal className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
            Free AI Resume Builder: FAQ
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Common questions about building ATS-friendly resumes with HireWin.
          </p>
        </ScrollReveal>

        <div className="space-y-4">
          {builderFaq.map((item, idx) => (
            <div
              key={idx}
              className="p-5 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/[0.07] text-left"
            >
              <h3 className="text-base sm:text-lg font-bold text-white mb-2">{item.q}</h3>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
