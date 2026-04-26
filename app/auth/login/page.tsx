'use client';

import { createClient } from '@/lib/supabase/client';
import { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  async function handleGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#080d1a' }}>
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(ellipse, rgba(124,58,237,0.6) 0%, transparent 70%)' }} />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="font-bold text-2xl text-white tracking-tight">
            Hire<span className="gradient-text">Win</span>
          </Link>
          <p className="text-slate-500 mt-2 text-sm">Sign in to save your history</p>
        </div>

        <div className="rounded-2xl p-6"
          style={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.08)' }}>
          {sent ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)' }}>
                <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="font-semibold text-white mb-2">Check your email</h2>
              <p className="text-sm text-slate-500">We sent a magic link to {email}</p>
            </div>
          ) : (
            <>
              <button
                onClick={handleGoogle}
                className="w-full flex items-center justify-center gap-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white transition-all mb-4"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full" style={{ height: '1px', background: 'rgba(255,255,255,0.07)' }} />
                </div>
                <div className="relative flex justify-center text-xs text-slate-600">
                  <span className="px-2" style={{ background: '#0f1629' }}>or</span>
                </div>
              </div>

              <form onSubmit={handleMagicLink} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder-slate-600"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
                {error && <p className="text-xs text-red-400">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
                >
                  {loading ? 'Sending…' : 'Send magic link'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          <Link href="/analyze" className="hover:text-slate-400 transition-colors">
            Continue without account →
          </Link>
        </p>
      </div>
    </div>
  );
}
