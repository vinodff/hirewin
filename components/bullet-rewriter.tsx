'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowDown, Sparkles } from 'lucide-react';

const TRANSFORMS = [
  {
    job:    'Razorpay · Senior Backend Engineer',
    jdHint: 'Requires: Spring Boot, microservices, performance optimization',
    before: 'Worked on Java modules in the Wipro team project.',
    after:  'Architected 4 Spring Boot microservices at Wipro, cutting API latency 42% and enabling 3× throughput for 2M+ daily transactions.',
    tag:    'Impact + Numbers',
    color:  '#a78bfa',
  },
  {
    job:    'Swiggy · Product Manager',
    jdHint: 'Requires: agile leadership, roadmap ownership, cross-functional collaboration',
    before: 'Attended daily standup meetings and helped track project tasks.',
    after:  'Owned end-to-end roadmap for 3 product verticals; led 12-sprint agile cadence, shipping 8 on-time releases with 99.7% uptime.',
    tag:    'Ownership + Scope',
    color:  '#60a5fa',
  },
  {
    job:    'Zomato · Frontend Engineer',
    jdHint: 'Requires: React, A/B testing, user experience improvements',
    before: 'Helped with frontend development tasks when needed.',
    after:  'Delivered 6 React features across checkout and discovery; A/B tests showed +38% NPS and ₹2.4Cr uplift in monthly GMV.',
    tag:    'Results + Business Value',
    color:  '#34d399',
  },
];

function Row({ t, visible, idx }: { t: typeof TRANSFORMS[0]; visible: boolean; idx: number }) {
  const delay = idx * 180;
  return (
    <div className="rounded-2xl overflow-hidden transition-all duration-700"
      style={{
        background: '#0c1220',
        border: '1px solid rgba(255,255,255,0.07)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translateY(20px)',
        transitionDelay: `${delay}ms`,
      }}>

      {/* Job target bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b"
        style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }}>
        <Sparkles className="w-3.5 h-3.5 shrink-0" style={{ color: t.color }} />
        <span className="text-xs font-semibold" style={{ color: t.color }}>{t.job}</span>
        <span className="hidden sm:block text-[10px] text-slate-600 ml-1">· {t.jdHint}</span>
        <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
          style={{ background: `${t.color}18`, color: t.color, border: `1px solid ${t.color}30` }}>
          {t.tag}
        </span>
      </div>

      <div className="p-4 sm:p-5">
        {/* Before */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.2)' }}>
            <span className="text-[10px] font-black text-red-400">✗</span>
          </div>
          <div className="flex-1 text-sm text-slate-500 leading-relaxed italic"
            style={{
              textDecoration: visible ? 'line-through' : 'none',
              textDecorationColor: 'rgba(248,113,113,0.5)',
              transition: `text-decoration 0.5s ease ${delay + 400}ms`,
            }}>
            {t.before}
          </div>
        </div>

        {/* Arrow */}
        <div className="flex items-center gap-2 my-2 ml-8">
          <ArrowDown className="w-3.5 h-3.5 text-slate-700" />
          <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, rgba(255,255,255,0.05), ${t.color}40, transparent)` }} />
          <span className="text-[10px] text-slate-600 font-medium whitespace-nowrap">HireWin AI rewrites</span>
        </div>

        {/* After */}
        <div className="flex items-start gap-3 mt-3">
          <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: `${t.color}18`, border: `1px solid ${t.color}35` }}>
            <span className="text-[10px] font-black" style={{ color: t.color }}>✓</span>
          </div>
          <div className="flex-1 text-sm text-slate-200 leading-relaxed transition-all duration-700"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'none' : 'translateX(10px)',
              transitionDelay: `${delay + 500}ms`,
            }}>
            {t.after}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BulletRewriter() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="space-y-4">
      {TRANSFORMS.map((t, i) => (
        <Row key={i} t={t} visible={visible} idx={i} />
      ))}
    </div>
  );
}
