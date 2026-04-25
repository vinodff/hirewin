'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CreditCard, Zap, ChevronLeft } from 'lucide-react';
import AppNav from '@/components/app-nav';
import type { Plan, PlanLimits } from '@/types';

const cardStyle = { background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' };

const PLAN_LABELS: Record<Plan, string> = {
  free: 'Free Plan',
  starter: 'Starter Plan',
  pro: 'Pro Plan',
  power: 'Power Plan',
  team: 'Team Plan',
};

type UsageData = {
  improvements_used: number;
  downloads_used: number;
  roadmaps_used: number;
  deep_evals_used: number;
};

type BillingData = {
  plan: Plan;
  limits: PlanLimits;
  usage: UsageData;
  orders: Array<{
    id: string;
    plan: Plan;
    amount_paise?: number;
    amount?: number;
    currency: string;
    created_at: string;
    status: string;
  }>;
};

function UsageBar({ used, limit, label }: { used: number; limit: number | typeof Infinity; label: string }) {
  const isLifetime = limit === 0;
  const isUnlimited = limit === Infinity || limit === null;
  const pct = isUnlimited || isLifetime ? 0 : Math.min((used / limit) * 100, 100);

  const barColor =
    pct > 80 ? '#f97316' : pct > 50 ? '#eab308' : '#6366f1';

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-slate-300">{label}</span>
        <span className="text-xs text-slate-500">
          {isLifetime
            ? `${used} / 0 lifetime`
            : isUnlimited
            ? `${used} / unlimited`
            : `${used} / ${limit} this month`}
        </span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: isUnlimited ? '0%' : `${pct}%`,
            background: isUnlimited ? 'transparent' : barColor,
          }}
        />
      </div>
    </div>
  );
}

export default function BillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/billing')
      .then((r) => {
        if (r.status === 401) { window.location.href = '/auth/login?next=/billing'; return null; }
        return r.json();
      })
      .then((d) => { if (d && !d.error) setData(d); })
      .catch(() => setError('Failed to load billing info'))
      .finally(() => setLoading(false));
  }, []);

  const planLabel = data ? PLAN_LABELS[data.plan] : '';
  const isFree = data?.plan === 'free';

  return (
    <div className="min-h-screen" style={{ background: '#080d1a' }}>
      <AppNav />

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Back */}
        <Link
          href="/analyze"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to app
        </Link>

        <div className="flex items-center gap-3 mb-1">
          <CreditCard className="w-5 h-5 text-slate-400" />
          <h1 className="text-xl font-bold text-white">Billing &amp; Subscription</h1>
        </div>
        <p className="text-sm text-slate-500 mb-8">Manage your plan, renewals, and payment history.</p>

        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl h-24 animate-pulse" style={{ background: '#0f1629' }} />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-xl p-4 text-sm text-red-400"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.15)' }}>
            {error}
          </div>
        )}

        {data && (
          <div className="space-y-5">
            {/* Current plan */}
            <div className="rounded-2xl p-6" style={cardStyle}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-white text-lg">{planLabel}</h2>
                  <span
                    className="inline-block mt-1 text-xs font-semibold px-2.5 py-0.5 rounded-full"
                    style={{
                      background: 'rgba(74,222,128,0.12)',
                      color: '#4ade80',
                      border: '1px solid rgba(74,222,128,0.2)',
                    }}
                  >
                    Active
                  </span>
                </div>
                <Link
                  href="/pricing"
                  className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl text-white transition-all hover:opacity-90 shrink-0"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Upgrade your plan
                </Link>
              </div>
            </div>

            {/* Usage this month */}
            <div className="rounded-2xl p-6" style={cardStyle}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold text-white">Usage This Month</h2>
                <span
                  className="text-xs font-bold px-2.5 py-0.5 rounded-full text-slate-400"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {data.plan.toUpperCase()}
                </span>
              </div>

              <div className="space-y-4">
                <UsageBar
                  label="Resumes"
                  used={data.usage.improvements_used}
                  limit={data.limits.improvements}
                />
                <UsageBar
                  label="Downloads"
                  used={data.usage.downloads_used}
                  limit={data.limits.downloads}
                />
                <UsageBar
                  label="History Retention"
                  used={0}
                  limit={Infinity}
                />
              </div>

              <p className="text-xs text-slate-600 mt-4">
                Resets on the 1st of next month
                {data.limits.downloads === 0 && ' · Downloads require a paid plan'}
              </p>
            </div>

            {/* Payment history */}
            <div className="rounded-2xl p-6" style={cardStyle}>
              <h2 className="font-semibold text-white mb-4">Payment History</h2>

              {data.orders.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-slate-500 mb-4">
                    No payments yet. Upgrade to unlock more features.
                  </p>
                  {isFree && (
                    <Link
                      href="/pricing"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl text-white transition-all hover:opacity-90"
                      style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
                    >
                      View Plans
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {data.orders.map((order) => {
                    const amount = order.amount_paise
                      ? (order.amount_paise / 100).toFixed(0)
                      : order.amount ?? '—';
                    const dateStr = new Date(order.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    });
                    return (
                      <div
                        key={order.id}
                        className="flex items-center justify-between py-3 border-b border-white/[0.05] last:border-0"
                      >
                        <div>
                          <div className="text-sm font-medium text-white capitalize">
                            {PLAN_LABELS[order.plan as Plan] ?? order.plan}
                          </div>
                          <div className="text-xs text-slate-500">{dateStr}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold gradient-text">
                            {order.currency === 'INR' ? '₹' : '$'}{amount}
                          </span>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full capitalize"
                            style={
                              order.status === 'paid'
                                ? { background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }
                                : { background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }
                            }
                          >
                            {order.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-slate-600 pb-4">
              Powered by Razorpay · Secure payments · Cancel anytime
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
