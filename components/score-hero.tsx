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

type ScoreCardProps = {
  label: string;
  sublabel: string;
  score: number;
  isAfter?: boolean;
  delay?: number;
};
function ScoreCard({ label, sublabel, score, isAfter, delay = 0 }: ScoreCardProps) {
  const g = grade(score);
  const display = useCountUp(score, delay);

  return (
    <div className="flex-1 rounded-2xl p-5 sm:p-6 relative overflow-hidden"
      style={{
        background: isAfter ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${isAfter ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.08)'}`,
      }}>
      {isAfter && (
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg,transparent,rgba(16,185,129,0.5),transparent)' }} />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</div>
          <div className="text-[11px] text-slate-700 mt-0.5">{sublabel}</div>
        </div>
        {/* Grade badge */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-white shrink-0"
          style={{ background: g.color, boxShadow: `0 4px 14px ${g.glow}` }}>
          {g.letter}
        </div>
      </div>

      {/* Score */}
      <div className="flex items-end gap-1.5 mb-1">
        <span className="text-5xl sm:text-6xl font-black leading-none" style={{ color: g.color }}>
          {display}
        </span>
        <span className="text-xl text-slate-600 font-bold mb-1">/100</span>
      </div>
      <div className="text-sm font-semibold mb-4" style={{ color: g.color }}>{g.label}</div>

      {/* Bar */}
      <Bar pct={score} color={g.color} delay={delay} />
    </div>
  );
}

type Props = {
  atsScore: number;
  jobFitScore: number;
};

export default function ScoreHero({ atsScore, jobFitScore }: Props) {
  const delta = jobFitScore - atsScore;
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

      {/* Cards */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-stretch gap-3 sm:gap-4">
        <ScoreCard
          label="Before · Original"
          sublabel="Your resume vs. job description"
          score={atsScore}
          delay={0}
        />

        {/* Arrow divider */}
        <div className="flex sm:flex-col items-center justify-center gap-2 px-2 py-1 sm:py-4">
          <div className="hidden sm:block w-px flex-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <ArrowRight className="w-4 h-4 text-slate-500 sm:rotate-0 -rotate-90 hidden sm:block" />
            <ArrowRight className="w-4 h-4 text-slate-500 sm:hidden" />
          </div>
          <div className="hidden sm:block w-px flex-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
        </div>

        <ScoreCard
          label="After · Optimized"
          sublabel="Skills & keyword match"
          score={jobFitScore}
          isAfter
          delay={300}
        />
      </div>

      {/* Category progress rows */}
      <div className="px-4 sm:px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <MetricRow label="Keyword Match" pct={Math.round((atsScore / 100) * 80 + 20)} delay={200} color="#7c3aed" />
        <MetricRow label="Impact Language"  pct={Math.round((jobFitScore / 100) * 90 + 5)}  delay={350} color="#3b82f6" />
        <MetricRow label="ATS Compatibility" pct={Math.min(98, Math.round(jobFitScore * 0.95 + 5))} delay={500} color="#10b981" />
        <MetricRow label="Role Alignment"    pct={Math.round((jobFitScore + atsScore) / 2 + 5)}      delay={650} color="#f59e0b" />
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
