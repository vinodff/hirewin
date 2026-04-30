'use client';

import { useState } from 'react';
import { X, Check, Lock, Shield, Zap } from 'lucide-react';

/* ── Pricing ── */
type Plan = {
  id: string;
  name: string;
  price: { monthly: string; yearly: string };
  period: string | { monthly: string; yearly: string };
  badge: string | null;
  features: string[];
  cta: string;
  highlight: boolean;
};

const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'STARTER',
    price: { monthly: '₹99', yearly: '₹99' },
    period: 'one-time',
    badge: null,
    features: [
      '1 resume download (PDF + DOCX)',
      '1 cover letter download (PDF + DOCX)',
      'No subscription needed',
      'No watermark',
    ],
    cta: 'Buy ₹99',
    highlight: false,
  },
  {
    id: 'pro',
    name: 'PRO',
    price: { monthly: '₹199', yearly: '₹1,990' },
    period: { monthly: '/month', yearly: '/year' },
    badge: 'POPULAR',
    features: [
      '20 resume improvements/month',
      'Unlimited PDF + DOCX downloads',
      '5 cover letters/month',
      'Skills learning roadmap (15/month)',
      'Build up to 20 resumes from scratch',
      'AI resume builder',
      'Import resume via AI',
      'Optimization history',
      'Priority support',
    ],
    cta: 'Subscribe',
    highlight: true,
  },
  {
    id: 'power',
    name: 'POWER',
    price: { monthly: '₹399', yearly: '₹3,990' },
    period: { monthly: '/month', yearly: '/year' },
    badge: null,
    features: [
      '80 resume improvements/month',
      'Unlimited downloads',
      '15 cover letters/month',
      '60 skill roadmaps/month',
      'Build unlimited resumes from scratch',
      'AI resume builder',
      'Import resume via AI',
      'Edit resume & cover letter before download',
      'Optimization history (6-month retention)',
      'Priority support',
    ],
    cta: 'Subscribe',
    highlight: false,
  },
];

const FEATURE_TABLE = [
  { label: 'Improvements / month',       free: '2',             pro: '20 / 80' },
  { label: 'ATS score & analysis',       free: true,            pro: true },
  { label: 'Live preview',               free: true,            pro: true },
  { label: 'PDF & DOCX download',        free: false,           pro: true },
  { label: 'Cover letters / month',      free: '1 (lifetime)',  pro: '5 / 15' },
  { label: 'Skill roadmaps / month',     free: '1',             pro: '15 / 60' },
  { label: 'Build resumes from scratch', free: '3',             pro: '20 / unlimited' },
  { label: 'AI resume builder',          free: false,           pro: true },
  { label: 'Import resume via AI',       free: false,           pro: true },
  { label: 'History retention',          free: '1 month',       pro: '3 / 6 mo' },
  { label: 'Edit before download',       free: false,           pro: 'Power / Team' },
  { label: 'Job application tracker',    free: true,            pro: true },
  { label: 'Referral bonus',             free: '+1 per friend', pro: '+1 per friend' },
];

function Cell({ val }: { val: boolean | string }) {
  if (val === true)  return <span className="text-green-400 font-bold text-base">✓</span>;
  if (val === false) return <span className="text-slate-600 font-bold text-sm">—</span>;
  return <span className="text-slate-300 text-xs font-medium">{val}</span>;
}

type Props = {
  onClose: () => void;
  onPaid?: () => void;
};

