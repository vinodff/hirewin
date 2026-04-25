'use client';

import { useState } from 'react';
import { Check, Zap } from 'lucide-react';
import AppNav from '@/components/app-nav';

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
    price: { monthly: '₹49', yearly: '₹49' },
    period: { monthly: 'one-time', yearly: 'one-time' },
    badge: 'No subscription',
    cta: 'Buy ₹49',
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
    price: { monthly: '₹166', yearly: '₹1,990' },
    period: { monthly: '/mo', yearly: '/yr' },
    badge: 'Most Popular',
    cta: 'Subscribe — Yearly',
    ctaHref: null,
    highlight: true,
    yearlyNote: '₹1,990/yr charged annually',
    features: [
      '20 resume improvements / month',
      'Unlimited PDF + DOCX downloads',
      '5 cover letters / month',
      'Skills learning roadmap (lifetime)',
      'Build up to 20 resumes from scratch',
      'AI resume builder (improve bullets, write summary)',
      'Import resume via AI',
      'Optimization history (3-month retention)',
      'Priority support',
    ],
  },
  {
    id: 'power',
    name: 'Power',
    price: { monthly: '₹332', yearly: '₹3,990' },
    period: { monthly: '/mo', yearly: '/yr' },
    cta: 'Subscribe — Yearly',
    ctaHref: null,
    highlight: false,
    yearlyNote: '₹3,990/yr charged annually',
    features: [
      '80 resume improvements / month',
      'Unlimited PDF + DOCX downloads',
      '15 cover letters / month',
      '60 skill roadmaps / month',
      'Build unlimited resumes from scratch',
      'AI resume builder (improve bullets, write summary)',
      'Import resume via AI',
      'Edit resume & cover letter before downloading',
      'Edits saved to history — reset anytime',
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
  'AI resume builder (improve bullets, write summary)',
  'Shared wallet — top up anytime',
  'Add & manage team members',
  'Host dashboard with activity log',
  'Unlimited downloads & generations',
];

const faqs = [
  {
    q: 'Can I see my results before paying?',
    a: 'Yes — the full ATS analysis, keyword matching, and resume preview are always free. You only need to pay to download the PDF or DOCX file.',
  },
  {
    q: 'What is the Starter plan?',
    a: '₹49 is a one-time purchase that gives you 1 download credit. No subscription, no recurring charges. Perfect if you only need it once.',
  },
  {
    q: 'What counts as a "skill roadmap"?',
    a: 'Each skill you select and generate a learning plan for counts as 1 roadmap. Pro users get 15 per month, Power users get 60 per month. These reset at the start of each billing cycle.',
  },
  {
    q: 'What is the Optimization History?',
    a: 'Pro and Power users can revisit all past optimizations — including the full resume preview, ATS keywords, score breakdown, and any skill roadmaps generated — from the history page.',
  },
  {
    q: 'Can I edit my resume or cover letter after the AI generates it?',
    a: 'Yes — Pro and Power wallet users can edit the resume and cover letter directly in the browser before downloading. Changes are saved to your history automatically and you can reset back to the original AI version at any time.',
  },
  {
    q: 'What is the difference between monthly and yearly plans?',
    a: 'Same features, different billing. Yearly plans are charged once a year and work out to 2 months free compared to paying monthly. You can cancel anytime — access continues until the end of the paid period.',
  },
  {
    q: 'Can I cancel my subscription?',
    a: 'Yes, anytime. Your plan stays active until the end of the billing period (monthly or annual), then you return to the free tier. No pro-rated refunds for unused time.',
  },
  {
    q: 'Is Razorpay secure?',
    a: 'Yes. Razorpay is PCI-DSS compliant. We never store your card details.',
  },
];

const cardStyle = { background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' };

export default function PricingPage() {
  const [yearly, setYearly] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  async function handlePurchase(planId: string) {
    try {
      const res = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, isYearly: yearly }),
      });

      if (res.status === 503) {
        alert('Payments coming soon! Check back shortly.');
        return;
      }
      if (res.status === 401) {
        window.location.href = '/auth/login';
        return;
      }

      const { orderId, amount, currency, keyId, error: err } = await res.json();
      if (err) { alert(err); return; }

      const openCheckout = () => {
        // @ts-expect-error Razorpay global
        const rzp = new window.Razorpay({
          key: keyId,
          amount,
          currency,
          name: 'HireWin',
          description: `${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan`,
          order_id: orderId,
          handler: async (response: Record<string, string>) => {
            const verifyRes = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(response),
            });
            const data = await verifyRes.json();
            if (data.ok) {
              alert(`Payment successful! You're now on the ${data.plan} plan.`);
              window.location.href = '/analyze';
            } else {
              alert('Payment verification failed. Contact support.');
            }
          },
          theme: { color: '#7c3aed' },
        });
        rzp.open();
      };

      // @ts-expect-error Razorpay global
      if (typeof window.Razorpay !== 'undefined') {
        openCheckout();
      } else {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = openCheckout;
        document.head.appendChild(script);
      }
    } catch {
      alert('Something went wrong. Please try again.');
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#080d1a' }}>
      <AppNav />

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-3">
            Simple, honest pricing
          </h1>
          <p className="text-slate-400 text-base max-w-md mx-auto">
            Start free. Pay only when you want to download your resume or cover letter.
          </p>

          {/* Toggle */}
          <div className="inline-flex items-center gap-1 rounded-xl p-1.5 mt-7"
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

          <p className="text-xs text-slate-600 mt-3">Prices shown for IN</p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl p-6 flex flex-col relative ${plan.highlight ? 'glow-sm' : ''}`}
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
              <div className="mb-5">
                <div className="text-sm font-semibold text-slate-400 mb-1 uppercase tracking-wide">{plan.name}</div>
                <div className="flex items-end gap-1">
                  <span className={`text-3xl font-extrabold ${plan.highlight ? 'gradient-text' : 'text-white'}`}>
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
              <ul className="space-y-2.5 flex-1 mb-6">
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
                  className={`block text-center py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 ${plan.highlight ? 'text-white' : 'text-slate-300'}`}
                  style={plan.highlight
                    ? { background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }
                    : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  {plan.cta}
                </a>
              ) : (
                <button
                  onClick={() => handlePurchase(plan.id)}
                  className={`py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 ${plan.highlight ? 'text-white' : 'text-slate-300'}`}
                  style={plan.highlight
                    ? { background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }
                    : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  {plan.cta}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Team plan */}
        <div className="rounded-2xl p-6 mb-12" style={cardStyle}>
          <div className="flex flex-col sm:flex-row sm:items-start gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-yellow-400 uppercase tracking-wide">Team</span>
              </div>
              <div className="flex items-end gap-1 mb-2">
                <span className="text-3xl font-extrabold text-white">₹500</span>
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
              onClick={() => handlePurchase('team')}
              className="shrink-0 flex items-center gap-2 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all hover:opacity-90 self-start sm:self-center"
              style={{ background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.3)', color: '#fbbf24' }}
            >
              <Zap className="w-4 h-4" />
              Create a Team →
            </button>
          </div>
        </div>

        {/* FAQs */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-white text-center mb-6">Common questions</h2>
          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="rounded-xl overflow-hidden"
                style={cardStyle}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="text-sm font-medium text-white">{faq.q}</span>
                  <span className="text-slate-500 shrink-0 text-lg leading-none">
                    {openFaq === i ? '−' : '+'}
                  </span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-slate-400 leading-relaxed border-t border-white/[0.05] pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-slate-600 mt-8">
            Powered by Razorpay · Secure payments · Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}
