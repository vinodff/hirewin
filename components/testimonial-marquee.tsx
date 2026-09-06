'use client';

import { Star, CheckCircle, ShieldCheck } from 'lucide-react';

type Testimonial = {
  name: string;
  role: string;
  company: string;
  quote: string;
  result: string;
  initial: string;
  color: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Aditi Roy',
    role: 'Frontend Engineer',
    company: 'Now at Razorpay',
    quote: 'I had applied to 70+ roles with zero callbacks. Re-tailored once with HireWin. The trust breakdown helped me see exactly where my bullets lacked metrics. Got 3 interviews in one week.',
    result: '0 → 3 interviews / week',
    initial: 'A',
    color: 'var(--accent-soft)',
  },
  {
    name: 'Karthik Menon',
    role: 'Product Manager',
    company: 'Now at Swiggy',
    quote: 'My ATS score went from 38 to 88. The bullets were the same achievements — just rewritten with real quantifiable impact and ownership.',
    result: 'ATS 38 → 88',
    initial: 'K',
    color: '#60a5fa',
  },
  {
    name: 'Sneha Patel',
    role: 'Data Analyst',
    company: 'TCS → Razorpay',
    quote: 'Switching out of a service company felt impossible. HireWin restructured my resume for top tier product roles. Got my offer within 6 weeks.',
    result: 'Switched companies in 6 weeks',
    initial: 'S',
    color: '#34d399',
  },
  {
    name: 'Rahul Verma',
    role: 'Full Stack Engineer',
    company: 'Now at Microsoft',
    quote: 'The Interview Risk alerts were a game-changer. It told me what recruiters would probe before I even got to round 1. Shortlisted in 4 out of 5 drives.',
    result: '4/5 shortlists cleared',
    initial: 'R',
    color: '#fbbf24',
  },
  {
    name: 'Priya Sharma',
    role: 'Senior PM',
    company: 'Now at Uber',
    quote: 'I used to spend 2 hours rewriting my resume for every single job. Now I paste, click, and download an ATS-proof PDF in under 30 seconds.',
    result: 'Saved 10+ hrs / week',
    initial: 'P',
    color: '#f472b6',
  },
  {
    name: 'Vikram Joshi',
    role: 'DevOps & SRE',
    company: 'Now at Flipkart',
    quote: 'Recruiter inbounds tripled in two weeks. The keyword matching is genuinely surgical and doesn’t sound like robotic ChatGPT spam.',
    result: '3× recruiter inbounds',
    initial: 'V',
    color: '#22d3ee',
  },
];

function Card({ t }: { t: Testimonial }) {
  return (
    <div
      className="shrink-0 w-[300px] sm:w-[360px] mx-2 rounded-3xl p-6 relative flex flex-col justify-between"
      style={{
        background: 'linear-gradient(145deg, #0d1428, #090e1c)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
      }}
    >
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
            ))}
          </div>
          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <CheckCircle className="w-3 h-3" />
            Verified Hire
          </div>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed mb-5">&ldquo;{t.quote}&rdquo;</p>
      </div>

      <div>
        <div
          className="text-xs font-bold inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg mb-4"
          style={{
            background: `${t.color}15`,
            color: t.color,
            border: `1px solid ${t.color}33`,
          }}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          {t.result}
        </div>

        <div className="flex items-center gap-3 pt-3 border-t border-white/[0.06]">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
            style={{ background: `linear-gradient(135deg, ${t.color}, ${t.color}99)` }}
          >
            {t.initial}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-white truncate">{t.name}</div>
            <div className="text-xs text-slate-400 truncate">
              {t.role} · <span className="text-accent-400 font-medium">{t.company}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TestimonialMarquee() {
  const items = [...TESTIMONIALS, ...TESTIMONIALS];
  return (
    <div className="overflow-hidden marquee-mask py-4">
      <div className="flex marquee-track" style={{ width: 'max-content' }}>
        {items.map((t, i) => (
          <Card key={`${t.name}-${i}`} t={t} />
        ))}
      </div>
    </div>
  );
}
