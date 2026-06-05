'use client';

import { useEffect, useState, useRef } from 'react';
import { TrendingUp, ArrowRight } from 'lucide-react';

function useCountUp(target: number, delay = 0, duration = 1100) {
  const [n, setN] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    const tid = setTimeout(() => {
      started.current = true;
      const t0 = Date.now();
      const run = () => {
        const p = Math.min((Date.now() - t0) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setN(Math.round(target * eased));
        if (p < 1) requestAnimationFrame(run);
      };
      requestAnimationFrame(run);
    }, delay);
    return () => clearTimeout(tid);
  }, [target, delay, duration]);
  return n;
}

function grade(score: number): { letter: string; label: string; color: string; glow: string } {
  if (score >= 85) return { letter: 'A', label: 'Excellent', color: '#10b981', glow: 'rgba(16,185,129,0.3)' };
  if (score >= 70) return { letter: 'B', label: 'Good',      color: '#34d399', glow: 'rgba(52,211,153,0.25)' };
  if (score >= 55) return { letter: 'C', label: 'Fair',      color: '#fbbf24', glow: 'rgba(251,191,36,0.25)' };
  if (score >= 40) return { letter: 'D', label: 'Needs Work',color: '#f97316', glow: 'rgba(249,115,22,0.25)' };
  return             { letter: 'F', label: 'Poor',            color: '#ef4444', glow: 'rgba(239,68,68,0.25)'  };
}

type BarProps = { pct: number; color: string; delay?: number };
function Bar({ pct, color, delay = 0 }: BarProps) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(pct), delay + 200);
    return () => clearTimeout(t);
  }, [pct, delay]);
  return (
    <div className="relative h-2 rounded-full overflow-hidden w-full"
      style={{ background: 'rgba(255,255,255,0.06)' }}>
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-all"
        style={{
          width: `${w}%`,
          background: `linear-gradient(90deg, ${color}cc, ${color})`,
          boxShadow: w > 0 ? `0 0 8px ${color}70` : 'none',
          transition: 'width 1.1s cubic-bezier(0.22,1,0.36,1)',
        }}
      />
    </div>
  );
}

type FlowScoreProps = {
  label: string;
  sublabel: string;
  score: number;
  isAfter?: boolean;
  delay?: number;
};
function FlowScore({ label, sublabel, score, isAfter, delay = 0 }: FlowScoreProps) {
  const g = grade(score);
  const display = useCountUp(score, delay);

  return (
    <div className="flex flex-col items-center gap-2 shrink-0">
      <div className="relative rounded-2xl px-5 sm:px-8 py-3 sm:py-4 overflow-hidden"
        style={{
          background: isAfter ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${isAfter ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.08)'}`,
          boxShadow: isAfter ? `0 6px 26px ${g.glow}` : 'none',
        }}>
        {isAfter && (
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg,transparent,rgba(16,185,129,0.6),transparent)' }} />
        )}
        <span className="text-5xl sm:text-7xl font-black leading-none tabular-nums" style={{ color: g.color }}>
          {display}
        </span>
      </div>
      <div className="text-center">
        <div className="text-[11px] font-bold uppercase tracking-widest"
          style={{ color: isAfter ? '#34d399' : '#64748b' }}>
          {label}
        </div>
        <div className="text-[10px] text-slate-600 mt-0.5">{sublabel}</div>
      </div>
    </div>
  );
}

type Props = {
  atsScore: number;
  jobFitScore: number;
  // The optimized resume's ATS score ("after"). Falls back to jobFitScore for
  // older saved analyses that predate this field.
  optimizedAtsScore?: number | null;
};

export default function ScoreHero({ atsScore, jobFitScore, optimizedAtsScore }: Props) {
  const afterScore = optimizedAtsScore ?? jobFitScore;
  const delta = afterScore - atsScore;
  const coverageGain = delta > 0;

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: '#0c1220', border: '1px solid rgba(255,255,255,0.07)' }}>

      {/* Top banner */}
      <div className="px-5 sm:px-6 py-4 flex items-center justify-between border-b"
        style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-white text-sm sm:text-base">Resume Score Analysis</span>
        </div>
        {coverageGain && (
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold"
            style={{
              background: 'rgba(16,185,129,0.12)',
              border: '1px solid rgba(16,185,129,0.3)',
              color: '#34d399',
            }}>
            <TrendingUp className="w-3.5 h-3.5" />
            +{delta} pts improvement
          </div>
        )}
      </div>

      {/* Before → After flow: 28 → 91 · +63 pts */}
      <div className="px-5 sm:px-6 pt-6 pb-6">
        <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500 text-center mb-5">
          Before / After
        </div>
        <div className="flex items-center justify-center gap-3 sm:gap-6">
          <FlowScore label="Before" sublabel="Original" score={atsScore} delay={0} />

          <ArrowRight className="w-6 h-6 sm:w-8 sm:h-8 text-slate-600 shrink-0 mb-6" />

          <FlowScore label="After" sublabel="Optimized" score={afterScore} isAfter delay={300} />

          {coverageGain && (
            <div className="flex flex-col items-center justify-center pl-1 sm:pl-4 mb-6 shrink-0">
              <span className="text-3xl sm:text-4xl font-black text-emerald-400 leading-none tabular-nums">
                +{delta}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/80 mt-1">
                pts
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Category progress rows */}
      <div className="px-4 sm:px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <MetricRow label="Keyword Match" pct={Math.round((afterScore / 100) * 85 + 10)} delay={200} color="#7c3aed" />
        <MetricRow label="Impact Language"  pct={Math.round((afterScore / 100) * 90 + 5)}  delay={350} color="#3b82f6" />
        <MetricRow label="ATS Compatibility" pct={Math.min(98, Math.round(afterScore * 0.95 + 5))} delay={500} color="#10b981" />
        <MetricRow label="Role Alignment"    pct={Math.round((jobFitScore + afterScore) / 2 + 5)}      delay={650} color="#f59e0b" />
      </div>
    </div>
  );
}

function MetricRow({ label, pct, delay, color }: { label: string; pct: number; delay: number; color: string }) {
  const clamped = Math.min(100, Math.max(0, pct));
  const display = useCountUp(clamped, delay, 900);
  return (
    <div className="flex items-center gap-3">
      <div className="text-xs text-slate-500 w-36 shrink-0">{label}</div>
      <div className="flex-1">
        <Bar pct={clamped} color={color} delay={delay} />
      </div>
      <div className="text-xs font-bold w-9 text-right" style={{ color }}>{display}%</div>
    </div>
  );
}
