'use client';

import { AlertTriangle, Info, AlertCircle } from 'lucide-react';
import type { SkillGap } from '@/types';

const IMPORTANCE_CFG = {
  Critical: {
    icon: AlertCircle,
    color: '#f87171',
    bg:   'rgba(248,113,113,0.08)',
    border:'rgba(248,113,113,0.18)',
    badgeBg:'rgba(248,113,113,0.12)',
    label: 'Critical',
    dot:  '#ef4444',
    barColor: '#ef4444',
  },
  High: {
    icon: AlertTriangle,
    color: '#fb923c',
    bg:   'rgba(251,146,60,0.08)',
    border:'rgba(251,146,60,0.18)',
    badgeBg:'rgba(251,146,60,0.12)',
    label: 'High Impact',
    dot:  '#f97316',
    barColor: '#f97316',
  },
  Medium: {
    icon: Info,
    color: '#fbbf24',
    bg:   'rgba(251,191,36,0.08)',
    border:'rgba(251,191,36,0.18)',
    badgeBg:'rgba(251,191,36,0.12)',
    label: 'Medium',
    dot:  '#f59e0b',
    barColor: '#f59e0b',
  },
};

type Props = { gaps: SkillGap[] };

export default function SkillGapList({ gaps }: Props) {
  if (!gaps.length) return null;

  const critical = gaps.filter(g => g.importance === 'Critical');
  const high     = gaps.filter(g => g.importance === 'High');
  const medium   = gaps.filter(g => g.importance === 'Medium');

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: '#0c1220', border: '1px solid rgba(255,255,255,0.07)' }}>

      {/* Header */}
      <div className="px-5 sm:px-6 py-4 flex items-center justify-between border-b"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div>
          <h3 className="font-semibold text-white text-sm sm:text-base">Skill Gaps</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {gaps.length} gaps identified · address these to strengthen your application
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {critical.length > 0 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: IMPORTANCE_CFG.Critical.badgeBg, color: IMPORTANCE_CFG.Critical.color,
                border: `1px solid ${IMPORTANCE_CFG.Critical.border}` }}>
              {critical.length} Critical
            </span>
          )}
          {high.length > 0 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: IMPORTANCE_CFG.High.badgeBg, color: IMPORTANCE_CFG.High.color,
                border: `1px solid ${IMPORTANCE_CFG.High.border}` }}>
              {high.length} High
            </span>
          )}
          {medium.length > 0 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: IMPORTANCE_CFG.Medium.badgeBg, color: IMPORTANCE_CFG.Medium.color,
                border: `1px solid ${IMPORTANCE_CFG.Medium.border}` }}>
              {medium.length} Medium
            </span>
          )}
        </div>
      </div>

      {/* Gaps list */}
      <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        {gaps.map((gap, i) => {
          const cfg = IMPORTANCE_CFG[gap.importance];
          const Icon = cfg.icon;
          return (
            <div key={i} className="px-5 sm:px-6 py-4 flex gap-3 items-start transition-colors hover:bg-white/[0.015]">
              {/* Icon */}
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                <Icon className="w-4 h-4" style={{ color: cfg.color }} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-semibold text-sm text-white">{gap.skill}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: cfg.badgeBg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                    {cfg.label}
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{gap.reason}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
