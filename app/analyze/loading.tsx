/* Analyze page loading skeleton — shows immediately while the
   26KB page chunk is downloading. Matches the real layout so
   there's no layout shift when hydration completes. */

export default function AnalyzeLoading() {
  const cardStyle = { background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' };
  const shimmer = { background: 'rgba(255,255,255,0.04)' };

  return (
    <div className="min-h-screen" style={{ background: '#080d1a' }}>
      {/* Nav */}
      <div className="border-b border-white/[0.06] h-14 flex items-center px-4">
        <div className="w-24 h-5 rounded animate-pulse" style={shimmer} />
        <div className="ml-auto flex gap-3">
          <div className="w-14 h-7 rounded-lg animate-pulse" style={shimmer} />
          <div className="w-20 h-7 rounded-lg animate-pulse" style={{ background: 'rgba(124,58,237,0.15)' }} />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero skeleton */}
        <div className="text-center mb-8 space-y-3">
          <div className="w-40 h-6 rounded-full mx-auto animate-pulse" style={{ background: 'rgba(124,58,237,0.12)' }} />
          <div className="w-96 max-w-full h-10 rounded-xl mx-auto animate-pulse" style={shimmer} />
          <div className="w-80 max-w-full h-4 rounded-lg mx-auto animate-pulse" style={shimmer} />
        </div>

        {/* Two-panel skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
            <div className="w-32 h-5 rounded animate-pulse" style={shimmer} />
            <div className="flex gap-2">
              <div className="flex-1 h-9 rounded-lg animate-pulse" style={{ background: 'rgba(124,58,237,0.15)' }} />
              <div className="flex-1 h-9 rounded-lg animate-pulse" style={shimmer} />
            </div>
            <div className="h-40 rounded-xl animate-pulse" style={{ border: '2px dashed rgba(255,255,255,0.08)', ...shimmer }} />
          </div>
          <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
            <div className="w-40 h-5 rounded animate-pulse" style={shimmer} />
            <div className="flex gap-2">
              <div className="flex-1 h-9 rounded-lg animate-pulse" style={{ background: 'rgba(124,58,237,0.15)' }} />
              <div className="flex-1 h-9 rounded-lg animate-pulse" style={shimmer} />
            </div>
            <div className="h-40 rounded-xl animate-pulse" style={shimmer} />
          </div>
        </div>

        {/* Button skeleton */}
        <div className="mt-6 h-14 rounded-xl animate-pulse" style={{ background: 'rgba(124,58,237,0.15)' }} />
      </div>
    </div>
  );
}
