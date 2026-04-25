'use client';

import type { SkillGap } from '@/types';

const importanceConfig = {
  Critical: {
    dot: 'bg-red-400',
    badge: 'text-red-400',
    badgeBg: 'rgba(248,113,113,0.1)',
    badgeBorder: 'rgba(248,113,113,0.2)',
  },
  High: {
    dot: 'bg-orange-400',
    badge: 'text-orange-400',
    badgeBg: 'rgba(251,146,60,0.1)',
    badgeBorder: 'rgba(251,146,60,0.2)',
  },
  Medium: {
    dot: 'bg-yellow-400',
    badge: 'text-yellow-400',
    badgeBg: 'rgba(250,204,21,0.1)',
    badgeBorder: 'rgba(250,204,21,0.2)',
  },
};

type Props = { gaps: SkillGap[] };

export default function SkillGapList({ gaps }: Props) {
  if (!gaps.length) return null;

  return (
    <div className="rounded-2xl p-6"
      style={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' }}>
      <h3 className="font-semibold text-white mb-4">Skill Gaps</h3>
      <div className="space-y-3">
        {gaps.map((gap, i) => {
          const cfg = importanceConfig[gap.importance];
          return (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${cfg.dot}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-medium text-sm text-slate-200">{gap.skill}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}
                    style={{ background: cfg.badgeBg, border: `1px solid ${cfg.badgeBorder}` }}>
                    {gap.importance}
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
