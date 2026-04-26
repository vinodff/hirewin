'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, ArrowRight, Zap, Download, FileText } from 'lucide-react';
import { Suspense } from 'react';

function SuccessContent() {
  const params   = useSearchParams();
  const plan     = params.get('plan') ?? 'Pro';
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 100);
    return () => clearTimeout(t);
  }, []);

  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: '#080d1a' }}
    >
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-20 animate-float"
          style={{ background: 'radial-gradient(ellipse, rgba(34,197,94,0.6) 0%, transparent 70%)', animationDuration: '8s' }} />
        <div className="absolute bottom-1/3 right-1/4 w-[300px] h-[300px] rounded-full opacity-10 animate-float"
          style={{ background: 'radial-gradient(ellipse, rgba(124,58,237,0.8) 0%, transparent 70%)', animationDelay: '-3s', animationDuration: '10s' }} />
      </div>

      <div
        className="relative w-full max-w-md rounded-2xl p-8 text-center transition-all duration-700"
        style={{
          background: 'rgba(15,22,41,0.9)',
          border: '1px solid rgba(34,197,94,0.25)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 60px rgba(34,197,94,0.1)',
          opacity: show ? 1 : 0,
          transform: show ? 'translateY(0)' : 'translateY(20px)',
        }}
      >
        {/* Animated check */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div
            className="absolute inset-0 rounded-full animate-pulse"
            style={{ background: 'rgba(34,197,94,0.15)' }}
          />
          <div
            className="absolute inset-2 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(34,197,94,0.2)' }}
          >
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
        </div>

        <div className="text-3xl font-extrabold text-white mb-2">Payment Successful!</div>
        <p className="text-slate-400 mb-2">
          Welcome to <span className="text-white font-semibold">HireWin {planLabel}</span>
        </p>
        <p className="text-sm text-slate-500 mb-8">
          Your account has been upgraded instantly. Start optimizing right now.
        </p>

        {/* What you unlocked */}
        <div
          className="rounded-xl p-4 mb-6 text-left space-y-2"
          style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}
        >
          <div className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-3">What you unlocked</div>
          {[
            { icon: Download,  text: 'PDF & DOCX resume downloads' },
            { icon: Zap,       text: 'More resume optimizations per month' },
            { icon: FileText,  text: 'Cover letter generation & download' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2.5 text-sm text-slate-300">
              <Icon className="w-4 h-4 text-green-400 shrink-0" />
              {text}
            </div>
          ))}
        </div>

        <Link
          href="/analyze"
          className="flex items-center justify-center gap-2 w-full py-4 rounded-xl font-bold text-white text-base transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
        >
          Start Optimizing Now
          <ArrowRight className="w-5 h-5" />
        </Link>

        <Link href="/billing" className="block mt-4 text-sm text-slate-600 hover:text-slate-400 transition-colors">
          View billing details →
        </Link>
      </div>

      <p className="text-xs text-slate-700 mt-6">
        A confirmation has been sent to your email · Powered by Razorpay
      </p>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
