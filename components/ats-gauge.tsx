'use client';

import { useEffect, useState } from 'react';

function useCountUp(target: number, delay = 0, duration = 1000) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const tid = setTimeout(() => {
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

type Props = {
  score: number;
  label: string;
  sublabel?: string;
  color?: 'blue' | 'emerald';
};

export default function AtsGauge({ score, label, sublabel, color = 'blue' }: Props) {
  const clamped   = Math.max(0, Math.min(100, score));
  const display   = useCountUp(clamped, 200);
  const [barW, setBarW] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setBarW(clamped), 400);
    return () => clearTimeout(t);
  }, [clamped]);

  const strokeColor = color === 'emerald' ? '#10b981' : '#7c3aed';
  const glowColor   = color === 'emerald' ? 'rgba(16,185,129,0.3)' : 'rgba(124,58,237,0.3)';
  const textCls     = color === 'emerald' ? 'text-emerald-400' : 'text-purple-400';

  const rating      = clamped >= 80 ? 'Excellent' : clamped >= 60 ? 'Good' : clamped >= 40 ? 'Fair' : 'Needs Work';
  const ratingColor = clamped >= 80 ? '#10b981'   : clamped >= 60 ? '#fbbf24' : clamped >= 40 ? '#f97316' : '#ef4444';

  const gradeLetter = clamped >= 85 ? 'A' : clamped >= 70 ? 'B' : clamped >= 55 ? 'C' : clamped >= 40 ? 'D' : 'F';

  return (
    <div className="rounded-2xl p-5 sm:p-6"
      style={{ background: '#0c1220', border: '1px solid rgba(255,255,255,0.07)' }}>

      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="font-semibold text-white text-sm sm:text-base">{label}</div>
          {sublabel && <div className="text-xs text-slate-500 mt-0.5">{sublabel}</div>}
        </div>
        {/* Grade */}
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-white shrink-0"
          style={{ background: ratingColor, boxShadow: `0 4px 12px ${glowColor}` }}>
          {gradeLetter}
        </div>
      </div>

      {/* Score row */}
      <div className="flex items-end gap-2 mb-1">
        <span className={`text-4xl font-black leading-none ${textCls}`}>{display}</span>
        <span className="text-slate-600 font-bold text-lg mb-0.5">/100</span>
        <span className="ml-auto text-sm font-semibold" style={{ color: ratingColor }}>{rating}</span>
      </div>

      {/* Bar */}
      <div className="mt-3 h-2.5 rounded-full overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${barW}%`,
            background: `linear-gradient(90deg, ${strokeColor}99, ${strokeColor})`,
            boxShadow: barW > 0 ? `0 0 8px ${strokeColor}70` : 'none',
            transition: 'width 1.1s cubic-bezier(0.22,1,0.36,1)',
          }}
        />
      </div>
    </div>
  );
}
