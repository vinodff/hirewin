import Link from 'next/link';

/**
 * PricingStrip — compact, verified pricing on the homepage.
 * Prices and limits are taken from app/pricing/page.tsx:
 * Free ₹0, Starter ₹29 one-time, Pro ₹199/mo, Power ₹399/mo.
 * No free-download claim and no "unlimited" claim for the Free plan.
 */
const TIERS = [
  {
    name: 'Free',
    price: '₹0',
    period: 'forever',
    lines: ['2 resume optimizations / month', 'Full resume preview', '1-month history'],
    highlight: false,
  },
  {
    name: 'Starter',
    price: '₹29',
    period: 'one-time',
    lines: ['Everything in Free', 'Downloads for that resume (PDF + DOCX)', 'No subscription'],
    highlight: false,
  },
  {
    name: 'Pro',
    price: '₹199',
    period: '/month',
    lines: ['20 optimizations / month', 'Unlimited downloads', '15 skill roadmaps / month'],
    highlight: true,
  },
];

export default function PricingStrip() {
  return (
    <section className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
      <div className="text-center mb-10">
        <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3">Simple, honest pricing.</h2>
        <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
          Start free. Pay only when you need to download or use more each month.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 sm:gap-5">
        {TIERS.map((tier) => (
          <div
            key={tier.name}
            className="rounded-2xl p-6 flex flex-col"
            style={{
              background: '#0f1629',
              border: tier.highlight
                ? '1px solid rgba(124,58,237,0.45)'
                : '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-sm font-bold text-white">{tier.name}</span>
              {tier.highlight && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md text-purple-300"
                  style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)' }}>
                  Most popular
                </span>
              )}
            </div>
            <p className="mb-4">
              <span className="text-3xl font-bold text-white">{tier.price}</span>{' '}
              <span className="text-xs text-slate-500">{tier.period}</span>
            </p>
            <ul className="space-y-2 flex-1">
              {tier.lines.map((line) => (
                <li key={line} className="text-sm text-slate-400 leading-relaxed flex gap-2">
                  <span className="text-emerald-400 shrink-0">✓</span>
                  {line}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="text-center text-sm text-slate-500 mt-6">
        Need more? <span className="text-slate-300 font-medium">Power at ₹399/month</span> — 80 optimizations and 60 roadmaps a month.
      </p>
      <div className="text-center mt-5">
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors hover:bg-white/10"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          See full pricing →
        </Link>
      </div>
      <p className="text-center text-xs text-slate-500 mt-5">Free to optimize · No credit card · 2 free optimizations/month</p>
    </section>
  );
}
