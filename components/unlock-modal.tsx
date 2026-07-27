'use client';

import { useState } from 'react';
import { X, Check, Loader2, TrendingUp } from 'lucide-react';
import { PRICING, WRITER_PRICE_INR, LAUNCH_PRICE_ENDS, startCheckout, type PaidPlan } from '@/lib/checkout';

const PACKS = [
  {
    id: 'starter' as const,
    label: 'Just this one',
    downloads: PRICING.starter.downloads,
    price: PRICING.starter.price,
    mrp: PRICING.starter.mrp,
    best: false,
  },
  {
    id: 'pack3' as const,
    label: '3 downloads',
    downloads: PRICING.pack3.downloads,
    price: PRICING.pack3.price,
    mrp: PRICING.pack3.mrp,
    best: true,
  },
];

const endsOn = LAUNCH_PRICE_ENDS.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

type Props = {
  onClose: () => void;
  onPaid?: () => void;
  beforeScore?: number;
  afterScore?: number;
};

export default function UnlockModal({ onClose, beforeScore, afterScore }: Props) {
  // The 3-pack is pre-selected: it is the choice that makes the unit economics work,
  // and next to ₹19-for-1 it reads as the obvious value.
  const [selected, setSelected] = useState<'starter' | 'pack3'>('pack3');
  const [paying, setPaying] = useState<string | null>(null);
  const [error, setError] = useState('');

  const pack = PACKS.find((p) => p.id === selected)!;
  const showScores = beforeScore !== undefined && afterScore !== undefined;

  async function pay(plan: PaidPlan) {
    setPaying(plan);
    setError('');
    const err = await startCheckout(plan);
    if (err) { setError(err); setPaying(null); }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(4,8,18,0.88)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full sm:max-w-[420px] rounded-t-3xl sm:rounded-2xl overflow-hidden animate-slide-up-sm"
        style={{ background: '#0d1425', border: '1px solid rgba(124,58,237,0.3)' }}
      >
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-extrabold text-white">Your resume is ready</h2>
              <p className="text-xs text-slate-500 mt-0.5">Download it as PDF + DOCX.</p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-7 h-7 -mr-1 rounded-full flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* The thing they already own — this is what they're paying not to lose. */}
          {showScores && (
            <div
              className="flex items-center gap-3 rounded-xl px-4 py-3 mb-4"
              style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}
            >
              <TrendingUp className="w-4 h-4 text-green-400 shrink-0" />
              <div className="flex items-baseline gap-2">
                <span className="text-sm text-slate-500 line-through tabular-nums">{beforeScore}</span>
                <span className="text-slate-600 text-xs">→</span>
                <span className="text-2xl font-extrabold text-green-400 tabular-nums">{afterScore}</span>
                <span className="text-[11px] text-slate-500">ATS score</span>
              </div>
            </div>
          )}

          {/* Goal gradient — they're one step from done. */}
          <div className="flex items-center gap-2 mb-5 text-[11px]">
            <span className="text-green-400">Analysed ✓</span>
            <span className="flex-1 h-px" style={{ background: 'rgba(34,197,94,0.3)' }} />
            <span className="text-green-400">Rewritten ✓</span>
            <span className="flex-1 h-px" style={{ background: 'rgba(124,58,237,0.4)' }} />
            <span className="font-semibold text-purple-300">Download</span>
          </div>

          {/* Pack choice */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {PACKS.map((p) => {
              const isOn = selected === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelected(p.id)}
                  className="relative rounded-xl p-3 text-left transition-all"
                  style={isOn
                    ? { background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.6)' }
                    : { background: '#0a1020', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {p.best && (
                    <span
                      className="absolute -top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: 'linear-gradient(135deg,#7c3aed,#3b82f6)', color: '#fff' }}
                    >
                      BEST VALUE
                    </span>
                  )}
                  <div className="text-[11px] text-slate-400 mb-1">{p.label}</div>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-xl font-extrabold ${isOn ? 'text-white' : 'text-slate-300'}`}>₹{p.price}</span>
                    <span className="text-xs text-slate-600 line-through">₹{p.mrp}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {p.downloads > 1 ? `₹${Math.round(p.price / p.downloads)} each` : 'one download'}
                  </div>
                </button>
              );
            })}
          </div>

          <ul className="space-y-2 mb-5">
            {[
              `${pack.downloads > 1 ? `${pack.downloads} resumes` : '1 resume'}, PDF + DOCX`,
              'No watermark, no subscription',
              'Downloads the moment payment clears',
            ].map((t) => (
              <li key={t} className="flex items-start gap-2 text-xs text-slate-400">
                <Check className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                {t}
              </li>
            ))}
          </ul>

          {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

          <button
            onClick={() => pay(pack.id)}
            disabled={paying !== null}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-white text-base transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#3b82f6)' }}
          >
            {paying !== null && <Loader2 className="w-4 h-4 animate-spin" />}
            {paying !== null ? 'Opening UPI…' : `Pay ₹${pack.price} & Download`}
          </button>

          {/* The honest anchor: not ₹45, but what the alternative actually costs. */}
          <p className="text-[11px] text-slate-500 text-center mt-3 leading-relaxed">
            A resume writer charges ₹{WRITER_PRICE_INR.toLocaleString('en-IN')}+ for this.
            <br />
            <span className="text-slate-600">
              UPI · Card · Netbanking — secured by Cashfree. Launch price until {endsOn}.
            </span>
          </p>

          <button
            onClick={() => pay('pro')}
            disabled={paying !== null}
            className="w-full mt-4 pt-4 text-xs text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-60"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            {paying === 'pro'
              ? 'Opening…'
              : <>Applying every week? <span className="text-purple-400 font-semibold">Pro — ₹{PRICING.pro.price}/mo, unlimited →</span></>}
          </button>
        </div>
      </div>
    </div>
  );
}
