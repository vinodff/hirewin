'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Shield, Zap, Lock, ShoppingCart, ArrowLeft, Trash2 } from 'lucide-react';
import AppNav from '@/components/app-nav';
import Footer from '@/components/footer';

const cardStyle = { background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' };

/* ── Buyable products (prices match lib/usage.ts PLAN_PRICES) ── */
type CartPlan = {
  id: 'starter' | 'pro' | 'power';
  name: string;
  tagline: string;
  oneTime?: boolean;            // starter is a one-time purchase
  price: { monthly: number; yearly: number }; // INR rupees
  features: string[];
};

const PRODUCTS: Record<CartPlan['id'], CartPlan> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    tagline: 'One-time purchase · no subscription',
    oneTime: true,
    price: { monthly: 99, yearly: 99 },
    features: [
      '1 resume download (PDF + DOCX)',
      '1 cover letter download (PDF + DOCX)',
      'No watermark',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    tagline: 'For active job seekers',
    price: { monthly: 199, yearly: 1990 },
    features: [
      '20 resume improvements / month',
      'Unlimited PDF + DOCX downloads',
      '5 cover letters / month',
      'AI resume builder + import',
    ],
  },
  power: {
    id: 'power',
    name: 'Power',
    tagline: 'For power users & switchers',
    price: { monthly: 399, yearly: 3990 },
    features: [
      '80 resume improvements / month',
      'Unlimited PDF + DOCX downloads',
      '15 cover letters / month',
      'Edit before download · 6-month history',
    ],
  },
};

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

function isValidPlan(p: string | null): p is CartPlan['id'] {
  return p === 'starter' || p === 'pro' || p === 'power';
}

