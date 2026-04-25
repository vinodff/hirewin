/* Root loading skeleton — shown instantly during route transitions
   while the page chunk is downloading + executing. This eliminates
   the blank-screen feel between navigations. */

export default function Loading() {
  return (
    <div className="min-h-screen" style={{ background: '#080d1a' }}>
      {/* Nav skeleton */}
      <div className="border-b border-white/[0.06] h-16 flex items-center px-6">
        <div className="w-24 h-6 rounded-md animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="ml-auto flex gap-3">
          <div className="w-16 h-8 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="w-20 h-8 rounded-lg animate-pulse" style={{ background: 'rgba(124,58,237,0.2)' }} />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center space-y-4">
          <div className="w-48 h-6 rounded-full mx-auto animate-pulse" style={{ background: 'rgba(124,58,237,0.12)' }} />
          <div className="w-[500px] max-w-full h-12 rounded-xl mx-auto animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
          <div className="w-[400px] max-w-full h-5 rounded-lg mx-auto animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
        </div>
      </div>
    </div>
  );
}
