/* Pricing page loading skeleton */

export default function PricingLoading() {
  const cardStyle = { background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' };
  const shimmer = { background: 'rgba(255,255,255,0.04)' };

  return (
    <div className="min-h-screen" style={{ background: '#080d1a' }}>
      <div className="border-b border-white/[0.06] h-14 flex items-center px-4">
        <div className="w-24 h-5 rounded animate-pulse" style={shimmer} />
        <div className="ml-auto w-20 h-7 rounded-lg animate-pulse" style={{ background: 'rgba(124,58,237,0.15)' }} />
      </div>

      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12 space-y-3">
          <div className="w-72 h-10 rounded-xl mx-auto animate-pulse" style={shimmer} />
          <div className="w-56 h-5 rounded-lg mx-auto animate-pulse" style={shimmer} />
          <div className="w-52 h-10 rounded-xl mx-auto animate-pulse mt-4" style={shimmer} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl p-6 space-y-4" style={cardStyle}>
              <div className="w-16 h-4 rounded animate-pulse" style={shimmer} />
              <div className="w-20 h-8 rounded animate-pulse" style={shimmer} />
              <div className="space-y-2">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="w-full h-4 rounded animate-pulse" style={shimmer} />
                ))}
              </div>
              <div className="h-10 rounded-xl animate-pulse" style={shimmer} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