export default function UnlockModal({ onClose, onPaid }: Props) {
  const [yearly, setYearly] = useState(false);
  const [paying, setPaying] = useState<string | null>(null);

  async function handlePay(planId: string) {
    setPaying(planId);
    try {
      const res = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, isYearly: yearly }),
      });

      if (res.status === 401) {
        window.location.href = '/auth/login';
        return;
      }
      if (res.status === 503) {
        alert('Payments coming soon! Check back shortly.');
        setPaying(null);
        return;
      }

      const { orderId, amount, currency, keyId, userName, userEmail, error: err } = await res.json();
      if (err) { alert(err); setPaying(null); return; }

      const plan = PLANS.find(p => p.id === planId)!;

      const openRzp = () => {
        // @ts-expect-error Razorpay global
        const rzp = new window.Razorpay({
          key: keyId,
          amount,
          currency,
          name: 'HireWin',
          description: `${plan.name} Plan — Resume Download`,
          image: '/logo.png',
          order_id: orderId,
          prefill: { name: userName || '', email: userEmail || '', contact: '' },
          theme: { color: '#7c3aed' },
          modal: { ondismiss: () => setPaying(null) },
          handler: async (response: Record<string, string>) => {
            try {
              const verifyRes = await fetch('/api/payment/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(response),
              });
              const data = await verifyRes.json();
              if (data.ok) {
                onPaid?.();
                window.location.href = `/payment/success?plan=${planId}`;
              } else {
                window.location.href = `/payment/failed?reason=${encodeURIComponent(data.error ?? 'unknown')}`;
              }
            } catch {
              window.location.href = '/payment/failed?reason=network';
            }
          },
        });
        rzp.open();
      };

      // @ts-expect-error Razorpay global
      if (typeof window.Razorpay !== 'undefined') {
        openRzp();
      } else {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = openRzp;
        document.head.appendChild(script);
      }
    } catch {
      alert('Something went wrong. Please try again.');
      setPaying(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full sm:max-w-[480px] max-h-[92vh] sm:max-h-[88vh] flex flex-col rounded-t-3xl sm:rounded-2xl overflow-hidden animate-slide-up-sm"
        style={{
          background: '#0d1425',
          border: '1px solid rgba(124,58,237,0.25)',
          boxShadow: '0 40px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(124,58,237,0.08)',
        }}
      >
        {/* ── Fixed header ── */}
        <div className="shrink-0 px-5 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Close button */}
          <div className="flex justify-end mb-3">
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Icon + title */}
          <div className="flex flex-col items-center text-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', boxShadow: '0 0 24px rgba(124,58,237,0.4)' }}
            >
              <Lock className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-extrabold text-white mb-1">Unlock Your Resume Download</h2>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              Free plan includes 2 improvements/month with live preview. Download requires a paid plan.
            </p>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6">

          {/* Feature comparison table */}
          <div className="rounded-xl overflow-hidden mb-5" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: '#0a1020' }}>
                  <th className="text-left px-3 py-2.5 text-slate-500 font-semibold uppercase tracking-wide text-[10px]">FEATURE</th>
                  <th className="px-2 py-2.5 text-slate-500 font-semibold uppercase tracking-wide text-[10px] text-center">FREE</th>
                  <th className="px-2 py-2.5 font-semibold uppercase tracking-wide text-[10px] text-center"
                    style={{ color: '#a78bfa' }}>PRO / POWER</th>
                </tr>
              </thead>
              <tbody>
                {FEATURE_TABLE.map((row, i) => (
                  <tr
                    key={row.label}
                    style={{
                      background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
                      borderTop: '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    <td className="px-3 py-2 text-slate-400">{row.label}</td>
                    <td className="px-2 py-2 text-center"><Cell val={row.free} /></td>
                    <td className="px-2 py-2 text-center"><Cell val={row.pro} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Monthly / Yearly toggle */}
          <div className="flex items-center justify-center gap-1 mb-5">
            <div
              className="inline-flex items-center gap-1 rounded-xl p-1"
              style={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' }}
            >
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
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${yearly ? 'bg-white/20 text-white' : 'bg-green-500/20 text-green-400'}`}
                >
                  2 months free
                </span>
              </button>
            </div>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-3 gap-2">
            {PLANS.map((plan) => {
              const price = yearly && plan.id !== 'starter' ? plan.price.yearly : plan.price.monthly;
              const period = plan.id === 'starter' ? 'one-time' : yearly ? '/year' : '/month';

              return (
                <div
                  key={plan.id}
                  className="relative rounded-xl flex flex-col overflow-hidden"
                  style={plan.highlight
                    ? { background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.45)', boxShadow: '0 0 20px rgba(124,58,237,0.15)' }
                    : { background: '#0a1020', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  {plan.badge && (
                    <div
                      className="text-center py-1 text-[10px] font-bold tracking-wide"
                      style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', color: '#fff' }}
                    >
                      {plan.badge}
                    </div>
                  )}
                  <div className="p-3 flex flex-col flex-1">
                    <div
                      className="text-[10px] font-bold uppercase tracking-wider mb-1.5"
                      style={{ color: plan.highlight ? '#a78bfa' : '#64748b' }}
                    >
                      {plan.name}
                    </div>
                    <div className="mb-3">
                      <span
                        className="text-lg font-extrabold"
                        style={{ color: plan.highlight ? '#a78bfa' : '#fff' }}
                      >
                        {price}
                      </span>
                      <span className="text-slate-500 text-[10px] ml-0.5">{period}</span>
                    </div>
                    <ul className="space-y-1.5 flex-1 mb-3">
                      {plan.features.slice(0, 5).map((f) => (
                        <li key={f} className="flex items-start gap-1.5">
                          <Check className="w-3 h-3 text-green-400 shrink-0 mt-0.5" />
                          <span className="text-[10px] text-slate-400 leading-relaxed">{f}</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => handlePay(plan.id)}
                      disabled={paying !== null}
                      className="w-full py-2 rounded-lg text-xs font-bold transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-1"
                      style={plan.highlight
                        ? { background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', color: '#fff' }
                        : { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1' }}
                    >
                      {paying === plan.id ? (
                        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                      ) : null}
                      {paying === plan.id ? 'Opening…' : plan.cta}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Trust row */}
          <div className="flex items-center justify-center gap-4 mt-4 text-[10px] text-slate-600">
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-purple-500 shrink-0" />
              Razorpay secured
            </div>
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-purple-500 shrink-0" />
              Instant access
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
