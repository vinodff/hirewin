'use client';

import { useEffect, useState, useRef } from 'react';
import { Zap, Target, TrendingUp, CheckCircle } from 'lucide-react';

const BEFORE_BULLETS = [
  'Worked on Java modules in team project',
  'Attended daily standup meetings',
  'Fixed bugs in existing codebase',
];

const AFTER_BULLETS = [
  'Engineered 4 Spring Boot µservices, ↓42% API latency',
  'Led 12-sprint agile cadence; shipped 8 releases zero-downtime',
  'Resolved 23 P0/P1 issues in <48h, zero production incidents Q3',
];

const JD_KEYWORDS = ['Spring Boot', 'Microservices', 'Agile', 'AWS', 'REST API', 'CI/CD'];

type Phase = 'idle' | 'scanning' | 'transforming' | 'done';

function ScoreRing({ score, size = 52 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const C = 2 * Math.PI * r;
  const col = score >= 70 ? '#4ade80' : score >= 40 ? '#fbbf24' : '#f87171';
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', position: 'absolute', inset: 0 }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={4}
          strokeDasharray={`${(score/100)*C} ${C}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1.1s cubic-bezier(0.22,1,0.36,1), stroke 0.5s ease',
                   filter: `drop-shadow(0 0 5px ${col}80)` }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-black leading-none text-sm" style={{ color: col, transition: 'color 0.5s ease' }}>
          {score}
        </span>
        <span className="text-[8px] text-slate-600 leading-none mt-0.5">ATS</span>
      </div>
    </div>
  );
}

export default function HeroDemo() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [score, setScore] = useState(34);
  const [kwCount, setKwCount] = useState(0);
  const [bulletIdx, setBulletIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scoreRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function clear() {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (scoreRef.current) clearInterval(scoreRef.current);
  }

  function runCycle() {
    clear();
    setPhase('idle');
    setScore(34);
    setKwCount(0);
    setBulletIdx(0);

    timerRef.current = setTimeout(() => {
      setPhase('scanning');
      JD_KEYWORDS.forEach((_, i) =>
        setTimeout(() => setKwCount(c => c + 1), 400 + i * 280)
      );

      timerRef.current = setTimeout(() => {
        setPhase('transforming');
        // score count-up
        let n = 34;
        scoreRef.current = setInterval(() => {
          n = Math.min(n + 3, 91);
          setScore(n);
          if (n >= 91) {
            clearInterval(scoreRef.current!);
            scoreRef.current = null;
          }
        }, 28);
        // bullets appear
        AFTER_BULLETS.forEach((_, i) =>
          setTimeout(() => setBulletIdx(b => b + 1), i * 420 + 200)
        );
        // done phase
        timerRef.current = setTimeout(() => {
          setPhase('done');
          // loop
          timerRef.current = setTimeout(runCycle, 3200);
        }, 2200);
      }, 2400);
    }, 800);
  }

  useEffect(() => {
    runCycle();
    return clear;
  }, []); // eslint-disable-line

  const isScanning    = phase === 'scanning';
  const isTransformed = phase === 'transforming' || phase === 'done';

  return (
    <div className="relative max-w-4xl mx-auto rounded-2xl overflow-hidden"
      style={{
        background: '#080f1e',
        border: '1px solid rgba(255,255,255,0.09)',
        boxShadow: '0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.08)',
      }}>

      {/* Window chrome */}
      <div className="flex items-center justify-between px-4 py-2.5"
        style={{ background: '#0a1223', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#ff5f57' }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#ffbd2e' }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#28c840' }} />
        </div>
        <div className="flex items-center gap-2">
          {isScanning && (
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-purple-300 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              AI SCANNING JD KEYWORDS
            </span>
          )}
          {isTransformed && (
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-300">
              <CheckCircle className="w-3 h-3 text-green-400" />
              OPTIMIZED · ATS-READY
            </span>
          )}
          {!isScanning && !isTransformed && (
            <span className="text-[10px] text-slate-600">resume.pdf</span>
          )}
        </div>
        <span className="text-[10px] font-mono text-slate-600">hirewin.app</span>
      </div>

      {/* Main panels */}
      <div className="grid sm:grid-cols-2 relative">

        {/* ─── LEFT: Before ─── */}
        <div className="relative p-4 sm:p-5"
          style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}>

          {/* Scan line */}
          {isScanning && <div className="scan-line" />}

          {/* Dim overlay on before when transformed */}
          <div className="absolute inset-0 pointer-events-none transition-all duration-700"
            style={{ background: isTransformed ? 'rgba(0,0,0,0.25)' : 'transparent' }} />

          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-slate-700 mb-1">Original Resume</div>
              <div className="text-sm font-semibold text-white">Arjun Sharma</div>
              <div className="text-[11px] text-slate-500">SE · Wipro Technologies · 3 yrs</div>
            </div>
            <ScoreRing score={34} />
          </div>

          {/* Keywords found during scan */}
          {isScanning && kwCount > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {JD_KEYWORDS.slice(0, kwCount).map(kw => (
                <span key={kw} className="keyword-pop text-[9px] px-1.5 py-0.5 rounded font-bold"
                  style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }}>
                  ✓ {kw}
                </span>
              ))}
            </div>
          )}

          <div className="space-y-1.5">
            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-700 mb-2">Experience</div>
            {BEFORE_BULLETS.map((b, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[11px] leading-relaxed transition-all duration-500"
                style={{
                  color: isTransformed ? '#374151' : '#64748b',
                  opacity: isTransformed ? 0.45 : 1,
                  textDecoration: isTransformed ? 'line-through' : 'none',
                  transitionDelay: `${i * 80}ms`,
                }}>
                <span className="text-[8px] mt-0.5 shrink-0">•</span>
                {b}
              </div>
            ))}
            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-700 mt-3 mb-1">Skills</div>
            <div className="text-[11px] transition-all duration-500"
              style={{ color: isTransformed ? '#374151' : '#64748b', opacity: isTransformed ? 0.4 : 1 }}>
              Java, MySQL, HTML, CSS
            </div>
          </div>
        </div>

        {/* ─── RIGHT: After ─── */}
        <div className="relative p-4 sm:p-5 transition-all duration-700"
          style={{ background: isTransformed ? 'rgba(74,222,128,0.025)' : 'transparent' }}>

          {/* Green top accent */}
          {isTransformed && (
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: 'linear-gradient(90deg,transparent,rgba(74,222,128,0.6),transparent)' }} />
          )}

          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-[9px] font-bold uppercase tracking-widest mb-1 transition-colors duration-500"
                style={{ color: isTransformed ? '#4ade80' : '#1e293b' }}>
                HireWin Optimized
              </div>
              <div className="text-sm font-semibold text-white">Arjun Sharma</div>
              <div className="text-[11px] text-slate-500">SE · Wipro Technologies · 3 yrs</div>
            </div>
            <ScoreRing score={score} />
          </div>

          <div className="space-y-1.5">
            <div className="text-[9px] font-bold uppercase tracking-widest mb-2 transition-colors duration-500"
              style={{ color: isTransformed ? '#4ade80' : '#1e293b' }}>
              Experience
            </div>
            {AFTER_BULLETS.map((b, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[11px] leading-relaxed transition-all duration-500"
                style={{
                  color: '#a7f3d0',
                  opacity: i < bulletIdx ? 1 : 0,
                  transform: i < bulletIdx ? 'none' : 'translateY(6px)',
                  transitionDelay: `${i * 40}ms`,
                }}>
                <span className="text-green-400 text-[8px] mt-0.5 shrink-0 font-bold">↑</span>
                {b}
              </div>
            ))}
            <div className="text-[9px] font-bold uppercase tracking-widest mt-3 mb-1 transition-colors duration-500"
              style={{ color: isTransformed ? '#4ade80' : '#1e293b' }}>
              Skills
            </div>
            <div className="flex flex-wrap gap-1 transition-all duration-500"
              style={{ opacity: bulletIdx >= AFTER_BULLETS.length ? 1 : 0, transform: bulletIdx >= AFTER_BULLETS.length ? 'none' : 'translateY(4px)' }}>
              {['Java', 'Spring Boot', 'AWS', 'Docker', 'REST API', 'CI/CD'].map((s, i) => (
                <span key={s} className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                  style={{
                    background: 'rgba(74,222,128,0.12)',
                    border: '1px solid rgba(74,222,128,0.2)',
                    color: '#4ade80',
                    transitionDelay: `${i * 60}ms`,
                  }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Center AI badge (desktop) ─── */}
        {isTransformed && (
          <div className="absolute hidden sm:flex items-center justify-center left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
            <div className="w-10 h-10 rounded-full flex items-center justify-center animate-glow-pulse"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#3b82f6)', boxShadow: '0 0 24px rgba(124,58,237,0.7), 0 0 8px rgba(124,58,237,0.5)' }}>
              <Zap className="w-4 h-4 text-white" />
            </div>
          </div>
        )}
      </div>

      {/* ─── Bottom metrics bar ─── */}
      <div className="flex items-center gap-4 sm:gap-8 px-4 py-2.5 flex-wrap"
        style={{ background: '#0a1223', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-1.5 text-[10px]">
          <Target className="w-3 h-3 text-purple-400 shrink-0" />
          <span className="text-slate-500">ATS Score</span>
          <span className="font-bold ml-1 transition-colors duration-500"
            style={{ color: score >= 70 ? '#4ade80' : '#ef4444' }}>{score}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px]">
          <TrendingUp className="w-3 h-3 text-blue-400 shrink-0" />
          <span className="text-slate-500">Keywords injected</span>
          <span className="font-bold text-blue-400 ml-1">+{isTransformed ? 11 : 0}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px]">
          <Zap className="w-3 h-3 text-yellow-400 shrink-0" />
          <span className="text-slate-500">Processing</span>
          <span className="font-bold text-yellow-400 ml-1">
            {isScanning ? 'Scanning…' : isTransformed ? '⚡ 28 sec' : 'Ready'}
          </span>
        </div>
        <div className="ml-auto text-[10px] text-slate-700 hidden sm:block">
          Illustrative example · Results vary
        </div>
      </div>
    </div>
  );
}
