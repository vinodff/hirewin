'use client';

type Props = {
  matched: string[];
  missing: string[];
};

export default function KeywordChips({ matched, missing }: Props) {
  return (
    <div className="rounded-2xl p-6"
      style={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' }}>
      <h3 className="font-semibold text-white mb-4">Keyword Analysis</h3>
      <div className="space-y-4">
        <div>
          <div className="text-xs font-semibold text-green-400 uppercase tracking-wide mb-2">
            Matched ({matched.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {matched.length === 0 && (
              <span className="text-sm text-slate-500">None found</span>
            )}
            {matched.map((kw) => (
              <span
                key={kw}
                className="px-2.5 py-1 text-xs rounded-full font-medium text-green-400"
                style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
        <div className="pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-2">
            Missing ({missing.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {missing.length === 0 && (
              <span className="text-sm text-slate-500">None — great coverage!</span>
            )}
            {missing.map((kw) => (
              <span
                key={kw}
                className="px-2.5 py-1 text-xs rounded-full font-medium text-red-400"
                style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