export default function CartPage() {
  const [planId, setPlanId] = useState<CartPlan['id'] | null>(null);
  const [yearly, setYearly] = useState(true);
  const [removed, setRemoved] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  // Read selection from the URL on the client (avoids useSearchParams Suspense).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get('plan');
    if (isValidPlan(p)) setPlanId(p);
    setYearly(params.get('yearly') !== 'false'); // default to yearly
  }, []);

  const plan = planId ? PRODUCTS[planId] : null;
  const billable = plan?.oneTime ? false : yearly; // starter has no billing cycle
  const amount = plan ? (billable ? plan.price.yearly : plan.price.monthly) : 0;
  const periodLabel = plan?.oneTime ? 'one-time' : billable ? '/year' : '/month';

  async function handlePay() {
    if (!plan) return;
    setPaying(true);
    setError('');
    try {
      const res = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: plan.id, isYearly: billable }),
      });

      if (res.status === 401) { window.location.href = `/auth/login?next=/cart?plan=${plan.id}&yearly=${billable}`; return; }
      if (res.status === 503) { setError('Payments are coming soon. Please check back shortly.'); setPaying(false); return; }

      const data = await res.json();
      if (data.error) { setError(data.error); setPaying(false); return; }

      const { key, txnid, amount: amt, productinfo, firstname, email, udf1, hash, surl, furl, payuUrl } = data;

      // PayU requires a full-page redirect POST.
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = payuUrl;
      const fields: Record<string, string> = {
        key, txnid, amount: amt, productinfo, firstname, email,
        udf1, hash, surl, furl, service_provider: 'payu_paisa', phone: '',
      };
      for (const [name, value] of Object.entries(fields)) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
      }
      document.body.appendChild(form);
      form.submit();
      // Keep the spinner — the browser is navigating to PayU.
    } catch {
      setError('Something went wrong. Please try again.');
      setPaying(false);
    }
  }

  const isEmpty = !plan || removed;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#080d1a' }}>
      <AppNav />

      <div className="flex-1 max-w-5xl mx-auto px-4 py-10 w-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)' }}>
            <ShoppingCart className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">Your Cart</h1>
            <p className="text-xs text-slate-500">Review your order and check out securely</p>
          </div>
        </div>

        {isEmpty ? (
          /* ── Empty state ── */
          <div className="rounded-2xl p-12 text-center" style={cardStyle}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
              <ShoppingCart className="w-6 h-6 text-purple-400" />
            </div>
            <h2 className="font-bold text-white text-lg mb-2">Your cart is empty</h2>
            <p className="text-sm text-slate-500 mb-6 max-w-xs mx-auto">
              Pick a plan to get started — pay only when you want to download your resume.
            </p>
            <Link href="/pricing"
              className="inline-flex items-center gap-2 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#3b82f6)' }}>
              View Plans
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
            {/* ── Cart item ── */}
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-2xl p-5 sm:p-6" style={cardStyle}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: 'linear-gradient(135deg,#7c3aed,#3b82f6)' }}>
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-white">HireWin {plan!.name} Plan</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{plan!.tagline}</p>
                      <ul className="mt-3 space-y-1.5">
                        {plan!.features.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-xs text-slate-400">
                            <Check className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-extrabold text-white">{inr(amount)}</div>
                    <div className="text-[11px] text-slate-500">{periodLabel}</div>
                    <button
                      onClick={() => setRemoved(true)}
                      className="mt-3 inline-flex items-center gap-1 text-[11px] text-slate-600 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> Remove
                    </button>
                  </div>
                </div>

                {/* Billing cycle toggle (subscriptions only) */}
                {!plan!.oneTime && (
                  <div className="mt-5 pt-5 border-t border-white/[0.06]">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Billing cycle</div>
                    <div className="inline-flex items-center gap-1 rounded-xl p-1"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <button
                        onClick={() => setYearly(false)}
                        className="px-4 py-1.5 text-sm rounded-lg font-medium transition-all"
                        style={!yearly ? { background: 'linear-gradient(135deg,#7c3aed,#3b82f6)', color: '#fff' } : { color: '#94a3b8' }}>
                        Monthly
                      </button>
                      <button
                        onClick={() => setYearly(true)}
                        className="flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-lg font-medium transition-all"
                        style={yearly ? { background: 'linear-gradient(135deg,#7c3aed,#3b82f6)', color: '#fff' } : { color: '#94a3b8' }}>
                        Yearly
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${yearly ? 'bg-white/20 text-white' : 'bg-green-500/20 text-green-400'}`}>
                          2 months free
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <Link href="/pricing" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Continue browsing plans
              </Link>
            </div>

            {/* ── Order summary ── */}
            <div className="rounded-2xl p-5 sm:p-6 lg:sticky lg:top-6" style={cardStyle}>
              <h3 className="font-semibold text-white mb-4">Order Summary</h3>

              <div className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between text-slate-400">
                  <span>{plan!.name} ({plan!.oneTime ? 'one-time' : billable ? 'yearly' : 'monthly'})</span>
                  <span className="text-slate-300">{inr(amount)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500 text-xs">
                  <span>Taxes</span>
                  <span>Inclusive of applicable taxes</span>
                </div>
              </div>

              <div className="border-t border-white/[0.06] my-4" />

              <div className="flex items-center justify-between mb-5">
                <span className="font-semibold text-white">Total</span>
                <div className="text-right">
                  <span className="text-2xl font-extrabold gradient-text">{inr(amount)}</span>
                  <div className="text-[11px] text-slate-500">{periodLabel}</div>
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-400 mb-3">{error}</p>
              )}

              <button
                onClick={handlePay}
                disabled={paying}
                className="w-full py-3.5 rounded-xl font-bold text-white text-base transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#3b82f6)', minHeight: '52px' }}>
                {paying ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Opening secure checkout…
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Proceed to Pay {inr(amount)}
                  </>
                )}
              </button>

              {/* Trust badges */}
              <div className="mt-4 space-y-2">
                {[
                  { icon: Shield, text: 'Secure payment by PayU' },
                  { icon: Zap, text: 'Instant access after payment' },
                  { icon: Lock, text: 'PCI-DSS · 256-bit SSL encryption' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2 text-xs text-slate-500">
                    <Icon className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    {text}
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-slate-600 mt-4 leading-relaxed">
                By proceeding you agree to our{' '}
                <Link href="/terms" className="text-slate-400 hover:text-slate-200 underline">Terms</Link> and{' '}
                <Link href="/refund" className="text-slate-400 hover:text-slate-200 underline">Refund Policy</Link>.
              </p>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
