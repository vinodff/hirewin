'use client';

type Props = {
  score: number;
  label: string;
  sublabel?: string;
  color?: 'blue' | 'emerald';
};

export default function AtsGauge({ score, label, sublabel, color = 'blue' }: Props) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped / 100);

  const strokeColor = color === 'emerald' ? '#10b981' : '#7c3aed';
  const textColor = color === 'emerald' ? 'text-emerald-400' : 'text-purple-400';

  const rating = clamped >= 80 ? 'Excellent' : clamped >= 60 ? 'Good' : clamped >= 40 ? 'Fair' : 'Needs work';
  const ratingColor = clamped >= 80 ? 'text-green-400' : clamped >= 60 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="rounded-2xl p-6 flex items-center gap-6"
      style={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="relative shrink-0">
        <svg width="128" height="128" className="-rotate-90">
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="10"
          />
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold ${textColor}`}>{clamped}</span>
          <span className="text-xs text-slate-600">/ 100</span>
        </div>
      </div>

      <div>
        <div className="font-semibold text-white mb-1">{label}</div>
        {sublabel && <div className="text-xs text-slate-500 mb-3">{sublabel}</div>}
        <span className={`text-sm font-medium ${ratingColor}`}>{rating}</span>
      </div>
    </div>
  );
}
