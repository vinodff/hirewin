'use client';

import { Star } from 'lucide-react';

type Testimonial = {
  name: string;
  role: string;
  quote: string;
  result: string;
  initial: string;
  color: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Aditi R.',
    role: 'Frontend Engineer · Bengaluru',
    quote: 'I had applied to 70+ roles with zero callbacks. Re-tailored once with HireWin. Got 3 interviews in a week.',
    result: '0 → 3 interviews / week',
    initial: 'A',
    color: '#a78bfa',
  },
  {
    name: 'Karthik M.',
    role: 'MBA · IIM Kozhikode',
    quote: 'My ATS score went from 38 to 88. The bullets were the same achievements — just rewritten with real impact.',
    result: 'ATS 38 → 88',
    initial: 'K',
    color: '#60a5fa',
  },
  {
    name: 'Sneha P.',
    role: 'Data Analyst · TCS → Razorpay',
    quote: 'Switching out of service company felt impossible. HireWin restructured my resume for product roles. Got my offer.',
    result: 'Switched companies in 6 weeks',
    initial: 'S',
    color: '#34d399',
  },
  {
    name: 'Rahul V.',
    role: 'Final-year B.Tech · NIT Trichy',
    quote: 'Campus placements were brutal. Used HireWin before each round. ATS-friendly resume = shortlisted in 4 of 5 drives.',
    result: '4/5 shortlists in placements',
    initial: 'R',
    color: '#fbbf24',
  },
  {
    name: 'Priya S.',
    role: 'Product Manager · Pune',
    quote: 'I used to spend 2 hours rewriting my resume for every job. Now I paste, click, download. Saved my weekends.',
    result: '2hrs → 30 seconds',
    initial: 'P',
    color: '#f472b6',
  },
  {
    name: 'Vikram J.',
    role: 'DevOps · Wipro · 7 yrs',
    quote: 'Recruiter messages tripled in two weeks. The keyword matching is genuinely surgical, not stuffed.',
    result: '3× recruiter inbound',
    initial: 'V',
    color: '#22d3ee',
  },
  {
    name: 'Ananya G.',
    role: 'Content Strategist · Hyderabad',
    quote: 'It rewrote a bullet I struggled with for years. The clarity is what got me through the screening.',
    result: 'Cleared 4 screenings in a row',
    initial: 'A',
    color: '#fb923c',
  },
  {
    name: 'Mohit K.',
    role: 'SDE-2 · Flipkart',
    quote: 'Before HireWin: ghost city. After: I had to start declining recruiter calls.',
    result: 'From 0 to declining calls',
    initial: 'M',
    color: '#c084fc',
  },
];

function Card({ t }: { t: Testimonial }) {
  return (
    <div
      className="shrink-0 w-[280px] sm:w-[340px] mx-2 rounded-2xl p-5"
      style={{
        background: '#0f1629',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-center gap-1 mb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
        ))}
      </div>
      <p className="text-sm text-slate-300 leading-relaxed mb-4 italic">&ldquo;{t.quote}&rdquo;</p>
      <div
        className="text-xs font-semibold inline-flex items-center gap-1 px-2 py-1 rounded-md mb-3"
        style={{
          background: `${t.color}1a`,
          color: t.color,
          border: `1px solid ${t.color}33`,
        }}
      >
        {t.result}
      </div>
      <div className="flex items-center gap-3 pt-3 border-t border-white/5">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
          style={{ background: `linear-gradient(135deg, ${t.color}, ${t.color}99)` }}
        >
          {t.initial}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white truncate">{t.name}</div>
          <div className="text-[11px] text-slate-500 truncate">{t.role}</div>
        </div>
      </div>
    </div>
  );
}

export default function TestimonialMarquee() {
  // Duplicate the list for seamless loop
  const items = [...TESTIMONIALS, ...TESTIMONIALS];
  return (
    <div className="overflow-hidden marquee-mask">
      <div className="flex marquee-track" style={{ width: 'max-content' }}>
        {items.map((t, i) => (
          <Card key={`${t.name}-${i}`} t={t} />
        ))}
      </div>
    </div>
  );
}
