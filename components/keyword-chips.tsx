'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Zap } from 'lucide-react';

function useBarWidth(pct: number, delay = 300) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(pct), delay);
    return () => clearTimeout(t);
  }, [pct, delay]);
  return w;
}

type Props = { matched: string[]; missing: string[] };

export default function KeywordChips({ matched, missing }: Props) {
  const total   = matched.length + missing.length;
  const pct     = total > 0 ? Math.round((matched.length / total) * 100) : 0;
  const barW    = useBarWidth(pct, 400);
  const [displayPct, setDisplayPct] = useState(0);

  useEffect(() => {
    const t0 = Date.now();
    const run = () => {
      const p = Math.min((Date.now() - t0) / 900, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setDisplayPct(Math.round(pct * e));
      if (p < 1) requestAnimationFrame(run);
    };
    const id = setTimeout(() => requestAnimationFrame(run), 400);
    return () => clearTimeout(id);
  }, [pct]);

  const coverageColor =
    pct >= 75 ? '#10b981' :
    pct >= 50 ? '#f59e0b' :
                '#f87171';

  const coverageLabel =
    pct >= 75 ? 'Strong coverage' :
    pct >= 50 ? 'Partial coverage' :
                'Low coverage';

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: '#0c1220', border: '1px solid rgba(255,255,255,0.07)' }}>

      {/* Coverage header */}
      <div className="px-5 sm:px-6 pt-5 pb-4">
        <div className="flex items-start justify-between mb-1">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Zap className="w-4 h-4 text-yellow-400" />
              <h3 className="font-semibold text-white text-sm sm:text-base">Keyword Coverage</h3>
            </div>
            <p className="text-xs text-slate-500">
              {matched.length} of {total} job keywords matched
              {missing.length > 0 && (
                <span className="ml-1.5 text-slate-600">· add {missing.length} more to boost score</span>
              )}
            </p>
          </div>

          {/* Big % number */}
          <div className="text-right shrink-0">
            <div className="text-3xl sm:text-4xl font-black leading-none" style={{ color: coverageColor }}>
              {displayPct}<span className="text-lg sm:text-xl">%</span>
            </div>
            <div className="text-[11px] font-semibold mt-0.5" style={{ color: coverageColor }}>
              {coverageLabel}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-3 rounded-full overflow-hidden relative"
          style={{ background: 'rgba(255,255,255,0.05)' }}>
          {/* Missed keywords (red portion) */}
          <div className="absolute inset-0 rounded-full"
            style={{ background: 'rgba(248,113,113,0.15)' }} />
          {/* Matched portion */}
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all"
            style={{
              width: `${barW}%`,
              background: `linear-gradient(90deg, ${coverageColor}cc, ${coverageColor})`,
              boxShadow: barW > 0 ? `0 0 12px ${coverageColor}60` : 'none',
              transition: 'width 1.1s cubic-bezier(0.22,1,0.36,1)',
            }}
          />
          {/* Tick marks */}
          {[25, 50, 75].map(tick => (
            <div key={tick} className="absolute top-0 bottom-0 w-px"
              style={{ left: `${tick}%`, background: 'rgba(0,0,0,0.3)' }} />
          ))}
        </div>

        {/* Scale labels */}
        <div className="flex justify-between mt-1.5 text-[10px] text-slate-700">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />

      {/* Keyword grid */}
      <div className="px-5 sm:px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        {/* Matched */}
        <div>
          <div className="flex items-center gap-1.5 mb-2.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Matched ({matched.length})
            </span>
          </div>
          {matched.length === 0 ? (
            <p className="text-xs text-slate-600">None found</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {matched.map(kw => (
                <span key={kw}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full"
                  style={{
                    background: 'rgba(16,185,129,0.1)',
                    border: '1px solid rgba(16,185,129,0.2)',
                    color: '#34d399',
                  }}>
                  <span className="w-1 h-1 rounded-full bg-emerald-400 shrink-0" />
                  {kw}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Missing */}
        <div className="sm:border-l sm:pl-6" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-1.5 mb-2.5">
            <XCircle className="w-3.5 h-3.5 text-red-400" />
            <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">
              Missing ({missing.length})
            </span>
          </div>
          {missing.length === 0 ? (
            <p className="text-xs text-emerald-500 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Full coverage — great match!
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5">
                {missing.map(kw => (
                  <span key={kw}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full"
                    style={{
                      background: 'rgba(248,113,113,0.08)',
                      border: '1px solid rgba(248,113,113,0.18)',
                      color: '#fca5a5',
                    }}>
                    <span className="w-1 h-1 rounded-full bg-red-400 shrink-0" />
                    {kw}
                  </span>
                ))}
              </div>
              <p className="mt-2.5 text-[11px] text-slate-600 leading-relaxed">
                Add these to your optimized resume&apos;s skills or experience sections where relevant.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
