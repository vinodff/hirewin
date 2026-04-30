'use client';

import { useEffect, useRef, useState } from 'react';
import { Clock, Coffee, Search, PenLine, Inbox, Zap, CheckCircle, Download } from 'lucide-react';

const OLD_STEPS = [
  { icon: Search,   text: 'Read JD carefully, take notes',         time: '20 min' },
  { icon: PenLine,  text: 'Manually rewrite bullets for this role', time: '45 min' },
  { icon: Coffee,   text: 'Google "how to beat ATS" again',         time: '20 min' },
  { icon: Inbox,    text: 'Format and proof-read the PDF',          time: '25 min' },
  { icon: PenLine,  text: 'Tweak again after second-guessing',      time: '15 min' },
];

const NEW_STEPS = [
  { icon: Zap,         text: 'Paste resume + job description', time: '15 sec' },
  { icon: CheckCircle, text: 'AI scans, rewrites, injects keywords', time: '20 sec' },
  { icon: Download,    text: 'Download polished PDF. Done.',   time: '5 sec' },
];

function AnimBar({ pct, color, delay }: { pct: number; color: string; delay: number }) {
  const [w, setW] = useState(0);
  const triggered = useRef(false);

  useEffect(() => {
    if (!triggered.current) {
      triggered.current = true;
      const t = setTimeout(() => setW(pct), delay);
      return () => clearTimeout(t);
    }
  }, [pct, delay]);

  return (
    <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', flex: 1 }}>
      <div className="h-full rounded-full transition-all duration-1000"
        style={{ width: `${w}%`, background: `linear-gradient(90deg,${color}99,${color})`,
                 boxShadow: w > 0 ? `0 0 8px ${color}70` : 'none',
                 transition: `width 1.2s cubic-bezier(0.22,1,0.36,1) ${delay}ms` }} />
    </div>
  );
}

export default function TimeSaved() {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true); }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="grid lg:grid-cols-2 gap-5">

      {/* Old way */}
      <div className="rounded-2xl overflow-hidden transition-all duration-700"
        style={{
          background: '#0c1220',
          border: '1px solid rgba(248,113,113,0.15)',
          opacity: vis ? 1 : 0,
          transform: vis ? 'none' : 'translateY(16px)',
        }}>
        <div className="flex items-center gap-3 px-5 py-4 border-b"
          style={{ background: 'rgba(248,113,113,0.04)', borderColor: 'rgba(248,113,113,0.12)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}>
            <Clock className="w-4.5 h-4.5 text-red-400" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-red-400">Without HireWin</div>
            <div className="text-base font-extrabold text-white">2+ hours per application</div>
          </div>
          <div className="ml-auto text-3xl font-black text-red-400 opacity-20">2h</div>
        </div>

        <div className="px-5 py-4 space-y-3">
          {OLD_STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-3 transition-all duration-500"
              style={{
                opacity: vis ? 1 : 0,
                transform: vis ? 'none' : 'translateX(-8px)',
                transitionDelay: `${i * 100 + 200}ms`,
              }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)' }}>
                <s.icon className="w-3.5 h-3.5 text-red-400" />
              </div>
              <span className="text-sm text-slate-400 flex-1">{s.text}</span>
              <span className="text-[11px] font-semibold text-red-400 shrink-0 font-mono">{s.time}</span>
            </div>
          ))}
        </div>

        <div className="px-5 pb-4">
          <div className="flex items-center gap-3 mb-1.5">
            <span className="text-xs text-slate-500">Total time</span>
            <AnimBar pct={100} color="#ef4444" delay={vis ? 600 : 99999} />
            <span className="text-sm font-bold text-red-400 shrink-0 font-mono">125 min</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed mt-2">
            And you still wonder if the bullets are good enough. Apply to 5 jobs? That&apos;s your entire Sunday gone.
          </p>
        </div>
      </div>

      {/* HireWin way */}
      <div className="rounded-2xl overflow-hidden transition-all duration-700"
        style={{
          background: '#0c1220',
          border: '1px solid rgba(74,222,128,0.15)',
          opacity: vis ? 1 : 0,
          transform: vis ? 'none' : 'translateY(16px)',
          transitionDelay: '150ms',
        }}>
        <div className="flex items-center gap-3 px-5 py-4 border-b"
          style={{ background: 'rgba(74,222,128,0.04)', borderColor: 'rgba(74,222,128,0.12)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)' }}>
            <Zap className="w-4.5 h-4.5 text-green-400" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-green-400">With HireWin</div>
            <div className="text-base font-extrabold text-white">30 seconds. Seriously.</div>
          </div>
          <div className="ml-auto text-3xl font-black text-green-400 opacity-20">30s</div>
        </div>

        <div className="px-5 py-4 space-y-3">
          {NEW_STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-3 transition-all duration-500"
              style={{
                opacity: vis ? 1 : 0,
                transform: vis ? 'none' : 'translateX(8px)',
                transitionDelay: `${i * 120 + 300}ms`,
              }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)' }}>
                <s.icon className="w-3.5 h-3.5 text-green-400" />
              </div>
              <span className="text-sm text-slate-300 flex-1">{s.text}</span>
              <span className="text-[11px] font-bold text-green-400 shrink-0 font-mono">{s.time}</span>
            </div>
          ))}

          {/* Spacer to match height */}
          <div className="h-8" />
          <div className="h-3" />
        </div>

        <div className="px-5 pb-4">
          <div className="flex items-center gap-3 mb-1.5">
            <span className="text-xs text-slate-500">Total time</span>
            <AnimBar pct={0.4} color="#4ade80" delay={vis ? 700 : 99999} />
            <span className="text-sm font-bold text-green-400 shrink-0 font-mono">30 sec</span>
          </div>
          <p className="text-[11px] text-emerald-700 leading-relaxed mt-2">
            Spend the time you saved preparing for the interview instead. That&apos;s where jobs are actually won.
          </p>
        </div>
      </div>
    </div>
  );
}
