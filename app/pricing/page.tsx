'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Zap, Shield, Loader2 } from 'lucide-react';
import AppNav from '@/components/app-nav';
import { PRICING, WRITER_PRICE_INR, LAUNCH_PRICE_ENDS, startCheckout, type PaidPlan } from '@/lib/checkout';

const endsOn = LAUNCH_PRICE_ENDS.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

type Tier = {
  id: 'free' | PaidPlan;
  name: string;
  /** The one line that tells you whether this is your plan. */
  who: string;
  price: string;
  mrp?: string;
  unit: string;
  cta: string;
  href?: string;
  badge?: string;
  highlight?: boolean;
  features: string[];
};

const TIERS: Tier[] = [
  {
    id: 'free',
    name: 'Free',
    who: 'Seeing what it does. Your score and rewritten resume, on screen.',
    price: '₹0',
    unit: 'forever',
    cta: 'Start free',
    href: '/analyze',
    features: [
      '2 resume rewrites a month',
      'ATS score + missing keywords',
      'Full preview on screen',
      'Downloads not included',
    ],
  },
  {
    id: 'starter',
    name: 'Single download',
    who: 'One job you really want. Pay for that one resume, nothing else.',
    price: `₹${PRICING.starter.price}`,
    mrp: `₹${PRICING.starter.mrp}`,
    unit: 'one-time',
    cta: `Pay ₹${PRICING.starter.price}`,
    features: [
      '1 resume download (PDF + DOCX)',
      '1 cover letter download',
      'No watermark',
      'No subscription — nothing recurring',
    ],
  },
  {
    id: 'pack3',
    name: '3-download pack',
    who: 'Applying to a few roles this week. Works out cheapest per resume.',
    price: `₹${PRICING.pack3.price}`,
    mrp: `₹${PRICING.pack3.mrp}`,
    unit: 'one-time',
    cta: `Pay ₹${PRICING.pack3.price}`,
    badge: 'Best value',
    highlight: true,
    features: [
      `3 resume downloads — ₹${Math.round(PRICING.pack3.price / PRICING.pack3.downloads)} each`,
      '3 cover letter downloads',
      'Credits never expire',
      'No subscription — nothing recurring',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    who: 'Applying every week, downloading a new resume each time.',
    price: `₹${PRICING.pro.price}`,
    unit: '/month',
    cta: 'Get Pro',
    features: [
      'Unlimited downloads',
      '20 resume rewrites a month',
      '10 job scans a month',
      'AI resume builder + import',
      'Cancel anytime',
    ],
  },
];

const FAQS = [
  { q: 'Do I have to subscribe to download once?', a: `No. ₹${PRICING.starter.price} is a one-time payment for one resume download. Nothing recurring, no card saved.` },
  { q: 'Can I see the result before paying?', a: 'Yes. The ATS score, keyword analysis and the full rewritten resume are free to read on screen. You only pay when you want the PDF or DOCX file.' },
  { q: 'Do pack credits expire?', a: `No. The ${PRICING.pack3.downloads} downloads in the ₹${PRICING.pack3.price} pack stay on your account until you use them.` },
  { q: 'How do I pay?', a: 'One tap opens UPI, card or netbanking through Cashfree. The download unlocks the moment payment succeeds.' },
  { q: 'Can I cancel Pro or Power?', a: 'Anytime, from the billing page. You keep access until the period ends, then drop back to free.' },
];

const card = { background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.07)' };

export default function PricingPage() {
  const [paying, setPaying] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  async function pay(plan: PaidPlan) {
    setPaying(plan);
    setError('');
    const err = await startCheckout(plan);
    if (err) { setError(err); setPaying(null); }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--ground)' }}>
      <AppNav />

      <div className="max-w-6xl mx-auto px-4 py-10 sm:py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
            Pay for the resume, not a subscription
          </h1>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Your ATS score, missing keywords and full rewritten resume are free to read.
            You only pay for the file — from{' '}
            <span className="text-white font-semibold">₹{PRICING.starter.price}</span>.
            A resume writer charges ₹{WRITER_PRICE_INR.toLocaleString('en-IN')}+ for the same thing.
          </p>
          <div
            className="inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}
          >
            <Zap className="w-3.5 h-3.5" />
            Launch price until {endsOn}
          </div>
        </div>

        {error && <p className="text-center text-sm text-red-400 mb-4">{error}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className="rounded-2xl p-5 flex flex-col relative"
              style={tier.highlight
                ? { background: 'var(--surface)', border: '1px solid rgba(var(--accent-rgb), 0.5)' }
                : card}
            >
              {tier.badge && (
                <div
                  className="absolute -top-2.5 left-5 text-[10px] font-bold px-2 py-0.5 rounded-full btn-accent"
                  style={tier.highlight
                    ? { background: 'var(--accent-fill)', color: 'var(--on-accent)' }
                    : { background: 'rgba(var(--signal-rgb), 0.15)', color: 'var(--signal)', border: '1px solid rgba(var(--signal-rgb), 0.3)' }}
                >
                  {tier.badge}
                </div>
              )}

              <div className="text-sm font-bold text-white mb-1 mt-1">{tier.name}</div>
              <p className="text-[11px] text-slate-500 leading-relaxed mb-4 min-h-[44px]">{tier.who}</p>

              <div className="flex items-baseline gap-1.5 mb-4">
                <span className={`text-3xl font-extrabold ${tier.highlight ? 'gradient-text' : 'text-white'}`}>
                  {tier.price}
                </span>
                {tier.mrp && <span className="text-sm text-slate-600 line-through">{tier.mrp}</span>}
                <span className="text-slate-500 text-xs">{tier.unit}</span>
              </div>

              <ul className="space-y-2 flex-1 mb-5">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-slate-400 leading-relaxed">
                    <Check className="w-3.5 h-3.5 text-[var(--signal)] shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              {tier.href ? (
                <Link
                  href={tier.href}
                  className="block text-center py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1' }}
                >
                  {tier.cta}
                </Link>
              ) : (
                <button
                  onClick={() => pay(tier.id as PaidPlan)}
                  disabled={paying !== null}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
                  style={tier.highlight || tier.id === 'starter'
                    ? { background: 'var(--accent-fill)', color: 'var(--on-accent)' }
                    : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1' }}
                >
                  {paying === tier.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {paying === tier.id ? 'Opening…' : tier.cta}
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 mb-12 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-accent-400" /> UPI, card &amp; netbanking via Cashfree</span>
          <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-accent-400" /> Download unlocks instantly</span>
        </div>

        {/* Power + Team — kept out of the main grid to avoid choice overload */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
          <div className="rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4" style={card}>
            <div className="flex-1">
              <div className="text-sm font-bold text-white mb-1">Power — ₹{PRICING.power.price}/mo</div>
              <p className="text-xs text-slate-500">
                80 rewrites, 25 job scans, edit before download, 6-month history.
              </p>
            </div>
            <button
              onClick={() => pay('power')}
              disabled={paying !== null}
              className="shrink-0 px-5 py-2.5 rounded-xl text-sm font-semibold self-start sm:self-auto disabled:opacity-60"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1' }}
            >
              {paying === 'power' ? 'Opening…' : 'Get Power'}
            </button>
          </div>

          <div className="rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4" style={card}>
            <div className="flex-1">
              <div className="text-sm font-bold text-white mb-1">Team</div>
              <p className="text-xs text-slate-500">
                Recruiters and campus teams — shared wallet from ₹500, metered per use, per-member tracking.
              </p>
            </div>
            <a
              href="mailto:support@hirewin.live?subject=HireWin%20Team%20Plan"
              className="shrink-0 px-5 py-2.5 rounded-xl text-sm font-semibold self-start sm:self-auto"
              style={{ background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.3)', color: '#fbbf24' }}
            >
              Talk to us →
            </a>
          </div>
        </div>

        {/* FAQs */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-white text-center mb-5">Questions</h2>
          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <div key={faq.q} className="rounded-xl overflow-hidden" style={card}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-4 py-3.5 text-left"
                >
                  <span className="text-sm font-medium text-white">{faq.q}</span>
                  <span className="text-slate-500 shrink-0 text-lg leading-none">{openFaq === i ? '−' : '+'}</span>
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4 text-sm text-slate-400 leading-relaxed">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-slate-600 mt-8">
            All prices in INR, inclusive of taxes · <Link href="/refund" className="underline hover:text-slate-400">Refund policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
