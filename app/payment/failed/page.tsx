'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';

const CHARGED_REASONS = ['Order not found', 'Invalid signature'];

function FailedContent() {
  const params = useSearchParams();
  const reason = params.get('reason') ?? '';
  const wasCharged = CHARGED_REASONS.some(r => reason.toLowerCase().includes(r.toLowerCase()));

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: '#080d1a' }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-8 text-center"
        style={{
          background: 'rgba(15,22,41,0.9)',
          border: '1px solid rgba(239,68,68,0.2)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
        }}
      >
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(239,68,68,0.1)' }} />
          <div className="absolute inset-2 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.15)' }}>
            <XCircle className="w-10 h-10 text-red-400" />
          </div>
        </div>

        <div className="text-2xl font-extrabold text-white mb-2">Payment Failed</div>
        {wasCharged ? (
          <p className="text-slate-400 text-sm mb-8">
            Your payment may have gone through but we couldn&apos;t confirm it. Please contact support with your payment ID and we&apos;ll upgrade your plan manually.
          </p>
        ) : (
          <p className="text-slate-400 text-sm mb-8">
            Your payment could not be processed. No amount has been charged. Please try again or contact support.
          </p>
        )}

        <div className="space-y-3">
          <Link
            href="/pricing"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Link>
          <Link
            href="/analyze"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-medium text-slate-400 transition-all hover:text-white active:scale-[0.98]"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to app
          </Link>
        </div>

        <p className="text-xs text-slate-600 mt-6">
          Need help?{' '}
          <a href="mailto:support@hirewin.live" className="text-purple-400 hover:text-purple-300 underline transition-colors">
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}

export default function PaymentFailedPage() {
  return (
    <Suspense>
      <FailedContent />
    </Suspense>
  );
}
