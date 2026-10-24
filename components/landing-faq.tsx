'use client';

import { useState } from 'react';
import { ChevronDown, Sparkles, HelpCircle, ShieldCheck, Zap, Lock, CreditCard } from 'lucide-react';

type FAQItem = {
  q: string;
  a: string;
  category: 'all' | 'ats' | 'pricing' | 'privacy';
  icon: typeof Sparkles;
};

const FAQS: FAQItem[] = [
  {
    q: 'How does HireWin guarantee my resume passes ATS algorithms?',
    a: 'HireWin scans against semantic parsing algorithms used by modern applicant tracking systems (Greenhouse, Lever, Workday, Taleo, iCIMS). We score both keyword frequency and semantic contextual alignment, infusing verified hard skills directly into metric-driven bullet points without keyword stuffing.',
    category: 'ats',
    icon: Sparkles,
  },
  {
    q: 'What is the "Trust Score" and why is it so important?',
    a: 'Most AI tools hallucinate metrics (e.g. claiming you led 50 engineers or generated $10M when you didn’t). Recruiters spot this during technical rounds and reject you. HireWin’s Trust Engine cross-checks every bullet against your actual experience, ensuring you can confidently defend every word in the interview.',
    category: 'ats',
    icon: ShieldCheck,
  },
  {
    q: 'Is it really free to start?',
    a: 'Yes — completely free. You get full resume optimizations every month with no credit card required. You can see your ATS score jump, view rewritten bullets, practice voice mock questions, and inspect verified metrics immediately.',
    category: 'pricing',
    icon: Zap,
  },
  {
    q: 'Can I edit the resume after the AI optimizes it?',
    a: 'Absolutely. After AI optimization, you can edit every bullet point, section title, and milestone directly in the in-app interactive editor with real-time ATS score recalculation before exporting.',
    category: 'ats',
    icon: Sparkles,
  },
  {
    q: 'Is my resume and personal data kept private and confidential?',
    a: '100% private. Your resume is processed strictly in isolated sessions to generate your optimization. We never sell, share, or train public AI models on your personal contact details, documents, or career history.',
    category: 'privacy',
    icon: Lock,
  },
  {
    q: 'What formats can I export to?',
    a: 'You can export clean, single-page or multi-page recruiter-standard PDF and DOCX files designed without complex multi-column tables that break automated parsers.',
    category: 'pricing',
    icon: CreditCard,
  },
  {
    q: 'What payment methods are supported for downloads?',
    a: 'All major credit and debit cards, UPI (GPay, PhonePe, Paytm), and net banking are fully supported with instant invoice generation.',
    category: 'pricing',
    icon: CreditCard,
  },
];

export default function LandingFAQ() {
  const [open, setOpen] = useState<number | null>(0);
  const [activeCategory, setActiveCategory] = useState<'all' | 'ats' | 'pricing' | 'privacy'>('all');

  const filtered = activeCategory === 'all' ? FAQS : FAQS.filter((f) => f.category === activeCategory);

  return (
    <div className="space-y-4">
      {/* Category Filter Pills */}
      <div className="flex justify-center items-center flex-wrap gap-2 mb-6">
        {[
          { id: 'all', label: 'All Questions' },
          { id: 'ats', label: 'ATS & Trust Engine' },
          { id: 'pricing', label: 'Pricing & Exports' },
          { id: 'privacy', label: 'Data Privacy' },
        ].map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(c.id as any)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
              activeCategory === c.id
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white bg-white/[0.03] border border-white/5'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* 3D Glass Accordion Cards */}
      <div className="space-y-3">
        {filtered.map(({ q, a, icon: Icon }, i) => {
          const isOpen = open === i;

          return (
            <div
              key={q}
              className="rounded-2xl overflow-hidden transition-all duration-300"
              style={{
                background: isOpen
                  ? 'linear-gradient(145deg, rgba(16,28,48,0.9), rgba(10,16,28,0.95))'
                  : 'rgba(16,24,42,0.5)',
                border: isOpen
                  ? '1px solid rgba(52,211,153,0.35)'
                  : '1px solid rgba(255,255,255,0.07)',
                boxShadow: isOpen
                  ? '0 12px 30px -10px rgba(52,211,153,0.15)'
                  : 'none',
              }}
            >
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 text-left gap-4 cursor-pointer select-none"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                    style={{
                      background: isOpen ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.05)',
                      color: isOpen ? '#34d399' : '#64748B',
                    }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span
                    className={`text-sm sm:text-base font-extrabold tracking-tight transition-colors ${
                      isOpen ? 'text-white' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {q}
                  </span>
                </div>

                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300"
                  style={{
                    background: isOpen ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.05)',
                    color: isOpen ? '#34d399' : '#94A3B8',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                >
                  <ChevronDown className="w-4 h-4" />
                </div>
              </button>

              {isOpen && (
                <div className="px-5 sm:px-6 pb-5 pt-1 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-white/[0.05]">
                  <p className="max-w-2xl">{a}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
