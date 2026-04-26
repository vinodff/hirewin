'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQS = [
  {
    q: 'Is it really free to start?',
    a: 'Yes — completely free. You get 2 full resume optimizations every month with no credit card required. Download requires a paid plan.',
  },
  {
    q: 'What does the Starter plan include?',
    a: 'Starter is a one-time payment that unlocks PDF and DOCX downloads for that resume. Pro and Power plans give you recurring monthly optimizations and downloads.',
  },
  {
    q: 'Does cancelling my subscription cut off my access?',
    a: "No. You keep access until the end of your billing period. After that you revert to the Free plan's 2 optimizations per month.",
  },
  {
    q: 'Can I edit the resume after the AI generates it?',
    a: 'Yes — after optimization you can edit the resume directly in the in-app editor before downloading.',
  },
  {
    q: 'Will my resume actually pass ATS scanners?',
    a: 'HireWin targets the keyword and formatting signals that ATS systems score heavily. Our users average a 57-point score jump. Results vary by job and resume.',
  },
  {
    q: 'Is my resume data private?',
    a: 'Your resume is processed only to generate your optimization. We do not sell or share your data with third parties.',
  },
  {
    q: 'What payment methods are supported?',
    a: 'All major credit/debit cards, UPI, and net banking via Razorpay.',
  },
];

export default function LandingFAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {FAQS.map(({ q, a }, i) => (
        <div
          key={i}
          className="rounded-xl overflow-hidden"
          style={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between px-5 py-4 text-left gap-4"
          >
            <span className="text-sm font-medium text-slate-200">{q}</span>
            <ChevronDown
              className="w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200"
              style={{ transform: open === i ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          </button>
          {open === i && (
            <div className="px-5 pb-4 text-sm text-slate-400 leading-relaxed border-t border-white/[0.04] pt-3">
              {a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
