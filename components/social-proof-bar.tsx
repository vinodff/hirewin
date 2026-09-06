'use client';

import { ShieldCheck, Award, TrendingUp, Users } from 'lucide-react';

const METRICS = [
  { icon: Users, label: 'Resumes Tailored', value: '14,200+' },
  { icon: TrendingUp, label: 'Avg. ATS Score Jump', value: '+54 Pts' },
  { icon: Award, label: 'Interview Callback Jump', value: '3.8×' },
  { icon: ShieldCheck, label: 'Candidate Trust Score', value: '98.4%' },
];

const COMPANIES = [
  { name: 'Google', domain: 'Engineering' },
  { name: 'Microsoft', domain: 'Product' },
  { name: 'Amazon', domain: 'AWS & Cloud' },
  { name: 'Razorpay', domain: 'Fintech' },
  { name: 'Stripe', domain: 'Payments' },
  { name: 'Uber', domain: 'Platform' },
  { name: 'Flipkart', domain: 'E-commerce' },
  { name: 'Notion', domain: 'Design' },
];

export default function SocialProofBar() {
  return (
    <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10 my-8">
      {/* Top metrics row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center mb-10 pb-8 border-b border-white/[0.06]">
        {METRICS.map((m, i) => {
          const Icon = m.icon;
          return (
            <div key={i} className="flex flex-col items-center">
              <div className="flex items-center gap-2 mb-1.5">
                <Icon className="w-4 h-4 text-emerald-400" />
                <span className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight tabular-nums">
                  {m.value}
                </span>
              </div>
              <span className="text-xs text-slate-400 font-semibold">{m.label}</span>
            </div>
          );
        })}
      </div>

      {/* Companies brand pill row */}
      <div>
        <p className="text-center text-[11px] uppercase tracking-widest text-slate-500 font-bold mb-6">
          Candidates hired at world-class technology companies
        </p>
        <div className="flex items-center justify-center flex-wrap gap-3 sm:gap-4">
          {COMPANIES.map((company) => (
            <div
              key={company.name}
              className="px-4 py-2 rounded-xl flex items-center gap-2 transition-all duration-200 hover:scale-105"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-white font-bold text-xs sm:text-sm tracking-wide">{company.name}</span>
              <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">· {company.domain}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
