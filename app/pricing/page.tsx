'use client';

import { useState } from 'react';
import { Check, Zap, X, Shield, Clock, Lock } from 'lucide-react';
import AppNav from '@/components/app-nav';

/* ── plan data ── */
const plans = [
  {
    id: 'free',
    name: 'Free',
    price: { monthly: '₹0', yearly: '₹0' },
    period: { monthly: '/month', yearly: '/year' },
    cta: 'Get Started Free',
    ctaHref: '/analyze',
    highlight: false,
    features: [
      '2 resume improvements / month',
      '1 cover letter (lifetime)',
      '1 skill roadmap / month',
      'Build up to 3 resumes from scratch',
      'Optimization history (1-month retention)',
      'Live ATS keyword analysis',
      'Full resume preview',
      'Copy to clipboard',
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: { monthly: '₹99', yearly: '₹99' },
    period: { monthly: 'one-time', yearly: 'one-time' },
    badge: 'No subscription',
    cta: 'Buy ₹99',
    ctaHref: null,
    highlight: false,
    features: [
      'Everything in Free',
      '1 resume download (PDF + DOCX)',
      '1 cover letter download (PDF + DOCX)',
      'No subscription needed',
      'No watermark',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: { monthly: '₹199', yearly: '₹1,990' },
    period: { monthly: '/mo', yearly: '/yr' },
    badge: 'Most Popular',
    cta: 'Subscribe',
    ctaHref: null,
    highlight: true,
    yearlyNote: '₹1,990/yr charged annually · 2 months free',
    features: [
      '20 resume improvements / month',
      'Unlimited PDF + DOCX downloads',
      '5 cover letters / month',
      'Skills learning roadmap (15/month)',
      'Build up to 20 resumes from scratch',
      'AI resume builder',
      'Import resume via AI',
      'Optimization history (3-month retention)',
      'Priority support',
    ],
  },
  {
    id: 'power',
    name: 'Power',
    price: { monthly: '₹399', yearly: '₹3,990' },
    period: { monthly: '/mo', yearly: '/yr' },
    cta: 'Subscribe',
    ctaHref: null,
    highlight: false,
    yearlyNote: '₹3,990/yr charged annually · 2 months free',
    features: [
      '80 resume improvements / month',
      'Unlimited PDF + DOCX downloads',
      '15 cover letters / month',
      '60 skill roadmaps / month',
      'Build unlimited resumes from scratch',
      'AI resume builder',
      'Import resume via AI',
      'Edit resume & cover letter before download',
      'Optimization history (6-month retention)',
      'Priority support',
    ],
  },
];

const teamFeatures = [
  'Pay per use — no monthly lock-in',
  'Non-expiring balance',
  'Full per-member usage tracking',
  'Build unlimited resumes from scratch',
  'AI resume builder',
  'Shared wallet — top up anytime',
  'Add & manage team members',
  'Host dashboard with activity log',
  'Unlimited downloads & generations',
];

const faqs = [
  { q: 'Can I see my results before paying?', a: 'Yes — the full ATS analysis, keyword matching, and resume preview are always free. You only pay to download the PDF or DOCX file.' },
  { q: 'What is the Starter plan?', a: '₹99 is a one-time purchase that gives you 1 resume download and 1 cover letter download. No subscription, no recurring charges. Perfect if you only need it once.' },
  { q: 'Is my payment secure?', a: 'Yes. Payments are processed by Razorpay — PCI-DSS compliant. We never store your card details. Your data is encrypted end-to-end.' },
  { q: 'What counts as a "skill roadmap"?', a: 'Each skill you select and generate a learning plan for counts as 1 roadmap. Pro users get 15 per month, Power users get 60 per month.' },
  { q: 'Can I cancel my subscription?', a: 'Yes, anytime. Your plan stays active until the end of the billing period, then you return to the free tier. No pro-rated refunds for unused time.' },
  { q: 'What is the difference between monthly and yearly?', a: 'Same features, different billing. Yearly plans work out to 2 months free compared to paying monthly.' },
];

const cardStyle = { background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' };

/* ── Checkout confirmation modal ── */
function CheckoutModal({
  plan,
  isYearly,
  onConfirm,
  onClose,
  loading,
}: {
  plan: typeof plans[number];
  isYearly: boolean;
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
}) {
  const price  = isYearly ? plan.price.yearly  : plan.price.monthly;
  const period = isYearly ? plan.period.yearly : plan.period.monthly;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 animate-slide-up-sm"
        style={{
          background: '#0f1629',
          border: '1px solid rgba(124,58,237,0.3)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <img src="/logo.png" alt="HireWin" className="w-6 h-6 object-contain" />
              <span className="font-bold text-white">HireWin</span>
            </div>
            <h2 className="text-xl font-extrabold text-white">{plan.name} Plan</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Price */}
        <div
          className="rounded-xl p-4 mb-5 flex items-center justify-between"
          style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}
        >
          <div>
            <div className="text-xs text-slate-400 mb-0.5">You pay today</div>
            <div className="text-3xl font-extrabold gradient-text">{price}</div>
            <div className="text-xs text-slate-500">{period}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-green-400 font-semibold mb-1">⚡ Instant access</div>
            <div className="text-xs text-slate-500">After payment</div>
          </div>
        </div>

        {/* What you get */}
        <div className="mb-5">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">What you get</div>
          <ul className="space-y-2">
            {plan.features.slice(0, 5).map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap gap-2 mb-5">
          {[
            { icon: Shield, text: 'Secure payment by Razorpay' },
            { icon: Zap,    text: 'Instant access' },
            { icon: Lock,   text: 'Cancel anytime' },
          ].map(({ icon: Icon, text }) => (
            <div
              key={text}
              className="flex items-center gap-1.5 text-xs text-slate-400 px-2.5 py-1.5 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <Icon className="w-3 h-3 text-purple-400 shrink-0" />
              {text}
            </div>
          ))}
        </div>

        {/* Pay button */}
        <button
          onClick={onConfirm}
          disabled={loading}
          className="w-full py-4 rounded-xl font-bold text-white text-base transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', minHeight: '54px' }}
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Opening secure checkout…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="1" y="4" width="22" height="16" rx="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
              Pay {price} securely
            </>
          )}
        </button>

        <p className="text-center text-xs text-slate-600 mt-3">
          🔒 256-bit SSL encryption · PCI DSS compliant
        </p>
      </div>
    </div>
  );
}

/* ── Main page ── */
export default function PricingPage() {
  const [yearly, setYearly]         = useState(true);
  const [openFaq, setOpenFaq]       = useState<number | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<typeof plans[number] | null>(null);
  const [paying, setPaying]         = useState(false);

  function openCheckout(plan: typeof plans[number]) {
    setCheckoutPlan(plan);
  }

  async function handlePay() {
    if (!checkoutPlan) return;
    setPaying(true);

    try {
      const res = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: checkoutPlan.id, isYearly: yearly }),
      });

      if (res.status === 401) { window.location.href = '/auth/login'; return; }
      if (res.status === 503) {
        alert('Payments coming soon! Check back shortly.');
        setPaying(false);
        return;
      }

      const { orderId, amount, currency, keyId, userName, userEmail, error: err } = await res.json();
      if (err) { alert(err); setPaying(false); return; }

      const planName = checkoutPlan.name;

      const openRzp = () => {
        // @ts-expect-error Razorpay global
        const rzp = new window.Razorpay({
          key: keyId,
          amount,
          currency,
          name: 'HireWin',
          description: `${planName} Plan — Instant Access`,
          image: 'https://hirewin.live/logo.png',
          order_id: orderId,
          prefill: {
            name:    userName  || '',
            email:   userEmail || '',
            contact: '',
          },
          theme: { color: '#7c3aed' },
          modal: {
            ondismiss: () => setPaying(false),
          },
          handler: async (response: Record<string, string>) => {
            try {
              const verifyRes = await fetch('/api/payment/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(response),
              });
              const data = await verifyRes.json();
              if (data.ok) {
                window.location.href = `/payment/success?plan=${checkoutPlan.id}`;
              } else {
                console.error('[payment] verify failed:', data.error, 'status:', verifyRes.status);
                window.location.href = `/payment/failed?reason=${encodeURIComponent(data.error ?? 'unknown')}`;
              }
            } catch (err) {
              console.error('[payment] verify request threw:', err);
              window.location.href = '/payment/failed?reason=network';
            }
          },
        });
        rzp.open();
        setCheckoutPlan(null);
        setPaying(false);
      };

      // @ts-expect-error Razorpay global
      if (typeof window.Razorpay !== 'undefined') {
        openRzp();
      } else {
        const script = document.createElement('script');
        script.src   = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = openRzp;
        document.head.appendChild(script);
      }
    } catch {
      alert('Something went wrong. Please try again.');
      setPaying(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#080d1a' }}>
      <AppNav />

      {/* Checkout modal */}
      {checkoutPlan && (
        <CheckoutModal
          plan={checkoutPlan}
          isYearly={yearly}
          onConfirm={handlePay}
          onClose={() => { setCheckoutPlan(null); setPaying(false); }}
          loading={paying}
        />
      )}

      <div className="max-w-6xl mx-auto px-4 py-10 sm:py-12">

        {/* Header */}
        <div className="text-center mb-8 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-3">
            Simple, honest pricing
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-md mx-auto">
            Start free. Pay only when you want to download your resume or cover letter.
          </p>

          {/* Monthly / Yearly toggle */}
          <div className="inline-flex items-center gap-1 rounded-xl p-1.5 mt-6"
            style={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' }}>
            <button
              onClick={() => setYearly(false)}
              className="px-4 py-1.5 text-sm rounded-lg font-medium transition-all"
              style={!yearly
                ? { background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', color: '#fff' }
                : { color: '#94a3b8' }}
            >
              Monthly
            </button>
            <button
              onClick={() => setYearly(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-lg font-medium transition-all"
              style={yearly
                ? { background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', color: '#fff' }
                : { color: '#94a3b8' }}
            >
              Yearly
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${yearly ? 'bg-white/20 text-white' : 'bg-green-500/20 text-green-400'}`}>
                2 months free
              </span>
            </button>
          </div>

          <p className="text-xs text-slate-600 mt-2">Prices shown for IN · GST may apply</p>
        </div>

        {/* Trust strip */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mb-8 text-xs text-slate-500">
          {[
            { icon: Shield, text: 'Secure payments by Razorpay' },
            { icon: Zap,    text: 'Instant access after payment' },
            { icon: Lock,   text: 'Cancel anytime' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-1.5">
              <Icon className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              {text}
            </div>
          ))}
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl p-5 sm:p-6 flex flex-col relative ${plan.highlight ? 'glow-sm' : ''}`}
              style={plan.highlight
                ? { background: '#0f1629', border: '1px solid rgba(124,58,237,0.5)' }
                : cardStyle}
            >
              {plan.badge && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap"
                  style={plan.highlight
                    ? { background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', color: '#fff' }
                    : { background: 'rgba(255,255,255,0.08)', color: '#94a3b8' }}
                >
                  {plan.badge}
                </div>
              )}

              {/* Pricing */}
              <div className="mb-4">
                <div className="text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">{plan.name}</div>
                <div className="flex items-end gap-1">
                  <span className={`text-2xl sm:text-3xl font-extrabold ${plan.highlight ? 'gradient-text' : 'text-white'}`}>
                    {yearly ? plan.price.yearly : plan.price.monthly}
                  </span>
                  <span className="text-slate-500 text-sm mb-1">
                    {yearly ? plan.period.yearly : plan.period.monthly}
                  </span>
                </div>
                {yearly && plan.yearlyNote && (
                  <div className="text-xs text-slate-600 mt-1">{plan.yearlyNote}</div>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-2 flex-1 mb-5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-slate-400 leading-relaxed">
                    <Check className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {plan.ctaHref ? (
                <a
                  href={plan.ctaHref}
                  className="block text-center py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
                  style={plan.highlight
                    ? { background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', color: '#fff' }
                    : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1' }}
                >
                  {plan.cta}
                </a>
              ) : (
                <button
                  onClick={() => openCheckout(plan)}
                  className="py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
                  style={plan.highlight
                    ? { background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', color: '#fff' }
                    : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1' }}
                >
                  {plan.cta}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Team plan */}
        <div className="rounded-2xl p-5 sm:p-6 mb-10 sm:mb-12" style={cardStyle}>
          <div className="flex flex-col sm:flex-row sm:items-start gap-5 sm:gap-6">
            <div className="flex-1">
              <div className="text-xs font-semibold text-yellow-400 uppercase tracking-wide mb-1">Team</div>
              <div className="flex items-end gap-1 mb-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-white">₹500</span>
                <span className="text-slate-500 text-sm mb-1">min top-up</span>
              </div>
              <p className="text-xs text-slate-500">
                For companies &amp; recruiters. Shared wallet, unlimited usage, no subscription.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 flex-1">
              {teamFeatures.map((f) => (
                <div key={f} className="flex items-start gap-2 text-xs text-slate-400">
                  <Check className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                  {f}
                </div>
              ))}
            </div>
            <button
              onClick={() => openCheckout({ id: 'team', name: 'Team', price: { monthly: '₹500', yearly: '₹500' }, period: { monthly: 'min top-up', yearly: 'min top-up' }, cta: 'Create Team', ctaHref: null, highlight: false, yearlyNote: '', features: teamFeatures.slice(0, 5) })}
              className="shrink-0 flex items-center gap-2 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all hover:opacity-90 active:scale-[0.98] self-start sm:self-center"
              style={{ background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.3)', color: '#fbbf24' }}
            >
              <Zap className="w-4 h-4" />
              Create a Team →
            </button>
          </div>
        </div>

        {/* FAQs */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-bold text-white text-center mb-6">Common questions</h2>
          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-xl overflow-hidden" style={cardStyle}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-4 sm:px-5 py-4 text-left"
                >
                  <span className="text-sm font-medium text-white">{faq.q}</span>
                  <span className="text-slate-500 shrink-0 text-lg leading-none">{openFaq === i ? '−' : '+'}</span>
                </button>
                {openFaq === i && (
                  <div className="px-4 sm:px-5 pb-4 text-sm text-slate-400 leading-relaxed border-t border-white/[0.05] pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-slate-600 mt-8">
            🔒 Powered by Razorpay · PCI-DSS Compliant · Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}
