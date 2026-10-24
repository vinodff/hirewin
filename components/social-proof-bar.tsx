'use client';

import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Award, TrendingUp, Users } from 'lucide-react';

const METRICS = [
  { icon: Users, label: 'Resumes Tailored', value: '14,200+', delta: '94% pass rate' },
  { icon: TrendingUp, label: 'Avg. ATS Score Jump', value: '+54 Pts', delta: 'from raw draft' },
  { icon: Award, label: 'Interview Callback Jump', value: '3.8×', delta: 'verified increase' },
  { icon: ShieldCheck, label: 'Candidate Trust Score', value: '98.4%', delta: '0% hallucination' },
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
    <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10 my-6">
      {/* Top metrics row with staggered motion reveal */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 text-center mb-10 pb-8 border-b border-white/[0.06]">
        {METRICS.map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center p-3 sm:p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-emerald-500/20 transition-colors"
            >
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5">
                <Icon className="w-4 h-4 text-emerald-400" />
                <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight font-mono tabular-nums">
                  {m.value}
                </span>
              </div>
              <span className="text-xs text-slate-300 font-semibold">{m.label}</span>
              <span className="text-[10px] text-emerald-400/80 font-mono mt-0.5">{m.delta}</span>
            </motion.div>
          );
        })}
      </div>

      {/* Companies brand pill row */}
      <div>
        <p className="text-center text-[10px] sm:text-[11px] uppercase tracking-widest text-slate-500 font-bold mb-5 font-mono">
          Candidates hired at world-class technology companies
        </p>
        <div className="flex items-center justify-center flex-wrap gap-2.5 sm:gap-3.5">
          {COMPANIES.map((company, i) => (
            <motion.div
              key={company.name}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={{ duration: 0.4, delay: i * 0.04 }}
              className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl flex items-center gap-2 bg-white/[0.02] border border-white/[0.06] hover:border-emerald-500/30 transition-all duration-200 hover:scale-105 cursor-default"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-white font-bold text-xs sm:text-sm tracking-wide">{company.name}</span>
              <span className="text-[10px] text-slate-500 font-medium hidden sm:inline font-mono">· {company.domain}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
